/**
 * Custom Jest Matchers for OAuth Testing
 * Provides specialized matchers for OAuth flows, permissions, and PCI compliance
 */

const { PermissionAuditService } = require('../../../src/application/services/PermissionAuditService');
const logger = require('../../../src/infrastructure/logger');

expect.extend({
  /**
   * Matcher to verify OAuth permission inheritance
   */
  toHaveInheritedPermissions(received, expectedPermissions) {
    const pass = expectedPermissions.every(permission => 
      received.inheritedPermissions && 
      received.inheritedPermissions.includes(permission)
    );

    if (pass) {
      return {
        message: () => 
          `Expected ${JSON.stringify(received.inheritedPermissions)} not to contain all permissions ${JSON.stringify(expectedPermissions)}`,
        pass: true,
      };
    } else {
      const missingPermissions = expectedPermissions.filter(permission => 
        !received.inheritedPermissions || !received.inheritedPermissions.includes(permission)
      );
      return {
        message: () => 
          `Expected ${JSON.stringify(received.inheritedPermissions)} to contain all permissions ${JSON.stringify(expectedPermissions)}. Missing: ${JSON.stringify(missingPermissions)}`,
        pass: false,
      };
    }
  },

  /**
   * Matcher to verify permission context switching
   */
  toHaveValidPermissionContext(received, expectedContext) {
    const pass = received.currentContext && 
                 received.currentContext.id === expectedContext.id &&
                 received.currentContext.type === expectedContext.type;

    if (pass) {
      return {
        message: () => 
          `Expected context ${JSON.stringify(received.currentContext)} not to match ${JSON.stringify(expectedContext)}`,
        pass: true,
      };
    } else {
      return {
        message: () => 
          `Expected context ${JSON.stringify(received.currentContext)} to match ${JSON.stringify(expectedContext)}`,
        pass: false,
      };
    }
  },

  /**
   * Matcher to verify permission delegation
   */
  toHaveValidDelegation(received, expectedDelegation) {
    const pass = received.delegationType === expectedDelegation.type &&
                 received.fromUserId === expectedDelegation.fromUserId &&
                 received.toUserId === expectedDelegation.toUserId &&
                 received.isActive === true;

    if (pass) {
      return {
        message: () => 
          `Expected delegation ${JSON.stringify(received)} not to match expected delegation`,
        pass: true,
      };
    } else {
      return {
        message: () => 
          `Expected delegation ${JSON.stringify(received)} to match expected delegation ${JSON.stringify(expectedDelegation)}`,
        pass: false,
      };
    }
  },

  /**
   * Matcher to verify audit trail compliance
   */
  async toHaveAuditTrail(received, expectedAuditData) {
    try {
      const auditEntries = await PermissionAuditService.getAuditTrail(
        received.userId,
        expectedAuditData.timeRange
      );

      const relevantEntry = auditEntries.find(entry => 
        entry.action === expectedAuditData.action &&
        entry.permission === expectedAuditData.permission
      );

      const pass = !!relevantEntry;

      if (pass) {
        return {
          message: () => 
            `Expected not to find audit entry for action ${expectedAuditData.action} and permission ${expectedAuditData.permission}`,
          pass: true,
        };
      } else {
        return {
          message: () => 
            `Expected to find audit entry for action ${expectedAuditData.action} and permission ${expectedAuditData.permission}. Found entries: ${JSON.stringify(auditEntries.map(e => ({ action: e.action, permission: e.permission })))}`,
          pass: false,
        };
      }
    } catch (error) {
      return {
        message: () => `Error checking audit trail: ${error.message}`,
        pass: false,
      };
    }
  },

  /**
   * Matcher to verify PCI DSS compliance
   */
  toBeCompliantWithPCIDSS(received, requirement) {
    let pass = false;
    let message = '';

    switch (requirement) {
      case 'data_encryption':
        pass = received.encrypted === true && 
               received.encryptionAlgorithm === 'AES-256-GCM';
        message = pass 
          ? 'Data is properly encrypted with AES-256-GCM'
          : `Data encryption compliance failed. Encrypted: ${received.encrypted}, Algorithm: ${received.encryptionAlgorithm}`;
        break;

      case 'access_logging':
        pass = received.auditLog && 
               received.auditLog.timestamp &&
               received.auditLog.userId &&
               received.auditLog.action;
        message = pass
          ? 'Access logging is compliant'
          : `Access logging compliance failed. Missing required fields in: ${JSON.stringify(received.auditLog)}`;
        break;

      case 'session_management':
        pass = received.sessionId && 
               received.expiresAt && 
               new Date(received.expiresAt) > new Date();
        message = pass
          ? 'Session management is compliant'
          : `Session management compliance failed. SessionId: ${received.sessionId}, ExpiresAt: ${received.expiresAt}`;
        break;

      case 'permission_segregation':
        pass = received.permissions && 
               Array.isArray(received.permissions) &&
               received.permissions.length > 0 &&
               !received.permissions.includes('admin_full') ||
               received.role === 'admin' || received.role === 'superadmin';
        message = pass
          ? 'Permission segregation is compliant'
          : `Permission segregation compliance failed. Role: ${received.role}, Permissions: ${JSON.stringify(received.permissions)}`;
        break;

      default:
        pass = false;
        message = `Unknown PCI DSS requirement: ${requirement}`;
    }

    return {
      message: () => message,
      pass,
    };
  },

  /**
   * Matcher to verify OAuth provider configuration
   */
  toHaveValidOAuthConfig(received, provider) {
    const requiredFields = ['clientId', 'clientSecret', 'redirectUri', 'scope'];
    const providerConfig = received[provider];

    if (!providerConfig) {
      return {
        message: () => `Expected OAuth config to have configuration for provider ${provider}`,
        pass: false,
      };
    }

    const missingFields = requiredFields.filter(field => !providerConfig[field]);
    const pass = missingFields.length === 0;

    if (pass) {
      return {
        message: () => `Expected OAuth config for ${provider} not to have all required fields`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected OAuth config for ${provider} to have all required fields. Missing: ${JSON.stringify(missingFields)}`,
        pass: false,
      };
    }
  },

  /**
   * Matcher to verify permission hierarchy
   */
  toRespectPermissionHierarchy(received, higherPermission, lowerPermission) {
    const higherLevel = received.permissionLevels[higherPermission];
    const lowerLevel = received.permissionLevels[lowerPermission];

    if (!higherLevel || !lowerLevel) {
      return {
        message: () => `Permission levels not found. Higher: ${higherLevel}, Lower: ${lowerLevel}`,
        pass: false,
      };
    }

    const pass = higherLevel > lowerLevel;

    if (pass) {
      return {
        message: () => `Expected ${higherPermission} (${higherLevel}) not to have higher level than ${lowerPermission} (${lowerLevel})`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${higherPermission} (${higherLevel}) to have higher level than ${lowerPermission} (${lowerLevel})`,
        pass: false,
      };
    }
  },

  /**
   * Matcher to verify temporary permission expiration
   */
  toHaveValidTemporaryPermission(received, maxDurationMs) {
    const now = new Date();
    const expiresAt = new Date(received.expiresAt);
    const createdAt = new Date(received.createdAt);

    const actualDuration = expiresAt.getTime() - createdAt.getTime();
    const isWithinMaxDuration = actualDuration <= maxDurationMs;
    const isNotExpired = expiresAt > now;

    const pass = isWithinMaxDuration && isNotExpired && received.isTemporary === true;

    if (pass) {
      return {
        message: () => `Expected temporary permission not to be valid`,
        pass: true,
      };
    } else {
      const issues = [];
      if (!isWithinMaxDuration) issues.push(`Duration ${actualDuration}ms exceeds maximum ${maxDurationMs}ms`);
      if (!isNotExpired) issues.push(`Permission expired at ${expiresAt}`);
      if (received.isTemporary !== true) issues.push(`isTemporary should be true, got ${received.isTemporary}`);

      return {
        message: () => `Temporary permission validation failed: ${issues.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Export for manual usage if needed
module.exports = {
  // Helper functions for test utilities
  validatePermissionInheritance: (userPermissions, expectedPermissions) => {
    return expectedPermissions.every(permission => 
      userPermissions.inheritedPermissions && 
      userPermissions.inheritedPermissions.includes(permission)
    );
  },

  validatePCICompliance: (data, requirement) => {
    switch (requirement) {
      case 'data_encryption':
        return data.encrypted === true && data.encryptionAlgorithm === 'AES-256-GCM';
      case 'access_logging':
        return data.auditLog && data.auditLog.timestamp && data.auditLog.userId && data.auditLog.action;
      default:
        return false;
    }
  },

  generateTestContext: (type, id) => ({
    id,
    type,
    permissions: [`${type}_access`, `${type}_read`],
    metadata: {
      createdAt: new Date().toISOString(),
      testGenerated: true
    }
  }),

  generateTestDelegation: (fromUserId, toUserId, type = 'temporary') => ({
    fromUserId,
    toUserId,
    delegationType: type,
    permissions: ['basic_access', 'read_data'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    isActive: true,
    metadata: {
      testGenerated: true
    }
  })
};