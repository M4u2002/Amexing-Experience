/**
 * Synthetic User Data Generator
 * Generates PCI DSS compliant synthetic user data for OAuth testing
 */

const crypto = require('crypto');

class SyntheticUserGenerator {
  constructor() {
    this.testDomains = [
      'amexing-test.com',
      'test-transport.mx',
      'oauth-testing.local',
      'synthetic-data.test'
    ];

    this.departments = [
      'Technology',
      'Operations',
      'Sales',
      'Marketing',
      'Finance',
      'Human Resources',
      'Customer Service',
      'Legal',
      'Procurement',
      'Quality Assurance'
    ];

    this.roles = [
      'employee',
      'manager',
      'admin',
      'super_admin',
      'event_organizer',
      'finance_manager',
      'operations_lead',
      'customer_success'
    ];

    this.firstNames = [
      'Test', 'Demo', 'Sample', 'Mock', 'Synthetic',
      'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
      'Usuario', 'Prueba', 'Ejemplo', 'Simulado'
    ];

    this.lastNames = [
      'User', 'Account', 'Profile', 'Person', 'Member',
      'Employee', 'Manager', 'Admin', 'Tester', 'Data',
      'Persona', 'Empleado', 'Gerente', 'Administrador'
    ];

    this.corporateIds = [
      'TEST_CORP_001', 'TEST_CORP_002', 'TEST_CORP_003',
      'DEMO_COMPANY_001', 'SYNTHETIC_ORG_001', 'MOCK_ENTERPRISE_001',
      'AMEXING_TEST_001', 'TRANSPORT_TEST_001'
    ];
  }

