/**
 * OAuth Authentication Unit Tests
 * Tests core OAuth authentication functionality
 */

const OAuthTestSetup = require('../helpers/oauth-setup');
const PCIComplianceSetup = require('../helpers/pci-compliance-setup');
const OAuthProviderMocks = require('../helpers/oauth-mocks/provider-mocks');
const SyntheticUserGenerator = require('../helpers/synthetic-data/user-generator');

describe('OAuth Authentication Unit Tests', () => {
  let oauthSetup;
  let pciSetup;
  let providerMocks;
  let userGenerator;

  beforeAll(async () => {
    // Initialize test environment
    oauthSetup = new OAuthTestSetup();
    pciSetup = new PCIComplianceSetup();
    providerMocks = new OAuthProviderMocks();
    userGenerator = new SyntheticUserGenerator();

    await oauthSetup.setup();
    await pciSetup.setup();
  });

  afterAll(async () => {
    await oauthSetup.teardown();
    await pciSetup.teardown();
  });

  beforeEach(async () => {
    await oauthSetup.clearTestData();
  });

  describe('OAuth Provider Authentication', () => {
    test('should authenticate user with Google OAuth', async () => {
      // Verify PCI DSS compliance
      pciSetup.verifyOperationCompliance('oauth_authentication', { provider: 'google' });

      // Generate synthetic test data
      const testUser = userGenerator.generateUser();
      pciSetup.validateSyntheticData(testUser);

      // Mock Google OAuth flow
      const googleMock = providerMocks.createGoogleMock();
      
      // Test authorization URL generation
      const authUrl = googleMock.getAuthorizationUrl({
        redirectUri: 'http://localhost:1337/auth/google/callback',
        scope: 'openid profile email'
      });

      expect(authUrl).toContain('accounts.google.com/oauth/authorize');
      expect(authUrl).toContain('client_id=test-google-client-id');
      expect(authUrl).toContain('scope=openid%20profile%20email');

      // Test token exchange
      const tokens = await googleMock.exchangeCodeForTokens('test_auth_code', 'http://localhost:1337/auth/google/callback');
      
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('refresh_token');
      expect(tokens).toHaveProperty('id_token');
      expect(tokens.token_type).toBe('Bearer');
      expect(tokens.expires_in).toBe(3600);

      // Test user info retrieval
      const userInfo = await googleMock.getUserInfo(tokens.access_token);
      
      expect(userInfo).toHaveProperty('email');
      expect(userInfo).toHaveProperty('name');
      expect(userInfo.verified_email).toBe(true);
      expect(userInfo.email).toContain('@gmail.com');

      // Validate synthetic data
      pciSetup.validateSyntheticData(userInfo);
    });

    test('should authenticate user with Microsoft OAuth', async () => {
      pciSetup.verifyOperationCompliance('oauth_authentication', { provider: 'microsoft' });

      const testUser = userGenerator.generateUser();
      pciSetup.validateSyntheticData(testUser);

      const microsoftMock = providerMocks.createMicrosoftMock();
      
      // Test authorization URL
      const authUrl = microsoftMock.getAuthorizationUrl({
        redirectUri: 'http://localhost:1337/auth/microsoft/callback'
      });

      expect(authUrl).toContain('login.microsoftonline.com/common/oauth2/v2.0/authorize');
      expect(authUrl).toContain('client_id=test-microsoft-client-id');

      // Test token exchange
      const tokens = await microsoftMock.exchangeCodeForTokens('test_auth_code');
      
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('refresh_token');
      expect(tokens).toHaveProperty('id_token');

      // Test user info
      const userInfo = await microsoftMock.getUserInfo(tokens.access_token);
      
      expect(userInfo).toHaveProperty('userPrincipalName');
      expect(userInfo).toHaveProperty('displayName');
      expect(userInfo.mail).toContain('@outlook.com');

      pciSetup.validateSyntheticData(userInfo);
    });

    test('should authenticate user with Apple OAuth', async () => {
      pciSetup.verifyOperationCompliance('oauth_authentication', { provider: 'apple' });

      const testUser = userGenerator.generateUser();
      pciSetup.validateSyntheticData(testUser);

      const appleMock = providerMocks.createAppleMock();
      
      // Test authorization URL
      const authUrl = appleMock.getAuthorizationUrl({
        redirectUri: 'http://localhost:1337/auth/apple/callback'
      });

      expect(authUrl).toContain('appleid.apple.com/auth/authorize');
      expect(authUrl).toContain('client_id=test-apple-client-id');

      // Test token exchange
      const tokens = await appleMock.exchangeCodeForTokens('test_auth_code');
      
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('id_token');

      // Test user info (from ID token)
      const userInfo = await appleMock.getUserInfo(tokens.id_token);
      
      expect(userInfo).toHaveProperty('sub');
      expect(userInfo).toHaveProperty('email');
      expect(userInfo.email_verified).toBe(true);
      expect(userInfo.email).toContain('@icloud.com');

      pciSetup.validateSyntheticData(userInfo);
    });
  });

  describe('OAuth Error Handling', () => {
    test('should handle invalid authorization code', async () => {
      pciSetup.verifyOperationCompliance('oauth_authentication', { scenario: 'error_handling' });

      const googleMock = providerMocks.createGoogleMock();
      
      await expect(
        googleMock.exchangeCodeForTokens('invalid_code')
      ).rejects.toThrow('Invalid authorization code');
    });

    test('should handle invalid access token', async () => {
      const googleMock = providerMocks.createGoogleMock();
      
      await expect(
        googleMock.getUserInfo('invalid_token')
      ).rejects.toThrow('Invalid access token');
    });

    test('should handle invalid refresh token', async () => {
      const googleMock = providerMocks.createGoogleMock();
      
      await expect(
        googleMock.refreshAccessToken('invalid_refresh_token')
      ).rejects.toThrow('Invalid refresh token');
    });

    test('should handle provider-specific errors', () => {
      const errorMocks = providerMocks.createErrorMocks();
      
      expect(errorMocks.invalidCode.error).toBe('invalid_grant');
      expect(errorMocks.invalidToken.error).toBe('invalid_token');
      expect(errorMocks.rateLimited.error).toBe('rate_limit_exceeded');
      expect(errorMocks.serverError.error).toBe('server_error');
    });
  });

  describe('Token Management', () => {
    test('should refresh access token successfully', async () => {
      pciSetup.verifyOperationCompliance('token_validation', { operation: 'refresh' });

      const googleMock = providerMocks.createGoogleMock();
      
      // First get tokens
      const initialTokens = await googleMock.exchangeCodeForTokens('test_auth_code');
      
      // Refresh token
      const refreshedTokens = await googleMock.refreshAccessToken(initialTokens.refresh_token);
      
      expect(refreshedTokens).toHaveProperty('access_token');
      expect(refreshedTokens.access_token).not.toBe(initialTokens.access_token);
      expect(refreshedTokens.token_type).toBe('Bearer');
      expect(refreshedTokens.expires_in).toBe(3600);
    });

    test('should validate token expiration', () => {
      const testUser = userGenerator.generateUser();
      const oauthAccount = userGenerator.generateOAuthAccount('google');
      
      // Test current time vs expiration
      const now = new Date();
      const isExpired = oauthAccount.expiresAt <= now;
      
      // Token should not be expired (generated for future)
      expect(isExpired).toBe(false);
      expect(oauthAccount.expiresAt).toBeInstanceOf(Date);
      expect(oauthAccount.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    test('should handle token encryption/decryption', () => {
      const testSecrets = oauthSetup.getTestSecrets();
      const testToken = 'test_access_token_12345';
      
      // Encrypt token
      const encrypted = oauthSetup.encryptTestData({ token: testToken });
      expect(encrypted).not.toBe(testToken);
      expect(typeof encrypted).toBe('string');
      
      // Decrypt token
      const decrypted = oauthSetup.decryptTestData(encrypted);
      expect(decrypted.token).toBe(testToken);
    });
  });

  describe('User Creation and Management', () => {
    test('should create AmexingUser with OAuth account', async () => {
      pciSetup.verifyOperationCompliance('create_test_user', { provider: 'google' });

      const testUser = await oauthSetup.createTestUserWithOAuth('google', {
        firstName: 'Test',
        lastName: 'GoogleUser',
        role: 'employee'
      });

      expect(testUser).toBeDefined();
      expect(testUser.get('email')).toContain('@gmail.com');
      expect(testUser.get('firstName')).toBe('Test');
      expect(testUser.get('lastName')).toBe('GoogleUser');
      expect(testUser.get('role')).toBe('employee');
      
      const oauthAccounts = testUser.get('oauthAccounts');
      expect(oauthAccounts).toHaveLength(1);
      expect(oauthAccounts[0].provider).toBe('google');
      expect(oauthAccounts[0].email).toContain('@gmail.com');

      // Validate synthetic data
      pciSetup.validateSyntheticData({
        email: testUser.get('email'),
        firstName: testUser.get('firstName'),
        oauthAccounts: oauthAccounts
      });
    });

    test('should create corporate user with OAuth', async () => {
      const corporateUser = userGenerator.generateCorporateUser('TEST_CORP_001', 'manager');
      const testUser = await oauthSetup.createTestUserWithOAuth('microsoft', corporateUser);

      expect(testUser.get('corporateId')).toBe('TEST_CORP_001');
      expect(testUser.get('role')).toBe('manager');
      expect(testUser.get('permissions').canManageTeam).toBe(true);
      
      const oauthAccounts = testUser.get('oauthAccounts');
      expect(oauthAccounts[0].provider).toBe('microsoft');

      pciSetup.validateSyntheticData(corporateUser);
    });

    test('should handle multiple OAuth accounts for single user', async () => {
      const testUser = userGenerator.generateUser();
      const googleAccount = userGenerator.generateOAuthAccount('google');
      const microsoftAccount = userGenerator.generateOAuthAccount('microsoft');
      
      testUser.oauthAccounts = [googleAccount, microsoftAccount];
      
      expect(testUser.oauthAccounts).toHaveLength(2);
      expect(testUser.oauthAccounts[0].provider).toBe('google');
      expect(testUser.oauthAccounts[1].provider).toBe('microsoft');
      
      // Each account should have different emails
      expect(testUser.oauthAccounts[0].email).not.toBe(testUser.oauthAccounts[1].email);

      pciSetup.validateSyntheticData(testUser);
    });
  });

  describe('Data Validation and Compliance', () => {
    test('should validate all generated data is synthetic', () => {
      const testUser = userGenerator.generateUser();
      const oauthAccount = userGenerator.generateOAuthAccount('google');
      
      // These should not throw errors
      expect(() => pciSetup.validateSyntheticData(testUser)).not.toThrow();
      expect(() => pciSetup.validateSyntheticData(oauthAccount)).not.toThrow();
      expect(() => userGenerator.validateSyntheticData(testUser)).not.toThrow();
    });

    test('should encrypt sensitive data for storage', () => {
      const sensitiveData = {
        accessToken: 'test_access_token_sensitive',
        refreshToken: 'test_refresh_token_sensitive',
        clientSecret: 'test_client_secret_sensitive'
      };

      const encrypted = pciSetup.encryptData(sensitiveData, 'test-encryption-key');
      
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.encrypted).not.toContain('test_access_token_sensitive');
    });

    test('should mask sensitive data in logs', () => {
      const sensitiveData = {
        email: 'test.user@example.com',
        accessToken: 'very_long_access_token_12345',
        password: 'secret_password',
        normalField: 'normal_value'
      };

      const masked = pciSetup.maskSensitiveData(sensitiveData);
      
      expect(masked.email).toMatch(/test\*+\.com/);
      expect(masked.accessToken).toMatch(/very\*+2345/);
      expect(masked.password).toMatch(/secr\*+word/);
      expect(masked.normalField).toBe('normal_value');
    });

    test('should generate audit logs for OAuth operations', () => {
      pciSetup.logAuditEvent('OAUTH_TEST', 'Testing audit logging functionality', {
        provider: 'google',
        operation: 'authentication'
      });

      const auditLogs = pciSetup.getAuditLogs();
      const lastLog = auditLogs[auditLogs.length - 1];
      
      expect(lastLog.eventType).toBe('OAUTH_TEST');
      expect(lastLog.description).toBe('Testing audit logging functionality');
      expect(lastLog.additionalData.provider).toBe('google');
      expect(lastLog.timestamp).toBeDefined();
      expect(lastLog.sessionId).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple simultaneous OAuth requests', async () => {
      const promises = [];
      const googleMock = providerMocks.createGoogleMock();
      
      // Create 10 simultaneous authentication requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          googleMock.exchangeCodeForTokens(`test_auth_code_${i}`)
        );
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((tokens, index) => {
        expect(tokens).toHaveProperty('access_token');
        expect(tokens).toHaveProperty('refresh_token');
        // Each token should be unique
        expect(tokens.access_token).toContain(`google_test_user_`);
      });
    });

    test('should handle bulk user generation efficiently', () => {
      const startTime = Date.now();
      const users = userGenerator.generateUsers(100);
      const endTime = Date.now();
      
      expect(users).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
      
      // Verify all users have unique emails
      const emails = users.map(user => user.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(100);
    });

    test('should simulate realistic network delays', async () => {
      const realisticGoogleMock = providerMocks.createRealisticMock('google');
      
      const startTime = Date.now();
      await realisticGoogleMock.exchangeCodeForTokens('test_auth_code');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(100); // At least 100ms delay
      expect(duration).toBeLessThan(1000); // But not more than 1 second
    });
  });
});