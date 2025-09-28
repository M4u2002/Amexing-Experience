/**
 * DelegatedPermission Model - Permission Delegation System
 * Enables role holders to delegate specific permissions to other users
 * with customizable conditions and time constraints.
 *
 * Features:
 * - Temporary and permanent permission delegation
 * - Conditional delegation with restrictions
 * - Audit trail for all delegations
 * - Automatic expiration and cleanup
 * - Hierarchical delegation validation.
 * @author Amexing Development Team
 * @version 2.0.0
 * @since 2024-09-24
 * @example
 * // Delegate booking approval permission with amount limit
 * const delegation = DelegatedPermission.create({
 *   fromUserId: managerId,
 *   toUserId: employeeId,
 *   permissions: ['bookings.approve'],
 *   conditions: { maxAmount: 5000 },
 *   validUntil: new Date('2024-12-31'),
 *   reason: 'Vacation coverage'
 * });
 */

const Parse = require('parse/node');
const BaseModel = require('./BaseModel');
const logger = require('../../infrastructure/logger');

/**
 * DelegatedPermission Class - Permission delegation management
 * Handles complex permission delegation scenarios with validation.
 */
class DelegatedPermission extends BaseModel {
  constructor() {
    super('DelegatedPermission');
  }

  /**
   * Creates a new DelegatedPermission instance.
   * @param {object} delegationData - Delegation configuration object.
   * @returns {DelegatedPermission} - New DelegatedPermission instance.
   * @example
   * const delegation = DelegatedPermission.create({
   *   fromUserId: 'user123',
   *   toUserId: 'user456',
   *   permissions: ['bookings.approve', 'bookings.cancel'],
   *   conditions: {
   *     maxAmount: 10000,
   *     departmentOnly: true,
   *     businessHoursOnly: false
   *   },
   *   validFrom: new Date(),
   *   validUntil: new Date('2024-12-31'),
   *   reason: 'Department manager vacation coverage'
   * });
   */
  static create(delegationData) {
    const delegation = new DelegatedPermission();

    // Core delegation information
    delegation.set('fromUserId', delegationData.fromUserId);
    delegation.set('toUserId', delegationData.toUserId);
    delegation.set('permissions', delegationData.permissions || []);

    // Delegation conditions and restrictions
    delegation.set('conditions', delegationData.conditions || {});
    delegation.set('restrictions', delegationData.restrictions || {});

    // Time constraints
    delegation.set('validFrom', delegationData.validFrom || new Date());
    delegation.set('validUntil', delegationData.validUntil || null);
    delegation.set('isPermanent', delegationData.validUntil === null);

    // Metadata
    delegation.set('reason', delegationData.reason || '');
    delegation.set('delegationType', delegationData.delegationType || 'temporary'); // 'temporary', 'permanent', 'emergency'
    delegation.set('priority', delegationData.priority || 0);
    delegation.set('approvalRequired', delegationData.approvalRequired || false);
    delegation.set('approvedBy', delegationData.approvedBy || null);
    delegation.set('approvedAt', delegationData.approvedAt || null);

    // Status tracking
    delegation.set('status', 'active'); // 'active', 'expired', 'revoked', 'suspended'
    delegation.set('usageCount', 0);
    delegation.set('lastUsedAt', null);

    // Audit information
    delegation.set('createdBy', delegationData.fromUserId);
    delegation.set('revokedBy', null);
    delegation.set('revokedAt', null);
    delegation.set('revocationReason', null);

    // Base model fields
    delegation.set('active', delegationData.active !== undefined ? delegationData.active : true);
    delegation.set('exists', delegationData.exists !== undefined ? delegationData.exists : true);

    return delegation;
  }

  /**
   * Check if delegation is currently valid.
   * @returns {boolean} - True if delegation is valid and active.
   * @example
   */
  isValid() {
    const now = new Date();
    const validFrom = this.get('validFrom');
    const validUntil = this.get('validUntil');
    const status = this.get('status');

    // Check basic status
    if (status !== 'active' || !this.get('active') || !this.get('exists')) {
      return false;
    }

    // Check time constraints
    if (validFrom && now < validFrom) {
      return false;
    }

    if (validUntil && now > validUntil) {
      return false;
    }

    return true;
  }

  /**
   * Check if specific permission is delegated with context validation.
   * @param {string} permission - Permission to check.
   * @param {object} context - Context for conditional validation.
   * @returns {Promise<object>} - Result { allowed: boolean, reason?: string }.
   * @example
   */
  async hasPermission(permission, context = {}) {
    try {
      // Check if delegation is valid
      if (!this.isValid()) {
        return {
          allowed: false,
          reason: 'Delegation is not currently valid',
        };
      }

      // Check if permission is in delegated list
      const delegatedPermissions = this.get('permissions') || [];
      if (!delegatedPermissions.includes(permission)) {
        return {
          allowed: false,
          reason: 'Permission not included in delegation',
        };
      }

      // Validate conditions
      const conditions = this.get('conditions') || {};
      const conditionResult = await this.validateConditions(conditions, context);
      if (!conditionResult.valid) {
        return {
          allowed: false,
          reason: conditionResult.reason,
        };
      }

      // Validate restrictions
      const restrictions = this.get('restrictions') || {};
      const restrictionResult = await this.validateRestrictions(restrictions, context);
      if (!restrictionResult.valid) {
        return {
          allowed: false,
          reason: restrictionResult.reason,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking delegated permission', {
        delegationId: this.id,
        permission,
        context,
        error: error.message,
      });
      return {
        allowed: false,
        reason: 'Error validating delegated permission',
      };
    }
  }

