/**
 * Unit Tests for OAuth Permission Inheritance System
 * Tests for OAUTH-3-01: Herencia de permisos desde grupos OAuth
 * Tests for OAUTH-3-02: Permisos específicos por departamento
 * Tests for OAUTH-3-03: Anulaciones individuales de permisos
 */

const { OAuthPermissionService } = require('../../../src/application/services/OAuthPermissionService');
const { PermissionInheritanceService } = require('../../../src/application/services/PermissionInheritanceService');
const { AmexingUser } = require('../../../src/domain/models/AmexingUser');
const logger = require('../../../src/infrastructure/logger');

// Mock dependencies
jest.mock('../../../src/infrastructure/logger');
jest.mock('../../../src/domain/models/AmexingUser');

describe('OAuth Permission Inheritance System', () => {
  let permissionService;
  let inheritanceService;
  let mockUser;
  let mockOAuthProfile;
  let mockCorporateConfig;

  beforeEach(() => {
    permissionService = new OAuthPermissionService();
    inheritanceService = new PermissionInheritanceService();
    
    // Mock user
    mockUser = {
      id: 'test-user-123',
      get: jest.fn(),
      set: jest.fn(),
      save: jest.fn()
    };

    // Mock OAuth profile
    mockOAuthProfile = {
      id: 'oauth-user-456',
      email: 'test@company.com',
      groups: ['admin_group', 'dept_sistemas'],
      roles: ['admin']
    };

    // Mock corporate config
    mockCorporateConfig = {
      id: 'corp-config-789',
      get: jest.fn((field) => {
        const data = {
          permissionMappings: {
            'admin_group': ['admin_full', 'user_management'],
            'dept_sistemas': ['technical_access', 'system_support']
          },
          departmentPermissions: {
            'sistemas': ['technical_access', 'system_config'],
            'rrhh': ['employee_management', 'payroll_access']
          }
        };
        return data[field];
      })
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('OAuth Group to Permission Mapping (OAUTH-3-01)', () => {
    test('should inherit permissions from Google Groups correctly', async () => {
      const googleProfile = {
        ...mockOAuthProfile,
        groups: ['google_admin', 'dept_marketing']
      };

      const result = await permissionService.inheritPermissionsFromOAuth(
        mockUser, 
        googleProfile, 
        'google'
      );

      expect(result).toHaveInheritedPermissions(['admin_full', 'user_management', 'system_config']);
      expect(result.provider).toBe('google');
      expect(result.inheritanceMethod).toBe('groups');
    });

    test('should inherit permissions from Azure AD Groups correctly', async () => {
      const azureProfile = {
        ...mockOAuthProfile,
        groups: ['azure_global_admin', 'dept_finanzas']
      };

      const result = await permissionService.inheritPermissionsFromOAuth(
        mockUser, 
        azureProfile, 
        'microsoft'
      );

      expect(result).toHaveInheritedPermissions(['admin_full', 'compliance_admin', 'financial_access']);
      expect(result.provider).toBe('microsoft');
    });

    test('should handle users with multiple OAuth groups', async () => {
      const multiGroupProfile = {
        ...mockOAuthProfile,
        groups: ['google_admin', 'dept_sistemas', 'project_lead']
      };

      const result = await permissionService.inheritPermissionsFromOAuth(
        mockUser, 
        multiGroupProfile, 
        'google'
      );

      expect(result.inheritedPermissions).toEqual(
        expect.arrayContaining(['admin_full', 'technical_access', 'project_management'])
      );
    });

    test('should handle unknown OAuth groups gracefully', async () => {
      const unknownGroupProfile = {
        ...mockOAuthProfile,
        groups: ['unknown_group', 'another_unknown']
      };

      const result = await permissionService.inheritPermissionsFromOAuth(
        mockUser, 
        unknownGroupProfile, 
        'google'
      );

      expect(result.inheritedPermissions).toHaveLength(0);
      expect(result.warnings).toContain('Unknown OAuth groups found');
    });

    test('should respect permission hierarchy when inheriting', async () => {
      const result = await permissionService.inheritPermissionsFromOAuth(
        mockUser, 
        { ...mockOAuthProfile, groups: ['google_admin'] }, 
        'google'
      );

      expect(result).toRespectPermissionHierarchy('admin_full', 'basic_access');
    });
  });

  describe('Department-Specific Permissions (OAUTH-3-02)', () => {
    test('should add department permissions based on OAuth profile', async () => {
      mockUser.get.mockReturnValue('sistemas');
      
      const result = await inheritanceService.addDepartmentPermissions(
        mockUser, 
        mockOAuthProfile, 
        mockCorporateConfig
      );

      expect(result.departmentPermissions).toEqual(
        expect.arrayContaining(['technical_access', 'system_config'])
      );
      expect(result.department).toBe('sistemas');
    });

    test('should handle users with multiple departments', async () => {
      mockUser.get.mockImplementation((field) => {
        if (field === 'departments') return ['sistemas', 'rrhh'];
        if (field === 'primaryDepartment') return 'sistemas';
        return null;
      });

      const result = await inheritanceService.addDepartmentPermissions(
        mockUser, 
        mockOAuthProfile, 
        mockCorporateConfig
      );

      expect(result.allDepartmentPermissions).toEqual(
        expect.arrayContaining(['technical_access', 'employee_management'])
      );
      expect(result.primaryDepartment).toBe('sistemas');
    });

    test('should apply department permission hierarchy', async () => {
      mockUser.get.mockReturnValue('rrhh');

      const result = await inheritanceService.addDepartmentPermissions(
        mockUser, 
        mockOAuthProfile, 
        mockCorporateConfig
      );

      // HR department should have higher permissions than basic employee access
      expect(result).toRespectPermissionHierarchy('employee_management', 'basic_access');
    });
  });

  describe('Individual Permission Overrides (OAUTH-3-03)', () => {
    test('should apply individual permission overrides correctly', async () => {
      const mockOverrides = {
        add: ['special_project_access'],
        remove: ['basic_access'],
        elevate: ['temporary_admin']
      };

      mockUser.get.mockImplementation((field) => {
        if (field === 'permissionOverrides') return mockOverrides;
        return null;
      });

      const result = await inheritanceService.applyIndividualOverrides(mockUser);

      expect(result.addedPermissions).toContain('special_project_access');
      expect(result.removedPermissions).toContain('basic_access');
      expect(result.elevatedPermissions).toContain('temporary_admin');
    });

    test('should maintain OAuth coherence in overrides', async () => {
      const invalidOverrides = {
        add: ['super_admin_access'], // Invalid for non-admin user
        remove: ['required_oauth_permission']
      };

      mockUser.get.mockImplementation((field) => {
        if (field === 'permissionOverrides') return invalidOverrides;
        if (field === 'role') return 'user';
        return null;
      });

      const result = await inheritanceService.applyIndividualOverrides(mockUser);

      expect(result.validationErrors).toContain('Invalid permission elevation for user role');
      expect(result.coherenceViolations).toContain('Cannot remove required OAuth permission');
    });

    test('should log permission override changes for audit', async () => {
      const overrides = { add: ['special_access'] };
      mockUser.get.mockReturnValue(overrides);

      await inheritanceService.applyIndividualOverrides(mockUser);

      expect(logger.logSecurityEvent).toHaveBeenCalledWith(
        'PERMISSION_OVERRIDE_APPLIED',
        expect.objectContaining({
          userId: mockUser.id,
          overrides: overrides
        })
      );
    });
  });

  describe('Complete Permission Inheritance Process', () => {
    test('should process complete inheritance workflow correctly', async () => {
      mockUser.get.mockImplementation((field) => {
        const data = {
          'department': 'sistemas',
          'permissionOverrides': { add: ['project_lead'] }
        };
        return data[field];
      });

      const result = await inheritanceService.processCompleteInheritance(
        mockUser, 
        mockOAuthProfile, 
        'google', 
        mockCorporateConfig
      );

      expect(result.success).toBe(true);
      expect(result.finalPermissions).toEqual(
        expect.arrayContaining(['admin_full', 'technical_access', 'project_lead'])
      );
      expect(result.inheritanceSources).toEqual(['oauth', 'department', 'individual']);
    });

    test('should handle permission conflicts correctly', async () => {
      mockUser.get.mockImplementation((field) => {
        const data = {
          'department': 'rrhh',
          'permissionOverrides': { 
            add: ['technical_access'], // Conflict: HR user requesting technical access
            remove: ['employee_management'] // Removing core HR permission
          }
        };
        return data[field];
      });

      const result = await inheritanceService.processCompleteInheritance(
        mockUser, 
        { ...mockOAuthProfile, groups: ['dept_rrhh'] }, 
        'google', 
        mockCorporateConfig
      );

      expect(result.conflicts).toHaveLength(2);
      expect(result.resolution).toBe('department_priority'); // Department permissions take precedence
    });

    test('should validate final permissions against business rules', async () => {
      const result = await inheritanceService.validateAndResolvePermissions(
        mockUser,
        ['admin_full'],
        ['basic_access'],
        { add: ['user_management'] }
      );

      expect(result.isValid).toBe(true);
      expect(result.finalPermissions).not.toContain('basic_access'); // Should be overridden by admin_full
    });

    test('should generate inheritance audit trail', async () => {
      await inheritanceService.processCompleteInheritance(
        mockUser, 
        mockOAuthProfile, 
        'google', 
        mockCorporateConfig
      );

      // Should have audit trail for the inheritance process
      expect(mockUser).toHaveAuditTrail({
        action: 'permission_inheritance',
        permission: 'admin_full',
        timeRange: { hours: 1 }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle OAuth profile without groups', async () => {
      const noGroupProfile = { ...mockOAuthProfile, groups: undefined };

      const result = await permissionService.inheritPermissionsFromOAuth(
        mockUser, 
        noGroupProfile, 
        'google'
      );

      expect(result.inheritedPermissions).toHaveLength(0);
      expect(result.warnings).toContain('No OAuth groups found in profile');
    });

    test('should handle missing corporate configuration', async () => {
      const result = await inheritanceService.processCompleteInheritance(
        mockUser, 
        mockOAuthProfile, 
        'google', 
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing corporate configuration');
    });

    test('should handle database save failures gracefully', async () => {
      mockUser.save.mockRejectedValue(new Error('Database connection failed'));

      const result = await inheritanceService.processCompleteInheritance(
        mockUser, 
        mockOAuthProfile, 
        'google', 
        mockCorporateConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save permission inheritance');
    });

    test('should timeout on long-running permission calculations', async () => {
      // Mock a slow permission calculation
      jest.spyOn(permissionService, 'calculatePermissionHierarchy')
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10000)));

      const result = await inheritanceService.processCompleteInheritance(
        mockUser, 
        mockOAuthProfile, 
        'google', 
        mockCorporateConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission calculation timeout');
    }, 5000); // 5 second timeout for this test
  });
});