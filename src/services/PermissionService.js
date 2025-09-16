/**
 * PermissionService - Dynamic permission management system
 * Handles permission resolution, inheritance, and validation.
 *
 * Features:
 * - Multi-level permission inheritance (User → Department → Role → System)
 * - Context-aware permission checking
 * - Temporary permissions with expiration
 * - Permission dependency resolution
 * - Audit logging for all permission changes.
 * @author Claude Code + Technical Team
 * @version 2.0
 * @since 2025-09-11
 */

const logger = require('../infrastructure/logger');

class PermissionService {
  constructor() {
    this.db = null; // MongoDB connection will be injected
    this.permissionCache = new Map(); // In-memory cache for permission lookups
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
  }

  /**
   * Initialize the service with database connection.
   * @param {object} database - MongoDB database connection.
   * @example
   */
  initialize(database) {
    this.db = database;
    logger.info('PermissionService initialized');
  }

  // ============================================
  // PERMISSION RESOLUTION
  // ============================================

  /**
   * Get user's effective permissions from all sources
   * Resolves permissions with inheritance hierarchy:
   * 1. UserPermission (highest priority)
   * 2. DepartmentPermission (if user in department)
   * 3. Role permissions (user's assigned role)
   * 4. System defaults (base permissions).
   * @param {string} userId - User ID.
   * @param {object} context - Optional context (departmentId, clientId, etc.).
   * @returns {Array} Array of effective permission codes.
   * @example
   */
  async getUserEffectivePermissions(userId, context = {}) {
    try {
      // Check cache first
      const cacheKey = `user_permissions:${userId}:${JSON.stringify(context)}`;
      const cached = this.permissionCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.permissions;
      }

      // Get user details
      const user = await this.db.collection('AmexingUser').findOne({
        id: userId,
        active: true,
        deleted: false,
      });

      if (!user) {
        throw new Error('User not found');
      }

      const effectivePermissions = new Set();

      // 1. Start with system default permissions for role
      const rolePermissions = await this.getRolePermissions(user.role);
      rolePermissions.forEach((permission) => effectivePermissions.add(permission));

      // 2. Add department permissions if user belongs to department
      if (user.departmentId || context.departmentId) {
        const departmentId = context.departmentId || user.departmentId;
        const departmentPermissions = await this.getDepartmentPermissions(departmentId, userId);
        departmentPermissions.forEach((permission) => effectivePermissions.add(permission));
      }

      // 3. Add explicit user permissions (highest priority)
      const userPermissions = await this.getUserSpecificPermissions(userId, context);

      // Apply user permissions (can grant or revoke)
      userPermissions.forEach((userPerm) => {
        if (userPerm.granted) {
          effectivePermissions.add(userPerm.permissionCode);
        } else {
          effectivePermissions.delete(userPerm.permissionCode); // Explicit denial
        }
      });

      // 4. Resolve permission dependencies
      const resolvedPermissions = await this.resolvePermissionDependencies(
        Array.from(effectivePermissions)
      );

      // Cache result
      this.permissionCache.set(cacheKey, {
        permissions: resolvedPermissions,
        timestamp: Date.now(),
      });

      logger.debug(`Resolved ${resolvedPermissions.length} permissions for user ${userId}`);
      return resolvedPermissions;
    } catch (error) {
      logger.error('Permission resolution failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific permission.
   * @param {string} userId - User ID.
   * @param {string} permissionCode - Permission code to check.
   * @param {object} context - Optional context for permission checking.
   * @returns {boolean} Has permission.
   * @example
   */
  async hasPermission(userId, permissionCode, context = {}) {
    try {
      // Special case: superadmin has all permissions
      const user = await this.db.collection('AmexingUser').findOne({ id: userId });
      if (user && user.role === 'superadmin') {
        return true;
      }

      // Get effective permissions
      const effectivePermissions = await this.getUserEffectivePermissions(userId, context);

      // Check for exact match
      if (effectivePermissions.includes(permissionCode)) {
        return true;
      }

      // Check for wildcard permissions
      const wildcardPermissions = effectivePermissions.filter((p) => p.endsWith('*'));
      for (const wildcardPerm of wildcardPermissions) {
        const prefix = wildcardPerm.slice(0, -1); // Remove '*'
        if (permissionCode.startsWith(prefix)) {
          return true;
        }
      }

      // Check contextual permissions
      const hasContextualPermission = await this.checkContextualPermission(
        userId,
        permissionCode,
        context
      );

      return hasContextualPermission;
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false; // Fail secure - deny permission on error
    }
  }

  /**
   * Get role permissions.
   * @param {string} roleCode - Role code.
   * @returns {Array} Permission codes.
   * @example
   */
  async getRolePermissions(roleCode) {
    const role = await this.db.collection('Role').findOne({
      code: roleCode,
      isActive: true,
    });

    if (!role) {
      logger.warn(`Role not found: ${roleCode}`);
      return [];
    }

    let permissions = [...role.permissions];

    // Include inherited role permissions
    if (role.inheritedRoles && role.inheritedRoles.length > 0) {
      for (const inheritedRoleId of role.inheritedRoles) {
        const inheritedRole = await this.db.collection('Role').findOne({
          id: inheritedRoleId,
          isActive: true,
        });
        if (inheritedRole) {
          permissions = permissions.concat(inheritedRole.permissions);
        }
      }
    }

    // Remove duplicates
    return [...new Set(permissions)];
  }

  /**
   * Get department permissions for user.
   * @param {string} departmentId - Department ID.
   * @param {string} userId - User ID.
   * @returns {Array} Permission codes.
   * @example
   */
  async getDepartmentPermissions(departmentId, userId) {
    const departmentPermissions = await this.db.collection('DepartmentPermission').find({
      departmentId,
      granted: true,
    }).toArray();

    // Get user's role in department context
    const employee = await this.db.collection('ClientEmployee').findOne({
      userId,
      departmentId,
    });

    const permissions = [];

    for (const deptPerm of departmentPermissions) {
      // Check if permission applies to this user based on their role
      if (this.doesDepartmentPermissionApply(deptPerm, employee)) {
        const permission = await this.db.collection('Permission').findOne({
          id: deptPerm.permissionId,
        });
        if (permission && permission.isActive) {
          permissions.push(permission.code);
        }
      }
    }

    return permissions;
  }

  /**
   * Get user-specific permissions.
   * @param {string} userId - User ID.
   * @param {object} context - Context for permission lookup.
   * @returns {Array} User permission objects.
   * @example
   */
  async getUserSpecificPermissions(userId, context) {
    const query = {
      userId,
      status: 'active',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    // Add context filtering if provided
    if (context.departmentId) {
      query.$or = [
        { context: null },
        { context: `department:${context.departmentId}` },
        { context: { $regex: `department:${context.departmentId}` } },
      ];
    }

    const userPermissions = await this.db.collection('UserPermission').find(query).toArray();

    // Resolve permission codes
    const permissions = [];
    for (const userPerm of userPermissions) {
      const permission = await this.db.collection('Permission').findOne({
        id: userPerm.permissionId,
      });
      if (permission) {
        permissions.push({
          permissionCode: permission.code,
          granted: userPerm.granted,
          source: userPerm.source,
          context: userPerm.context,
          expiresAt: userPerm.expiresAt,
        });
      }
    }

    return permissions;
  }

  /**
   * Resolve permission dependencies and implications.
   * @param {Array} permissionCodes - Base permission codes.
   * @returns {Array} Resolved permission codes including dependencies.
   * @example
   */
  async resolvePermissionDependencies(permissionCodes) {
    const resolvedPermissions = new Set(permissionCodes);

    // Get all permissions with their dependencies
    const permissions = await this.db.collection('Permission').find({
      code: { $in: permissionCodes },
      isActive: true,
    }).toArray();

    for (const permission of permissions) {
      // Add implied permissions
      if (permission.impliesPermissions && permission.impliesPermissions.length > 0) {
        const impliedPermissions = await this.db.collection('Permission').find({
          id: { $in: permission.impliesPermissions },
          isActive: true,
        }).toArray();

        impliedPermissions.forEach((impliedPerm) => {
          resolvedPermissions.add(impliedPerm.code);
        });
      }
    }

    return Array.from(resolvedPermissions);
  }

  /**
   * Check contextual permissions (time, location, amount-based, etc.).
   * @param {string} userId - User ID.
   * @param {string} permissionCode - Permission code.
   * @param {object} context - Context for evaluation.
   * @returns {boolean} Has contextual permission.
   * @example
   */
  async checkContextualPermission(userId, permissionCode, context) {
    // Get user permissions with conditions
    const conditionalPermissions = await this.db.collection('UserPermission').find({
      userId,
      status: 'active',
      conditions: { $exists: true, $ne: {} },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    }).toArray();

    for (const userPerm of conditionalPermissions) {
      const permission = await this.db.collection('Permission').findOne({
        id: userPerm.permissionId,
        code: permissionCode,
      });

      if (permission && this.evaluatePermissionConditions(userPerm.conditions, context)) {
        return userPerm.granted;
      }
    }

    return false;
  }

  /**
   * Evaluate permission conditions against context.
   * @param {object} conditions - Permission conditions.
   * @param {object} context - Current context.
   * @returns {boolean} Conditions met.
   * @example
   */
  evaluatePermissionConditions(conditions, context) {
    try {
      // Time-based conditions
      if (conditions.timeRestrictions) {
        const now = new Date();
        const currentHour = now.getHours();

        if (conditions.timeRestrictions.startHour
            && conditions.timeRestrictions.endHour) {
          if (currentHour < conditions.timeRestrictions.startHour
              || currentHour > conditions.timeRestrictions.endHour) {
            return false;
          }
        }

        if (conditions.timeRestrictions.weekdays
            && !conditions.timeRestrictions.weekdays.includes(now.getDay())) {
          return false;
        }
      }

      // Amount-based conditions (for financial permissions)
      if (conditions.maxAmount && context.amount) {
        if (context.amount > conditions.maxAmount) {
          return false;
        }
      }

      // Location-based conditions
      if (conditions.allowedLocations && context.location) {
        if (!conditions.allowedLocations.includes(context.location)) {
          return false;
        }
      }

      // Department-specific conditions
      if (conditions.departmentId && context.departmentId) {
        if (conditions.departmentId !== context.departmentId) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Condition evaluation failed:', error);
      return false;
    }
  }

  // ============================================
  // PERMISSION MANAGEMENT
  // ============================================

  /**
   * Grant permission to user.
   * @param {string} userId - User ID.
   * @param {string} permissionCode - Permission code.
   * @param {object} options - Grant options.
   * @returns {object} Created user permission.
   * @example
   */
  async grantPermission(userId, permissionCode, options = {}) {
    try {
      const permission = await this.db.collection('Permission').findOne({
        code: permissionCode,
        isActive: true,
      });

      if (!permission) {
        throw new Error(`Permission not found: ${permissionCode}`);
      }

      // Check if permission already exists
      const existingPerm = await this.db.collection('UserPermission').findOne({
        userId,
        permissionId: permission.id,
        status: 'active',
      });

      if (existingPerm) {
        throw new Error('Permission already granted');
      }

      const userPermission = {
        id: require('uuid').v4(),
        userId,
        permissionId: permission.id,
        granted: true,
        source: options.source || 'manual',
        context: options.context || null,
        expiresAt: options.expiresAt || null,
        conditions: options.conditions || {},
        status: options.requiresApproval ? 'pending' : 'active',
        approvedBy: options.approvedBy || null,
        approvedAt: options.requiresApproval ? null : new Date(),
        reason: options.reason || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: options.createdBy,
      };

      await this.db.collection('UserPermission').insertOne(userPermission);

      // Clear cache for this user
      this.clearUserPermissionCache(userId);

      // Log permission grant
      await this.logPermissionChange({
        action: 'grant',
        userId,
        permissionCode,
        details: options,
        performedBy: options.createdBy,
      });

      logger.info(`Permission granted: ${permissionCode} to user ${userId}`);
      return userPermission;
    } catch (error) {
      logger.error('Permission grant failed:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from user.
   * @param {string} userId - User ID.
   * @param {string} permissionCode - Permission code.
   * @param {object} options - Revoke options.
   * @example
   */
  async revokePermission(userId, permissionCode, options = {}) {
    try {
      const permission = await this.db.collection('Permission').findOne({
        code: permissionCode,
        isActive: true,
      });

      if (!permission) {
        throw new Error(`Permission not found: ${permissionCode}`);
      }

      // Find and revoke user permission
      const result = await this.db.collection('UserPermission').updateMany(
        {
          userId,
          permissionId: permission.id,
          status: 'active',
        },
        {
          $set: {
            status: 'revoked',
            updatedAt: new Date(),
            revokedBy: options.revokedBy,
            revokedAt: new Date(),
            revokedReason: options.reason,
          },
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error('Permission not found or already revoked');
      }

      // Clear cache for this user
      this.clearUserPermissionCache(userId);

      // Log permission revocation
      await this.logPermissionChange({
        action: 'revoke',
        userId,
        permissionCode,
        details: options,
        performedBy: options.revokedBy,
      });

      logger.info(`Permission revoked: ${permissionCode} from user ${userId}`);
    } catch (error) {
      logger.error('Permission revoke failed:', error);
      throw error;
    }
  }

  /**
   * Bulk assign permissions to user based on template.
   * @param {string} userId - User ID.
   * @param {string} templateId - Permission template ID.
   * @param {object} options - Assignment options.
   * @example
   */
  async assignPermissionTemplate(userId, templateId, options = {}) {
    try {
      // Get template permissions (from Role or custom template)
      const template = await this.db.collection('Role').findOne({
        id: templateId,
        isActive: true,
      });

      if (!template) {
        throw new Error(`Permission template not found: ${templateId}`);
      }

      const permissions = await this.db.collection('Permission').find({
        id: { $in: template.permissions },
        isActive: true,
      }).toArray();

      // Grant each permission
      for (const permission of permissions) {
        try {
          await this.grantPermission(userId, permission.code, {
            ...options,
            source: 'template',
            reason: `Applied template: ${template.name}`,
          });
        } catch (error) {
          // Continue with other permissions if one fails
          logger.warn(`Failed to grant permission ${permission.code}: ${error.message}`);
        }
      }

      logger.info(`Permission template applied: ${template.name} to user ${userId}`);
    } catch (error) {
      logger.error('Permission template assignment failed:', error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if department permission applies to user.
   * @param {object} deptPermission - Department permission object.
   * @param {object} employee - Employee object.
   * @returns {boolean} Permission applies.
   * @example
   */
  doesDepartmentPermissionApply(deptPermission, employee) {
    if (!employee) return false;

    // Check if permission applies to employees
    if (deptPermission.appliesToEmployees
        && (employee.role !== 'manager' && employee.role !== 'director')) {
      return true;
    }

    // Check if permission applies to managers
    if (deptPermission.appliesToManagers
        && (employee.role === 'manager' || employee.role === 'director')) {
      return true;
    }

    return false;
  }

  /**
   * Clear permission cache for user.
   * @param {string} userId - User ID.
   * @example
   */
  clearUserPermissionCache(userId) {
    const keysToDelete = [];
    for (const [key] of this.permissionCache) {
      if (key.startsWith(`user_permissions:${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.permissionCache.delete(key));
  }

  /**
   * Log permission change for audit.
   * @param {object} changeData - Change details.
   * @example
   */
  async logPermissionChange(changeData) {
    const auditLog = {
      id: require('uuid').v4(),
      entityType: 'Permission',
      entityId: changeData.userId,
      action: changeData.action,
      details: {
        permissionCode: changeData.permissionCode,
        ...changeData.details,
      },
      performedBy: changeData.performedBy,
      timestamp: new Date(),
      ipAddress: changeData.ipAddress || 'unknown',
      userAgent: changeData.userAgent || 'unknown',
    };

    await this.db.collection('AuditLog').insertOne(auditLog);
  }

  /**
   * Get permission hierarchy for admin dashboard.
   * @returns {object} Permission hierarchy tree.
   * @example
   */
  async getPermissionHierarchy() {
    const permissions = await this.db.collection('Permission').find({
      isActive: true,
    }).sort({ category: 1, resource: 1, action: 1 }).toArray();

    const hierarchy = {};

    permissions.forEach((permission) => {
      if (!hierarchy[permission.category]) {
        hierarchy[permission.category] = {};
      }

      if (!hierarchy[permission.category][permission.resource]) {
        hierarchy[permission.category][permission.resource] = [];
      }

      hierarchy[permission.category][permission.resource].push({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        action: permission.action,
        description: permission.description,
        isSystem: permission.isSystem,
        assignedCount: permission.assignedCount || 0,
      });
    });

    return hierarchy;
  }

  /**
   * Get user permission summary for admin view.
   * @param {string} userId - User ID.
   * @returns {object} Permission summary.
   * @example
   */
  async getUserPermissionSummary(userId) {
    const effectivePermissions = await this.getUserEffectivePermissions(userId);
    const userSpecificPermissions = await this.getUserSpecificPermissions(userId);

    const user = await this.db.collection('AmexingUser').findOne({ id: userId });
    const rolePermissions = await this.getRolePermissions(user.role);

    let departmentPermissions = [];
    if (user.departmentId) {
      departmentPermissions = await this.getDepartmentPermissions(user.departmentId, userId);
    }

    return {
      userId,
      effectivePermissions: effectivePermissions.length,
      breakdown: {
        fromRole: rolePermissions.length,
        fromDepartment: departmentPermissions.length,
        userSpecific: userSpecificPermissions.filter((p) => p.granted).length,
        userDenied: userSpecificPermissions.filter((p) => !p.granted).length,
      },
      permissions: {
        effective: effectivePermissions,
        bySource: {
          role: rolePermissions,
          department: departmentPermissions,
          user: userSpecificPermissions,
        },
      },
    };
  }
}

module.exports = new PermissionService();