  /**
   * Validate delegation conditions.
   * @param {object} conditions - Conditions to validate.
   * @param {object} context - Current context.
   * @returns {Promise<object>} - Validation result.
   * @example
   */
  async validateConditions(conditions, context) {
    // Amount restrictions
    if (conditions.maxAmount && context.amount) {
      if (context.amount > conditions.maxAmount) {
        return {
          valid: false,
          reason: `Amount ${context.amount} exceeds delegated limit of ${conditions.maxAmount}`,
        };
      }
    }

    // Department restrictions
    if (conditions.departmentOnly && context.departmentId) {
      // Get delegator's department
      const fromUser = await this.getFromUser();
      if (fromUser && fromUser.get('departmentId') !== context.departmentId) {
        return {
          valid: false,
          reason: 'Delegated permission only valid for delegator\'s department',
        };
      }
    }

    // Business hours restrictions
    if (conditions.businessHoursOnly) {
      const now = context.timestamp ? new Date(context.timestamp) : new Date();
      const hour = now.getHours();
      const day = now.getDay();

      if (day === 0 || day === 6 || hour < 9 || hour > 17) {
        return {
          valid: false,
          reason: 'Delegated permission only valid during business hours',
        };
      }
    }

    // Custom conditions
    if (conditions.customValidator) {
      const customResult = await this.executeCustomValidator(conditions.customValidator, context);
      if (!customResult.valid) {
        return customResult;
      }
    }

    return { valid: true };
  }

