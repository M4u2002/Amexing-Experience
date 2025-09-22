/**
 * Unit Tests for Permission Context Switching
 * Tests for OAUTH-3-05: Cambio de contexto para usuarios multidepartamentales
 */

const { PermissionContextService } = require('../../../src/application/services/PermissionContextService');
const { PermissionAuditService } = require('../../../src/application/services/PermissionAuditService');
const logger = require('../../../src/infrastructure/logger');

// Mock dependencies
jest.mock('../../../src/infrastructure/logger');
jest.mock('../../../src/application/services/PermissionAuditService');

describe('Permission Context Switching System', () => {
  let contextService;
  let mockUser;
  let mockSession;
  let mockContexts;

  beforeEach(() => {
    contextService = new PermissionContextService();
    
    mockUser = {
      id: 'user-123',
      get: jest.fn(),
      set: jest.fn(),
      save: jest.fn()
    };

    mockSession = {
      id: 'session-456',
      get: jest.fn(),
      set: jest.fn(),
      save: jest.fn()
    };

    mockContexts = [
      {
        id: 'dept-sistemas',
        type: 'department',
        name: 'Sistemas',
        permissions: ['technical_access', 'system_support'],
        isDefault: true,
        requiresValidation: false,
        metadata: { department: 'sistemas' }
      },
      {
        id: 'dept-rrhh',
        type: 'department',
        name: 'RRHH',
        permissions: ['employee_management', 'payroll_access'],
        isDefault: false,
        requiresValidation: true,
        metadata: { department: 'rrhh' }
      },
      {
        id: 'project-alpha',
        type: 'project',
        name: 'Project Alpha',
        permissions: ['project_access', 'alpha_resources'],
        isDefault: false,
        requiresValidation: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        metadata: { project: 'alpha', lead: 'manager-789' }
      },
      {
        id: 'temp-elevation',
        type: 'temporary',
        name: 'Emergency Access',
        permissions: ['emergency_admin', 'system_override'],
        isDefault: false,
        requiresValidation: false,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        metadata: { reason: 'system_emergency', approvedBy: 'admin-999' }
      }
    ];

    // Mock user data
    mockUser.get.mockImplementation((field) => {
      const userData = {
        'departments': ['sistemas', 'rrhh'],
        'primaryDepartment': 'sistemas',
        'projects': ['alpha', 'beta'],
        'currentContext': mockContexts[0]
      };
      return userData[field];
    });

    jest.clearAllMocks();
  });

  describe('Context Discovery and Availability', () => {
    test('should get all available contexts for multi-departmental user', async () => {
      const availableContexts = await contextService.getAvailableContexts(mockUser.id);

      expect(availableContexts).toHaveLength(4);
      expect(availableContexts.map(ctx => ctx.type)).toEqual(
        expect.arrayContaining(['department', 'project', 'temporary'])
      );
    });

    test('should prioritize default context first', async () => {
      const availableContexts = await contextService.getAvailableContexts(mockUser.id);
      
      expect(availableContexts[0].isDefault).toBe(true);
      expect(availableContexts[0].id).toBe('dept-sistemas');
    });

    test('should filter expired temporary contexts', async () => {
      // Add an expired context
      const expiredContext = {
        id: 'expired-temp',
        type: 'temporary',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        permissions: ['expired_access']
      };
      
      // Mock the service to return contexts including expired one
      jest.spyOn(contextService, 'getUserContextsFromDatabase')
        .mockResolvedValue([...mockContexts, expiredContext]);

      const availableContexts = await contextService.getAvailableContexts(mockUser.id);

      expect(availableContexts.find(ctx => ctx.id === 'expired-temp')).toBeUndefined();
    });

    test('should include context metadata for authorization decisions', async () => {
      const availableContexts = await contextService.getAvailableContexts(mockUser.id);
      const projectContext = availableContexts.find(ctx => ctx.type === 'project');

      expect(projectContext.metadata).toEqual(
        expect.objectContaining({
          project: 'alpha',
          lead: 'manager-789'
        })
      );
    });
  });

  describe('Context Switching Operations', () => {
    test('should switch to valid department context successfully', async () => {
      const targetContext = mockContexts[1]; // dept-rrhh

      const result = await contextService.switchToContext(
        mockUser.id, 
        targetContext.id, 
        mockSession.id
      );

      expect(result.success).toBe(true);
      expect(result).toHaveValidPermissionContext(targetContext);
      expect(result.previousContext.id).toBe('dept-sistemas');
    });

    test('should validate context access when required', async () => {
      const restrictedContext = mockContexts.find(ctx => ctx.requiresValidation);
      
      // Mock successful validation
      jest.spyOn(contextService, 'validateContextAccess')
        .mockResolvedValue({ valid: true, reason: 'User has required department membership' });

      const result = await contextService.switchToContext(
        mockUser.id, 
        restrictedContext.id, 
        mockSession.id
      );

      expect(contextService.validateContextAccess).toHaveBeenCalledWith(mockUser.id, restrictedContext);
      expect(result.success).toBe(true);
    });

    test('should reject context switch when validation fails', async () => {
      const restrictedContext = mockContexts[1]; // dept-rrhh with validation required
      
      // Mock failed validation
      jest.spyOn(contextService, 'validateContextAccess')
        .mockResolvedValue({ valid: false, reason: 'User not authorized for HR operations' });

      const result = await contextService.switchToContext(
        mockUser.id, 
        restrictedContext.id, 
        mockSession.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation failed');
      expect(result.validationReason).toBe('User not authorized for HR operations');
    });

    test('should apply context-specific permissions correctly', async () => {
      const targetContext = mockContexts[2]; // project context

      const result = await contextService.switchToContext(
        mockUser.id, 
        targetContext.id, 
        mockSession.id
      );

      expect(result.appliedPermissions).toEqual(
        expect.arrayContaining(['project_access', 'alpha_resources'])
      );
      expect(result.removedPermissions).not.toContain('project_access');
    });

    test('should handle switching to temporary elevated context', async () => {
      const tempContext = mockContexts[3]; // emergency context

      const result = await contextService.switchToContext(
        mockUser.id, 
        tempContext.id, 
        mockSession.id
      );

      expect(result).toHaveValidTemporaryPermission(4 * 60 * 60 * 1000); // 4 hours max
      expect(result.appliedPermissions).toContain('emergency_admin');
    });

    test('should cache active context for performance', async () => {
      const targetContext = mockContexts[0];

      // First switch
      await contextService.switchToContext(mockUser.id, targetContext.id, mockSession.id);
      
      // Second switch to same context - should use cache
      const result = await contextService.switchToContext(
        mockUser.id, 
        targetContext.id, 
        mockSession.id
      );

      expect(result.fromCache).toBe(true);
      expect(result.switchTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Context Session Management', () => {
    test('should associate context with specific session', async () => {
      const targetContext = mockContexts[1];

      const result = await contextService.switchToContext(
        mockUser.id, 
        targetContext.id, 
        mockSession.id
      );

      expect(mockSession.set).toHaveBeenCalledWith('currentContext', targetContext.id);
      expect(mockSession.set).toHaveBeenCalledWith('contextPermissions', targetContext.permissions);
    });

    test('should handle multiple concurrent sessions with different contexts', async () => {
      const session1 = { ...mockSession, id: 'session-1' };
      const session2 = { ...mockSession, id: 'session-2' };

      // Switch session1 to department context
      await contextService.switchToContext(mockUser.id, 'dept-sistemas', session1.id);
      
      // Switch session2 to project context
      await contextService.switchToContext(mockUser.id, 'project-alpha', session2.id);

      const session1Context = await contextService.getCurrentContext(mockUser.id, session1.id);
      const session2Context = await contextService.getCurrentContext(mockUser.id, session2.id);

      expect(session1Context.id).toBe('dept-sistemas');
      expect(session2Context.id).toBe('project-alpha');
    });

    test('should cleanup expired session contexts', async () => {
      const expiredSessionId = 'expired-session';
      
      // Mock expired session data
      jest.spyOn(contextService, 'isSessionExpired')
        .mockResolvedValue(true);

      await contextService.cleanupExpiredSessionContexts();

      // Should have removed expired session context
      const result = await contextService.getCurrentContext(mockUser.id, expiredSessionId);
      expect(result).toBeNull();
    });
  });

  describe('Context Permissions and Authorization', () => {
    test('should check permission within active context', async () => {
      // Set current context to project
      await contextService.switchToContext(mockUser.id, 'project-alpha', mockSession.id);

      const hasPermission = await contextService.hasPermissionInContext(
        mockUser.id, 
        mockSession.id, 
        'project_access'
      );

      expect(hasPermission).toBe(true);
    });

    test('should deny permission not available in current context', async () => {
      // Set context to HR department
      await contextService.switchToContext(mockUser.id, 'dept-rrhh', mockSession.id);

      const hasPermission = await contextService.hasPermissionInContext(
        mockUser.id, 
        mockSession.id, 
        'technical_access'
      );

      expect(hasPermission).toBe(false);
    });

    test('should handle cross-context permission inheritance', async () => {
      // Some permissions might be inherited across contexts
      const result = await contextService.checkCrossContextPermission(
        mockUser.id,
        'basic_access', // This should be available in all contexts
        ['dept-sistemas', 'dept-rrhh']
      );

      expect(result.availableInContexts).toEqual(['dept-sistemas', 'dept-rrhh']);
    });
  });

  describe('Audit Trail and Logging', () => {
    test('should log context switches for audit trail', async () => {
      const targetContext = mockContexts[1];

      await contextService.switchToContext(mockUser.id, targetContext.id, mockSession.id);

      expect(PermissionAuditService.recordPermissionAudit).toHaveBeenCalledWith({
        userId: mockUser.id,
        sessionId: mockSession.id,
        action: 'context_switch',
        fromContext: mockContexts[0].id,
        toContext: targetContext.id,
        permissions: targetContext.permissions,
        timestamp: expect.any(Date),
        metadata: expect.objectContaining({
          contextType: 'department',
          validationRequired: true
        })
      });
    });

    test('should generate context usage statistics', async () => {
      // Perform several context switches
      await contextService.switchToContext(mockUser.id, 'dept-rrhh', mockSession.id);
      await contextService.switchToContext(mockUser.id, 'project-alpha', mockSession.id);
      await contextService.switchToContext(mockUser.id, 'dept-sistemas', mockSession.id);

      const stats = await contextService.getContextUsageStatistics(mockUser.id, {
        timeRange: 'last_24_hours'
      });

      expect(stats.totalSwitches).toBe(3);
      expect(stats.mostUsedContextType).toBe('department');
      expect(stats.contextDistribution).toEqual(
        expect.objectContaining({
          'department': 2,
          'project': 1
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle switching to non-existent context', async () => {
      const result = await contextService.switchToContext(
        mockUser.id, 
        'non-existent-context', 
        mockSession.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context not found');
    });

    test('should handle context switching for user with no available contexts', async () => {
      // Mock user with no contexts
      jest.spyOn(contextService, 'getAvailableContexts')
        .mockResolvedValue([]);

      const result = await contextService.switchToContext(
        mockUser.id, 
        'any-context', 
        mockSession.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No contexts available for user');
    });

    test('should handle database connection failures gracefully', async () => {
      // Mock database failure
      jest.spyOn(contextService, 'saveContextToSession')
        .mockRejectedValue(new Error('Database connection failed'));

      const result = await contextService.switchToContext(
        mockUser.id, 
        mockContexts[0].id, 
        mockSession.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save context switch');
    });

    test('should timeout on slow context validation', async () => {
      // Mock slow validation
      jest.spyOn(contextService, 'validateContextAccess')
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve({ valid: true }), 10000)
        ));

      const result = await contextService.switchToContext(
        mockUser.id, 
        mockContexts[1].id, 
        mockSession.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation timeout');
    }, 5000); // 5 second test timeout
  });
});