  /**
   * Generate a single synthetic user
   */
  generateUser(overrides = {}) {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    const domain = this.getRandomElement(this.testDomains);
    
    const baseUser = {
      // Basic identification
      id: `test_user_${timestamp}_${randomSuffix}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@${domain}`,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${timestamp}`,
      
      // Personal information
      firstName: firstName,
      lastName: lastName,
      fullName: `${firstName} ${lastName}`,
      
      // Role and permissions
      role: this.getRandomElement(this.roles),
      status: this.getRandomStatus(),
      
      // Corporate information
      corporateId: this.getRandomElement(this.corporateIds),
      department: this.getRandomElement(this.departments),
      employeeId: `EMP_${timestamp}_${randomSuffix.toUpperCase()}`,
      
      // Contact information (synthetic)
      phone: this.generateSyntheticPhone(),
      
      // OAuth accounts (empty by default)
      oauthAccounts: [],
      
      // Profile data
      profile: {
        avatar: `https://synthetic-avatars.test/avatar_${randomSuffix}.png`,
        timezone: this.getRandomTimezone(),
        language: this.getRandomLanguage(),
        bio: `Synthetic test user for OAuth testing - ${timestamp}`
      },
      
      // Permissions
      permissions: this.generatePermissions(),
      
      // Preferences
      preferences: {
        theme: this.getRandomElement(['light', 'dark', 'auto']),
        notifications: {
          email: Math.random() > 0.5,
          push: Math.random() > 0.5,
          sms: false // Always false for test data
        },
        language: this.getRandomLanguage(),
        dateFormat: this.getRandomElement(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
        timeFormat: this.getRandomElement(['12h', '24h'])
      },
      
      // Security fields
      isEmailVerified: Math.random() > 0.2, // 80% verified
      twoFactorEnabled: Math.random() > 0.7, // 30% with 2FA
      
      // Timestamps
      createdAt: new Date(timestamp - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random date in last 30 days
      updatedAt: new Date(timestamp),
      lastLogin: new Date(timestamp - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // Random date in last 7 days
      passwordChangedAt: new Date(timestamp - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)), // Random date in last 90 days
      
      // Metadata
      metadata: {
        source: 'synthetic_generator',
        version: '1.0',
        generatedAt: new Date(timestamp).toISOString(),
        testSession: crypto.randomBytes(8).toString('hex')
      }
    };

    return { ...baseUser, ...overrides };
  }

  /**
   * Generate multiple synthetic users
   */
  generateUsers(count, baseOverrides = {}) {
    const users = [];
    
    for (let i = 0; i < count; i++) {
      const userOverrides = {
        ...baseOverrides,
        metadata: {
          ...baseOverrides.metadata,
          batchIndex: i,
          batchSize: count
        }
      };
      
      users.push(this.generateUser(userOverrides));
    }
    
    return users;
  }

  /**
   * Generate user with specific OAuth provider
   */
  generateUserWithOAuth(provider, userOverrides = {}, oauthOverrides = {}) {
    const user = this.generateUser(userOverrides);
    const oauthAccount = this.generateOAuthAccount(provider, oauthOverrides);
    
    user.oauthAccounts = [oauthAccount];
    user.email = oauthAccount.email; // Use OAuth email as primary
    
    return user;
  }

  /**
   * Generate OAuth account data
   */
  generateOAuthAccount(provider, overrides = {}) {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    
    const baseAccount = {
      provider: provider,
      providerId: `${provider}_test_${timestamp}_${randomSuffix}`,
      email: this.generateOAuthEmail(provider),
      displayName: `Test ${this.capitalizeProvider(provider)} User`,
      accessToken: this.generateMockToken(`${provider}_access_${timestamp}`),
      refreshToken: this.generateMockToken(`${provider}_refresh_${timestamp}`),
      tokenType: 'Bearer',
      expiresAt: new Date(timestamp + 3600000), // 1 hour from now
      scope: this.getProviderScope(provider),
      profileData: this.generateProviderProfileData(provider),
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
      lastUsed: new Date(timestamp),
      metadata: {
        tokenVersion: '1.0',
        source: 'synthetic_generator'
      }
    };

    return { ...baseAccount, ...overrides };
  }

  /**
   * Generate corporate user with specific hierarchy
   */
  generateCorporateUser(corporateId, role = 'employee', overrides = {}) {
    const user = this.generateUser({
      corporateId: corporateId,
      role: role,
      ...overrides
    });

    // Add corporate-specific permissions
    if (role === 'manager' || role === 'admin') {
      user.permissions.canManageTeam = true;
      user.permissions.canCreateEvents = true;
      user.permissions.canAccessReports = true;
    }

    if (role === 'admin' || role === 'super_admin') {
      user.permissions.canManageUsers = true;
      user.permissions.canAccessFinance = true;
    }

    return user;
  }

  /**
   * Generate family of related users (same corporate)
   */
  generateUserFamily(corporateId, count = 5) {
    const roles = ['admin', 'manager', 'employee', 'employee', 'event_organizer'];
    const users = [];

    for (let i = 0; i < Math.min(count, roles.length); i++) {
      users.push(this.generateCorporateUser(corporateId, roles[i], {
        metadata: {
          familyIndex: i,
          familySize: count,
          familyId: crypto.randomBytes(8).toString('hex')
        }
      }));
    }

    return users;
  }

  /**
   * Generate OAuth email for specific provider
   */
  generateOAuthEmail(provider) {
    const timestamp = Date.now();
    const providerDomains = {
      google: 'gmail.com',
      microsoft: 'outlook.com',
      apple: 'icloud.com'
    };

    const domain = providerDomains[provider] || 'example.com';
    return `test.oauth.${provider}.${timestamp}@${domain}`;
  }

  /**
   * Generate provider-specific profile data
   */
  generateProviderProfileData(provider) {
    const timestamp = Date.now();
    
    const profiles = {
      google: {
        id: `google_${timestamp}`,
        verified_email: true,
        picture: 'https://example.com/google-avatar.jpg',
        locale: 'en',
        hd: 'amexing-test.com'
      },
      microsoft: {
        id: `microsoft_${timestamp}`,
        userPrincipalName: this.generateOAuthEmail('microsoft'),
        jobTitle: 'Test Engineer',
        officeLocation: 'Test Office',
        businessPhones: [this.generateSyntheticPhone()],
        mobilePhone: this.generateSyntheticPhone()
      },
      apple: {
        sub: `apple_${timestamp}`,
        email_verified: true,
        real_user_status: 1
      }
    };

    return profiles[provider] || {};
  }

  /**
   * Generate synthetic phone number
   */
  generateSyntheticPhone() {
    // Use clearly synthetic pattern
    const areaCode = '555'; // Reserved for fictional use
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    
    return `+1${areaCode}${exchange}${number}`;
  }

  /**
   * Generate permissions based on role
   */
  generatePermissions() {
    const basePermissions = {
      canLogin: true,
      canViewProfile: true,
      canUpdateProfile: true,
      canCreateEvents: false,
      canManageUsers: false,
      canAccessReports: false,
      canManageTeam: false,
      canAccessFinance: false,
      canViewAnalytics: false,
      canExportData: false
    };

    // Random additional permissions
    const additionalPermissions = [
      'canViewAnalytics',
      'canExportData',
      'canCreateEvents'
    ];

    additionalPermissions.forEach(permission => {
      if (Math.random() > 0.7) {
        basePermissions[permission] = true;
      }
    });

    return basePermissions;
  }

  /**
   * Generate mock token
   */
  generateMockToken(prefix) {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomBytes}`;
  }

  /**
   * Get provider scope
   */
  getProviderScope(provider) {
    const scopes = {
      google: 'openid profile email',
      microsoft: 'openid profile email User.Read',
      apple: 'name email'
    };
    return scopes[provider] || 'openid profile email';
  }

  /**
   * Utility methods
   */
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomStatus() {
    return this.getRandomElement(['active', 'pending', 'suspended']);
  }

  getRandomTimezone() {
    return this.getRandomElement([
      'America/Mexico_City',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Asia/Tokyo'
    ]);
  }

  getRandomLanguage() {
    return this.getRandomElement(['es', 'en', 'fr', 'de', 'pt']);
  }

  capitalizeProvider(provider) {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  /**
   * Validate that generated data is synthetic
   */
  validateSyntheticData(userData) {
    const syntheticIndicators = [
      userData.email.includes('test'),
      userData.email.includes('synthetic'),
      userData.email.includes('mock'),
      userData.username.includes('test'),
      userData.firstName.includes('Test'),
      userData.metadata && userData.metadata.source === 'synthetic_generator'
    ];

    const hasSyntheticIndicators = syntheticIndicators.some(indicator => indicator);
    
    if (!hasSyntheticIndicators) {
      throw new Error('Generated data does not appear to be synthetic - PCI DSS compliance violation');
    }

    return true;
  }

  /**
   * Generate bulk test data for performance testing
   */
  generateBulkData(count, options = {}) {
    const { 
      providers = ['google', 'microsoft', 'apple'],
      corporateIds = this.corporateIds,
      includeOAuth = true 
    } = options;

    const users = [];
    
    for (let i = 0; i < count; i++) {
      let user;
      
      if (includeOAuth && Math.random() > 0.3) { // 70% chance of OAuth
        const provider = this.getRandomElement(providers);
        user = this.generateUserWithOAuth(provider);
      } else {
        user = this.generateUser();
      }

      // Assign corporate ID
      user.corporateId = this.getRandomElement(corporateIds);
      
      // Add bulk metadata
      user.metadata.bulkIndex = i;
      user.metadata.bulkSize = count;
      user.metadata.bulkGenerated = true;

      users.push(user);
    }

    return users;
  }

  /**
   * Export user data in different formats
   */
  exportUsers(users, format = 'json') {
    switch (format) {
      case 'json':
        return JSON.stringify(users, null, 2);
      
      case 'csv':
        return this.convertToCSV(users);
      
      case 'minimal':
        return users.map(user => ({
          id: user.id,
          email: user.email,
          role: user.role,
          corporateId: user.corporateId
        }));
      
      default:
        return users;
    }
  }

  /**
   * Convert users to CSV format
   */
  convertToCSV(users) {
    if (users.length === 0) return '';

    const headers = ['id', 'email', 'firstName', 'lastName', 'role', 'corporateId', 'department'];
    const csvRows = [headers.join(',')];

    users.forEach(user => {
      const row = headers.map(header => {
        const value = user[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

module.exports = SyntheticUserGenerator;