  /**
   * Validate delegation restrictions.
   * @param {object} restrictions - Restrictions to validate.
   * @param {object} context - Current context.
   * @returns {Promise<object>} - Validation result.
   * @example
   */
  async validateRestrictions(restrictions, context) {
    // Usage limit restrictions
    if (restrictions.maxUsageCount) {
      const usageCount = this.get('usageCount') || 0;
      if (usageCount >= restrictions.maxUsageCount) {
        return {
          valid: false,
          reason: 'Delegation usage limit exceeded',
        };
      }
    }

    // Daily usage restrictions
    if (restrictions.dailyUsageLimit) {
      const todayUsage = await this.getTodayUsageCount();
      if (todayUsage >= restrictions.dailyUsageLimit) {
        return {
          valid: false,
          reason: 'Daily delegation usage limit exceeded',
        };
      }
    }

    // IP address restrictions
    if (restrictions.allowedIpRanges && context.ipAddress) {
      const isAllowed = this.isIpAddressAllowed(context.ipAddress, restrictions.allowedIpRanges);
      if (!isAllowed) {
        return {
          valid: false,
          reason: 'IP address not in allowed range for delegation',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Record permission usage for audit and restrictions.
   * @param {string} permission - Permission that was used.
   * @param {object} context - Usage context.
   * @returns {Promise<void>}
   * @example
   */
  async recordUsage(permission, context = {}) {
    try {
      const currentCount = this.get('usageCount') || 0;
      this.set('usageCount', currentCount + 1);
      this.set('lastUsedAt', new Date());

      await this.save(null, { useMasterKey: true });

      logger.info('Delegated permission used', {
        delegationId: this.id,
        permission,
        fromUserId: this.get('fromUserId'),
        toUserId: this.get('toUserId'),
        usageCount: currentCount + 1,
        context,
      });
    } catch (error) {
      logger.error('Error recording delegation usage', {
        delegationId: this.id,
        permission,
        error: error.message,
      });
    }
  }

  /**
   * Revoke delegation before expiration.
   * @param {string} revokedBy - User ID who revoked the delegation.
   * @param {string} reason - Reason for revocation.
   * @returns {Promise<boolean>} - Success status.
   * @example
   */
  async revoke(revokedBy, reason = '') {
    try {
      this.set('status', 'revoked');
      this.set('revokedBy', revokedBy);
      this.set('revokedAt', new Date());
      this.set('revocationReason', reason);
      this.set('active', false);

      await this.save(null, { useMasterKey: true });

      logger.info('Delegation revoked', {
        delegationId: this.id,
        fromUserId: this.get('fromUserId'),
        toUserId: this.get('toUserId'),
        revokedBy,
        reason,
      });

      return true;
    } catch (error) {
      logger.error('Error revoking delegation', {
        delegationId: this.id,
        revokedBy,
        reason,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Extend delegation validity period.
   * @param {Date} newValidUntil - New expiration date.
   * @param {string} extendedBy - User ID who extended the delegation.
   * @param {string} reason - Reason for extension.
   * @returns {Promise<boolean>} - Success status.
   * @example
   */
  async extend(newValidUntil, extendedBy, reason = '') {
    try {
      const currentValidUntil = this.get('validUntil');

      this.set('validUntil', newValidUntil);
      this.set('isPermanent', newValidUntil === null);

      await this.save(null, { useMasterKey: true });

      logger.info('Delegation extended', {
        delegationId: this.id,
        fromUserId: this.get('fromUserId'),
        toUserId: this.get('toUserId'),
        previousValidUntil: currentValidUntil,
        newValidUntil,
        extendedBy,
        reason,
      });

      return true;
    } catch (error) {
      logger.error('Error extending delegation', {
        delegationId: this.id,
        newValidUntil,
        extendedBy,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get user who delegated the permissions.
   * @returns {Promise<object|null>} - Delegator user or null.
   * @example
   */
  async getFromUser() {
    try {
      const AmexingUser = require('./AmexingUser');
      const query = BaseModel.queryActive('AmexingUser');
      query.equalTo('objectId', this.get('fromUserId'));
      return await query.first({ useMasterKey: true });
    } catch (error) {
      logger.error('Error fetching delegator user', {
        delegationId: this.id,
        fromUserId: this.get('fromUserId'),
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get user who received the delegated permissions.
   * @returns {Promise<object|null>} - Recipient user or null.
   * @example
   */
  async getToUser() {
    try {
      const AmexingUser = require('./AmexingUser');
      const query = BaseModel.queryActive('AmexingUser');
      query.equalTo('objectId', this.get('toUserId'));
      return await query.first({ useMasterKey: true });
    } catch (error) {
      logger.error('Error fetching recipient user', {
        delegationId: this.id,
        toUserId: this.get('toUserId'),
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get usage count for today.
   * @returns {Promise<number>} - Today's usage count.
   * @example
   */
  async getTodayUsageCount() {
    // This would query a usage log table
    // For basic implementation, return 0
    return 0;
  }

  /**
   * Check if IP address is in allowed ranges.
   * @param {string} ipAddress - IP address to check.
   * @param {Array<string>} allowedRanges - Allowed IP ranges.
   * @returns {boolean} - True if allowed.
   * @example
   */
  isIpAddressAllowed(ipAddress, allowedRanges) {
    // Basic implementation - would need proper CIDR validation
    return allowedRanges.includes(ipAddress);
  }

  /**
   * Execute custom validator.
   * @param {string} validatorName - Validator function name.
   * @param {object} context - Validation context.
   * @returns {Promise<object>} - Validation result.
   * @example
   */
  async executeCustomValidator(validatorName, context) {
    // This would integrate with custom validation service
    logger.info('Custom delegation validator requested', {
      validator: validatorName,
      delegationId: this.id,
      context,
    });

    return { valid: true };
  }

  /**
   * Get safe JSON representation for API responses.
   * @returns {object} - Safe delegation data.
   * @example
   */
  toSafeJSON() {
    return {
      id: this.id,
      fromUserId: this.get('fromUserId'),
      toUserId: this.get('toUserId'),
      permissions: this.get('permissions'),
      conditions: this.get('conditions'),
      restrictions: this.get('restrictions'),
      validFrom: this.get('validFrom'),
      validUntil: this.get('validUntil'),
      isPermanent: this.get('isPermanent'),
      reason: this.get('reason'),
      delegationType: this.get('delegationType'),
      status: this.get('status'),
      usageCount: this.get('usageCount'),
      lastUsedAt: this.get('lastUsedAt'),
      approvalRequired: this.get('approvalRequired'),
      approvedBy: this.get('approvedBy'),
      approvedAt: this.get('approvedAt'),
      active: this.get('active'),
      createdAt: this.get('createdAt'),
      updatedAt: this.get('updatedAt'),
    };
  }

  /**
   * Static method to clean up expired delegations.
   * @returns {Promise<number>} - Number of cleaned delegations.
   * @example
   */
  static async cleanupExpired() {
    try {
      const now = new Date();
      const query = BaseModel.queryActive('DelegatedPermission');
      query.lessThan('validUntil', now);
      query.equalTo('status', 'active');

      const expiredDelegations = await query.find({ useMasterKey: true });

      let cleanedCount = 0;
      for (const delegation of expiredDelegations) {
        delegation.set('status', 'expired');
        delegation.set('active', false);
        await delegation.save(null, { useMasterKey: true });
        cleanedCount++;
      }

      logger.info('Expired delegations cleaned up', {
        cleanedCount,
        timestamp: now,
      });

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired delegations', {
        error: error.message,
      });
      return 0;
    }
  }
}

// Register the subclass
Parse.Object.registerSubclass('DelegatedPermission', DelegatedPermission);

module.exports = DelegatedPermission;
