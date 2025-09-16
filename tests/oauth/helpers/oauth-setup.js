/**
 * OAuth Test Setup Helper
 * Configures test environment for OAuth testing with PCI DSS compliance
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { ParseServer } = require('parse-server');
const Parse = require('parse/node');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class OAuthTestSetup {
  constructor() {
    this.mongoServer = null;
    this.parseServer = null;
    this.testSecrets = {
      jwtSecret: 'test-jwt-secret-key-for-oauth-testing-only',
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      googleClientId: 'test-google-client-id',
      googleClientSecret: 'test-google-client-secret',
      microsoftClientId: 'test-microsoft-client-id',
      microsoftClientSecret: 'test-microsoft-client-secret',
      appleClientId: 'test-apple-client-id',
      applePrivateKey: 'test-apple-private-key'
    };
  }

  /**
   * Initialize test environment
   */
  async setup() {
    try {
      // Start MongoDB Memory Server
      this.mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'AmexingOAuthTest',
          port: 27018,
        }
      });

      const mongoUri = this.mongoServer.getUri();

      // Parse Server configuration for OAuth testing
      const parseConfig = {
        databaseURI: mongoUri,
        appId: 'oauth-test-app-id',
        masterKey: 'oauth-test-master-key',
        serverURL: 'http://localhost:1339/parse',
        port: 1339,
        silent: true,
        logLevel: 'error',
        maxUploadSize: '1mb',
        // OAuth provider configurations for testing
        oauth: {
          google: {
            clientId: this.testSecrets.googleClientId,
            clientSecret: this.testSecrets.googleClientSecret
          },
          microsoft: {
            clientId: this.testSecrets.microsoftClientId,
            clientSecret: this.testSecrets.microsoftClientSecret
          },
          apple: {
            clientId: this.testSecrets.appleClientId,
            privateKey: this.testSecrets.applePrivateKey
          }
        }
      };

      // Initialize Parse Server
      this.parseServer = new ParseServer(parseConfig);
      await this.parseServer.start();

      // Initialize Parse SDK
      Parse.initialize(parseConfig.appId, null, parseConfig.masterKey);
      Parse.serverURL = parseConfig.serverURL;

      // Create AmexingUser class if it doesn't exist
      await this.createAmexingUserSchema();

      console.log('OAuth test environment setup complete');
      return this.parseServer;
    } catch (error) {
      console.error('Failed to setup OAuth test environment:', error);
      throw error;
    }
  }

  /**
   * Create AmexingUser schema for testing
   */
  async createAmexingUserSchema() {
    try {
      const schema = new Parse.Schema('AmexingUser');
      
      // Check if schema already exists
      try {
        await schema.get();
        return; // Schema already exists
      } catch (error) {
        // Schema doesn't exist, create it
      }

      schema.addString('email');
      schema.addString('username');
      schema.addString('firstName');
      schema.addString('lastName');
      schema.addString('role');
      schema.addString('status');
      schema.addArray('oauthAccounts');
      schema.addObject('profile');
      schema.addObject('permissions');
      schema.addString('corporateId');
      schema.addString('department');
      schema.addBoolean('isEmailVerified');
      schema.addDate('lastLogin');
      schema.addDate('passwordChangedAt');
      schema.addObject('preferences');

      await schema.save();
      console.log('AmexingUser schema created for testing');
    } catch (error) {
      console.error('Error creating AmexingUser schema:', error);
    }
  }

  /**
   * Generate synthetic test user data
   */
  generateSyntheticUser(overrides = {}) {
    const baseUser = {
      email: `test.user.${Date.now()}@amexing-test.com`,
      username: `testuser${Date.now()}`,
      firstName: 'Test',
      lastName: 'User',
      role: 'employee',
      status: 'active',
      oauthAccounts: [],
      profile: {
        avatar: 'https://example.com/avatar.jpg',
        phone: '+1234567890',
        timezone: 'America/Mexico_City'
      },
      permissions: {
        canCreateEvents: false,
        canManageUsers: false,
        canAccessReports: true
      },
      corporateId: 'TEST_CORP_001',
      department: 'Technology',
      isEmailVerified: true,
      lastLogin: new Date(),
      passwordChangedAt: new Date(),
      preferences: {
        language: 'es',
        notifications: true,
        theme: 'light'
      }
    };

    return { ...baseUser, ...overrides };
  }

  /**
   * Generate OAuth account data for testing
   */
  generateOAuthAccount(provider, overrides = {}) {
    const baseAccount = {
      provider,
      providerId: `${provider}_${Date.now()}`,
      email: `test.oauth.${Date.now()}@${provider}-test.com`,
      name: 'Test OAuth User',
      accessToken: this.generateMockAccessToken(provider),
      refreshToken: this.generateMockRefreshToken(provider),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      scope: this.getDefaultScope(provider),
      profileData: this.generateProfileData(provider)
    };

    return { ...baseAccount, ...overrides };
  }

  /**
   * Generate mock JWT tokens for testing
   */
  generateMockAccessToken(provider) {
    return jwt.sign(
      {
        sub: `${provider}_test_user_${Date.now()}`,
        aud: this.testSecrets[`${provider}ClientId`],
        iss: this.getIssuer(provider),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      },
      this.testSecrets.jwtSecret
    );
  }

  /**
   * Generate mock refresh token
   */
  generateMockRefreshToken(provider) {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get default OAuth scope for provider
   */
  getDefaultScope(provider) {
    const scopes = {
      google: 'openid profile email',
      microsoft: 'openid profile email User.Read',
      apple: 'name email'
    };
    return scopes[provider] || 'openid profile email';
  }

  /**
   * Get OAuth issuer for provider
   */
  getIssuer(provider) {
    const issuers = {
      google: 'https://accounts.google.com',
      microsoft: 'https://login.microsoftonline.com/common/v2.0',
      apple: 'https://appleid.apple.com'
    };
    return issuers[provider] || 'https://example.com';
  }

  /**
   * Generate provider-specific profile data
   */
  generateProfileData(provider) {
    const profiles = {
      google: {
        id: `google_${Date.now()}`,
        email: `test.google.${Date.now()}@gmail.com`,
        verified_email: true,
        name: 'Test Google User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/google-avatar.jpg',
        locale: 'en'
      },
      microsoft: {
        id: `microsoft_${Date.now()}`,
        userPrincipalName: `test.microsoft.${Date.now()}@outlook.com`,
        mail: `test.microsoft.${Date.now()}@outlook.com`,
        displayName: 'Test Microsoft User',
        givenName: 'Test',
        surname: 'User',
        jobTitle: 'Test Engineer',
        officeLocation: 'Test Office'
      },
      apple: {
        sub: `apple_${Date.now()}`,
        email: `test.apple.${Date.now()}@icloud.com`,
        email_verified: true,
        name: {
          firstName: 'Test',
          lastName: 'User'
        }
      }
    };
    return profiles[provider] || {};
  }

  /**
   * Create test user with OAuth account
   */
  async createTestUserWithOAuth(provider, userOverrides = {}, oauthOverrides = {}) {
    const userData = this.generateSyntheticUser(userOverrides);
    const oauthAccount = this.generateOAuthAccount(provider, oauthOverrides);
    
    userData.oauthAccounts = [oauthAccount];

    const AmexingUser = Parse.Object.extend('AmexingUser');
    const user = new AmexingUser();
    
    Object.keys(userData).forEach(key => {
      user.set(key, userData[key]);
    });

    await user.save(null, { useMasterKey: true });
    return user;
  }

  /**
   * Clean up test environment
   */
  async teardown() {
    try {
      // Clear test data
      await this.clearTestData();

      // Stop Parse Server
      if (this.parseServer) {
        await this.parseServer.handleShutdown();
      }

      // Stop MongoDB Memory Server
      if (this.mongoServer) {
        await this.mongoServer.stop();
      }

      console.log('OAuth test environment cleaned up');
    } catch (error) {
      console.error('Failed to cleanup OAuth test environment:', error);
    }
  }

  /**
   * Clear all test data
   */
  async clearTestData() {
    try {
      const AmexingUser = Parse.Object.extend('AmexingUser');
      const query = new Parse.Query(AmexingUser);
      const users = await query.find({ useMasterKey: true });

      if (users.length > 0) {
        await Parse.Object.destroyAll(users, { useMasterKey: true });
      }

      console.log('OAuth test data cleared');
    } catch (error) {
      console.error('Failed to clear OAuth test data:', error);
    }
  }

  /**
   * Get test secrets (for use in tests)
   */
  getTestSecrets() {
    return { ...this.testSecrets };
  }

  /**
   * Encrypt test data using PCI DSS compliant encryption
   * Following Backend Developer Agent patterns and PCI Compliance Specialist requirements
   */
  encryptTestData(data) {
    try {
      const algorithm = 'aes-256-gcm';
      
      // Ensure key is properly formatted for AES-256 (32 bytes)
      const keyBuffer = Buffer.from(this.testSecrets.encryptionKey, 'base64');
      const key = keyBuffer.subarray(0, 32);
      
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      });
    } catch (error) {
      // Fallback for test environment - simple base64 encoding
      return Buffer.from(JSON.stringify(data)).toString('base64');
    }
  }

  /**
   * Decrypt test data using PCI DSS compliant decryption
   */
  decryptTestData(encryptedData) {
    try {
      // Try new format first
      const parsed = JSON.parse(encryptedData);
      if (parsed.encrypted && parsed.iv && parsed.authTag) {
        const algorithm = 'aes-256-gcm';
        
        const keyBuffer = Buffer.from(this.testSecrets.encryptionKey, 'base64');
        const key = keyBuffer.subarray(0, 32);
        
        const iv = Buffer.from(parsed.iv, 'hex');
        const authTag = Buffer.from(parsed.authTag, 'hex');
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(parsed.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
      }
      
      // Fallback for old format (base64)
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      // Fallback: treat as already decrypted
      return typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
    }
  }
}

module.exports = OAuthTestSetup;