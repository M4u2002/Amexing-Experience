/**
 * PCI DSS Compliance Tests for Permission Audit System
 * Tests for OAUTH-3-06: Sistema de auditoría integral
 * Validates compliance with PCI DSS Requirements 7, 8, and 10
 */

const { PermissionAuditService } = require('../../../../src/application/services/PermissionAuditService');
const { PermissionContextService } = require('../../../../src/application/services/PermissionContextService');
const { PermissionDelegationService } = require('../../../../src/application/services/PermissionDelegationService');
const crypto = require('crypto');

describe('PCI DSS Compliance - Permission Audit System', () => {
  let auditService;
  let contextService;
  let delegationService;
  let testUserId;
  let testSessionId;

  beforeEach(async () => {
    auditService = new PermissionAuditService();
    contextService = new PermissionContextService();
    delegationService = new PermissionDelegationService();
    
    testUserId = 'pci-test-user-' + Date.now();
    testSessionId = 'pci-test-session-' + Date.now();

    // Initialize services
    await auditService.initialize();
    await contextService.initialize();
    await delegationService.initialize();
  });

  afterEach(async () => {
    // Cleanup test data
    await auditService.cleanup();
  });

  describe('PCI DSS Requirement 7: Restrict Access by Business Need-to-Know', () => {
    test('should enforce least privilege principle in permission inheritance', async () => {
      const userProfile = {
        role: 'employee',
        department: 'marketing',
        oauthGroups: ['marketing_basic']
      };

      const auditData = {
        userId: testUserId,
        action: 'permission_inheritance',
        resource: 'user_permissions',
        performedBy: 'system',
        requestedPermissions: ['marketing_read', 'marketing_write', 'admin_full'], // Includes excessive permission
        grantedPermissions: ['marketing_read', 'marketing_write'], // Should filter out admin_full
        reason: 'OAuth group membership inheritance',
        metadata: {
          userProfile,
          complianceFramework: 'PCI_DSS'
        }
      };

      const result = await auditService.recordPermissionAudit(auditData);

      expect(result).toBeCompliantWithPCIDSS('permission_segregation');
      expect(result.auditEntry.grantedPermissions).not.toContain('admin_full');
      expect(result.complianceChecks.PCI_DSS_REQ_7).toBe('COMPLIANT');
    });

    test('should audit access attempts to sensitive data', async () => {
      const sensitiveDataAccess = {
        userId: testUserId,
        sessionId: testSessionId,
        action: 'access_attempt',
        resource: 'cardholder_data',
        permission: 'cardholder_data_access',
        performedBy: testUserId,
        result: 'DENIED', // Should be denied for non-authorized user
        reason: 'Insufficient permissions for cardholder data access',
        metadata: {
          dataType: 'PCI_SENSITIVE',
          accessLevel: 'attempted',
          complianceFramework: 'PCI_DSS'
        }
      };

      const auditResult = await auditService.recordPermissionAudit(sensitiveDataAccess);

      expect(auditResult).toBeCompliantWithPCIDSS('access_logging');
      expect(auditResult.auditEntry.result).toBe('DENIED');
      expect(auditResult.auditEntry.sensitiveDataFlag).toBe(true);
    });

    test('should validate role-based access controls', async () => {
      // Test different user roles and their permitted access levels
      const testCases = [
        {
          role: 'employee',
          permissions: ['basic_access'],
          shouldHaveAccess: ['basic_access'],
          shouldNotHaveAccess: ['admin_access', 'cardholder_data_access']
        },
        {
          role: 'manager',
          permissions: ['basic_access', 'team_management'],
          shouldHaveAccess: ['basic_access', 'team_management'],
          shouldNotHaveAccess: ['system_admin', 'cardholder_data_access']
        },
        {
          role: 'compliance_admin',
          permissions: ['basic_access', 'compliance_admin', 'cardholder_data_access'],
          shouldHaveAccess: ['basic_access', 'compliance_admin', 'cardholder_data_access'],
          shouldNotHaveAccess: ['system_root']
        }
      ];

      for (const testCase of testCases) {
        const auditData = {
          userId: `user-${testCase.role}`,
          action: 'role_validation',
          resource: 'access_control',
          userRole: testCase.role,
          requestedPermissions: [...testCase.shouldHaveAccess, ...testCase.shouldNotHaveAccess],
          grantedPermissions: testCase.shouldHaveAccess,
          deniedPermissions: testCase.shouldNotHaveAccess,
          performedBy: 'system',
          metadata: {
            complianceFramework: 'PCI_DSS',
            requirement: 'REQ_7_1'
          }
        };

        const result = await auditService.recordPermissionAudit(auditData);
        expect(result).toBeCompliantWithPCIDSS('permission_segregation');
      }
    });
  });

  describe('PCI DSS Requirement 8: Identify and Authenticate Access', () => {
    test('should audit user authentication events', async () => {
      const authAuditData = {
        userId: testUserId,
        sessionId: testSessionId,
        action: 'authentication',
        resource: 'oauth_login',
        performedBy: testUserId,
        authMethod: 'google_oauth',
        result: 'SUCCESS',
        reason: 'Valid OAuth token and user credentials',
        metadata: {
          provider: 'google',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          complianceFramework: 'PCI_DSS',
          requirement: 'REQ_8_1'
        }
      };

      const result = await auditService.recordPermissionAudit(authAuditData);

      expect(result).toBeCompliantWithPCIDSS('access_logging');
      expect(result.auditEntry).toBeCompliantWithPCIDSS('session_management');
      expect(result.auditEntry.authMethod).toBe('google_oauth');
      expect(result.auditEntry.metadata.ipAddress).toBe('192.168.1.100');
    });

    test('should track failed authentication attempts', async () => {
      const failedAuthAttempts = [
        { reason: 'invalid_password', timestamp: new Date() },
        { reason: 'invalid_password', timestamp: new Date(Date.now() + 1000) },
        { reason: 'invalid_password', timestamp: new Date(Date.now() + 2000) },
        { reason: 'account_locked', timestamp: new Date(Date.now() + 3000) }
      ];

      for (const [index, attempt] of failedAuthAttempts.entries()) {
        const auditData = {
          userId: testUserId,
          action: 'authentication_failure',
          resource: 'oauth_login',
          performedBy: testUserId,
          result: 'FAILURE',
          reason: attempt.reason,
          attemptNumber: index + 1,
          metadata: {
            complianceFramework: 'PCI_DSS',
            requirement: 'REQ_8_1_6',
            consecutiveFailures: index + 1
          }
        };

        await auditService.recordPermissionAudit(auditData);
      }

      // Verify that multiple failed attempts are properly logged
      const auditTrail = await auditService.getAuditTrail(testUserId, {
        action: 'authentication_failure',
        timeRange: { minutes: 5 }
      });

      expect(auditTrail).toHaveLength(4);
      expect(auditTrail[auditTrail.length - 1].reason).toBe('account_locked');
    });

    test('should validate session management compliance', async () => {
      const sessionData = {
        sessionId: testSessionId,
        userId: testUserId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        encrypted: true,
        encryptionAlgorithm: 'AES-256-GCM'
      };

      const sessionAuditData = {
        userId: testUserId,
        sessionId: testSessionId,
        action: 'session_created',
        resource: 'user_session',
        performedBy: 'system',
        result: 'SUCCESS',
        metadata: {
          ...sessionData,
          complianceFramework: 'PCI_DSS',
          requirement: 'REQ_8_2_4'
        }
      };

      const result = await auditService.recordPermissionAudit(sessionAuditData);

      expect(result.auditEntry).toBeCompliantWithPCIDSS('session_management');
      expect(result.auditEntry).toBeCompliantWithPCIDSS('data_encryption');
    });
  });

  describe('PCI DSS Requirement 10: Track and Monitor Access', () => {
    test('should maintain comprehensive audit logs with required fields', async () => {
      const requiredAuditData = {
        userId: testUserId,
        sessionId: testSessionId,
        action: 'permission_change',
        resource: 'user_permissions',
        performedBy: 'admin-user-123',
        timestamp: new Date(),
        result: 'SUCCESS',
        reason: 'Quarterly permission review',
        oldPermissions: ['basic_access'],
        newPermissions: ['basic_access', 'project_access'],
        ipAddress: '10.0.1.50',
        userAgent: 'AmexingAdmin/1.0',
        metadata: {
          complianceFramework: 'PCI_DSS',
          requirement: 'REQ_10_2_5',
          reviewCycle: 'quarterly',
          approvedBy: 'manager-456'
        }
      };

      const result = await auditService.recordPermissionAudit(requiredAuditData);

      expect(result).toBeCompliantWithPCIDSS('access_logging');
      expect(result.auditEntry.timestamp).toBeDefined();
      expect(result.auditEntry.userId).toBe(testUserId);
      expect(result.auditEntry.performedBy).toBe('admin-user-123');
      expect(result.auditEntry.ipAddress).toBe('10.0.1.50');
    });

    test('should encrypt sensitive audit data', async () => {
      const sensitiveAuditData = {
        userId: testUserId,
        action: 'cardholder_data_access',
        resource: 'payment_information',
        performedBy: testUserId,
        cardholderDataAccessed: 'PAN_MASKED_1234',
        metadata: {
          complianceFramework: 'PCI_DSS',
          sensitiveData: true,
          encryptionRequired: true
        }
      };

      const result = await auditService.recordPermissionAudit(sensitiveAuditData);

      expect(result.auditEntry).toBeCompliantWithPCIDSS('data_encryption');
      expect(result.auditEntry.encrypted).toBe(true);
      expect(result.auditEntry.encryptionAlgorithm).toBe('AES-256-GCM');
      
      // Verify encrypted fields are not in plain text
      expect(result.auditEntry.encryptedFields).toContain('cardholderDataAccessed');
    });

    test('should generate tamper-evident audit trails', async () => {
      const auditEntries = [];
      
      // Create a series of audit entries
      for (let i = 0; i < 5; i++) {
        const auditData = {
          userId: testUserId,
          action: `test_action_${i}`,
          resource: 'test_resource',
          performedBy: testUserId,
          timestamp: new Date(Date.now() + i * 1000),
          metadata: {
            sequence: i,
            complianceFramework: 'PCI_DSS'
          }
        };

        const result = await auditService.recordPermissionAudit(auditData);
        auditEntries.push(result.auditEntry);
      }

      // Verify chain integrity
      for (let i = 1; i < auditEntries.length; i++) {
        const current = auditEntries[i];
        const previous = auditEntries[i - 1];
        
        expect(current.previousHash).toBe(previous.hash);
        expect(current.chainIntegrityValid).toBe(true);
      }
    });

    test('should support audit log retention policies', async () => {
      const oldAuditData = {
        userId: testUserId,
        action: 'old_permission_change',
        resource: 'user_permissions',
        performedBy: testUserId,
        timestamp: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000), // > 1 year ago
        metadata: {
          complianceFramework: 'PCI_DSS',
          retentionTest: true
        }
      };

      const recentAuditData = {
        userId: testUserId,
        action: 'recent_permission_change',
        resource: 'user_permissions',
        performedBy: testUserId,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        metadata: {
          complianceFramework: 'PCI_DSS',
          retentionTest: true
        }
      };

      await auditService.recordPermissionAudit(oldAuditData);
      await auditService.recordPermissionAudit(recentAuditData);

      // Apply retention policy
      const retentionResult = await auditService.applyRetentionPolicy('PCI_DSS');

      expect(retentionResult.archivedEntries).toBeGreaterThan(0);
      expect(retentionResult.retainedEntries).toBeGreaterThan(0);

      // Verify old entries are archived, not deleted (for compliance)
      const archivedEntry = await auditService.getArchivedAuditEntry(testUserId, 'old_permission_change');
      expect(archivedEntry).toBeDefined();
      expect(archivedEntry.archived).toBe(true);
    });
  });

  describe('Compliance Reporting and Analytics', () => {
    test('should generate PCI DSS compliance reports', async () => {
      // Create sample audit data
      const auditActivities = [
        { action: 'login', result: 'SUCCESS', requirement: 'REQ_8' },
        { action: 'permission_change', result: 'SUCCESS', requirement: 'REQ_7' },
        { action: 'cardholder_data_access', result: 'SUCCESS', requirement: 'REQ_10' },
        { action: 'failed_login', result: 'FAILURE', requirement: 'REQ_8' }
      ];

      for (const activity of auditActivities) {
        await auditService.recordPermissionAudit({
          userId: testUserId,
          action: activity.action,
          resource: 'compliance_test',
          performedBy: testUserId,
          result: activity.result,
          metadata: {
            complianceFramework: 'PCI_DSS',
            requirement: activity.requirement
          }
        });
      }

      const complianceReport = await auditService.generateComplianceReport('PCI_DSS', {
        timeRange: { hours: 1 },
        userId: testUserId
      });

      expect(complianceReport.framework).toBe('PCI_DSS');
      expect(complianceReport.requirements).toEqual(
        expect.objectContaining({
          'REQ_7': expect.objectContaining({ status: 'COMPLIANT' }),
          'REQ_8': expect.objectContaining({ status: 'COMPLIANT' }),
          'REQ_10': expect.objectContaining({ status: 'COMPLIANT' })
        })
      );
      expect(complianceReport.overallCompliance).toBeGreaterThanOrEqual(90);
    });

    test('should detect compliance violations and anomalies', async () => {
      // Simulate compliance violation: excessive permissions granted
      const violationData = {
        userId: testUserId,
        action: 'permission_escalation',
        resource: 'user_permissions',
        performedBy: 'admin-123',
        oldPermissions: ['basic_access'],
        newPermissions: ['basic_access', 'admin_full', 'cardholder_data_access'], // Excessive escalation
        reason: 'Emergency access request',
        metadata: {
          complianceFramework: 'PCI_DSS',
          emergencyAccess: true,
          approvalRequired: true,
          approvedBy: null // Missing approval - violation!
        }
      };

      const result = await auditService.recordPermissionAudit(violationData);

      expect(result.complianceViolations).toHaveLength(1);
      expect(result.complianceViolations[0].type).toBe('EXCESSIVE_PRIVILEGE_ESCALATION');
      expect(result.complianceViolations[0].severity).toBe('HIGH');
      expect(result.alertGenerated).toBe(true);
    });

    test('should provide audit statistics and metrics', async () => {
      // Generate various audit events
      const eventTypes = ['login', 'logout', 'permission_change', 'data_access', 'context_switch'];
      
      for (let i = 0; i < 20; i++) {
        const eventType = eventTypes[i % eventTypes.length];
        await auditService.recordPermissionAudit({
          userId: testUserId,
          action: eventType,
          resource: 'test_resource',
          performedBy: testUserId,
          result: Math.random() > 0.1 ? 'SUCCESS' : 'FAILURE', // 90% success rate
          metadata: {
            complianceFramework: 'PCI_DSS',
            testGenerated: true
          }
        });
      }

      const statistics = await auditService.getAuditStatistics(testUserId, {
        timeRange: { hours: 1 },
        complianceFramework: 'PCI_DSS'
      });

      expect(statistics.totalEvents).toBe(20);
      expect(statistics.successRate).toBeGreaterThan(0.8);
      expect(statistics.eventDistribution).toEqual(
        expect.objectContaining({
          'login': expect.any(Number),
          'permission_change': expect.any(Number)
        })
      );
      expect(statistics.complianceScore).toBeGreaterThan(85);
    });
  });

  describe('Integration with Permission Services', () => {
    test('should audit context switching operations', async () => {
      // Perform a context switch
      const contextSwitchResult = await contextService.switchToContext(
        testUserId,
        'dept-finance',
        testSessionId
      );

      // Verify audit trail was created
      const auditTrail = await auditService.getAuditTrail(testUserId, {
        action: 'context_switch',
        timeRange: { minutes: 1 }
      });

      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0]).toBeCompliantWithPCIDSS('access_logging');
      expect(auditTrail[0].action).toBe('context_switch');
    });

    test('should audit permission delegation operations', async () => {
      // Create a permission delegation
      const delegationResult = await delegationService.createDelegation({
        fromUserId: testUserId,
        toUserId: 'delegate-user-456',
        permissions: ['project_access', 'team_lead'],
        type: 'temporary',
        duration: 24 * 60 * 60 * 1000, // 24 hours
        reason: 'Vacation coverage'
      });

      // Verify audit trail includes delegation
      const auditTrail = await auditService.getAuditTrail(testUserId, {
        action: 'permission_delegation',
        timeRange: { minutes: 1 }
      });

      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].action).toBe('permission_delegation');
      expect(auditTrail[0]).toBeCompliantWithPCIDSS('access_logging');
    });
  });
});