/**
 * Global Setup for OAuth Testing
 * Prepares test environment for OAuth permission system tests
 */

const Parse = require('parse/node');
const { MongoClient } = require('mongodb');
const redis = require('redis');

module.exports = async () => {
  console.log('🔧 Setting up OAuth test environment...');

  // Initialize Parse SDK for testing
  Parse.initialize(
    process.env.PARSE_APPLICATION_ID,
    process.env.PARSE_JAVASCRIPT_KEY,
    process.env.PARSE_MASTER_KEY
  );
  
  Parse.serverURL = process.env.PARSE_SERVER_URL;

  try {
    // Setup test database
    console.log('📦 Connecting to test database...');
    const mongoClient = new MongoClient(process.env.DATABASE_URI);
    await mongoClient.connect();
    
    // Clean up any existing test data
    const db = mongoClient.db();
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      if (collection.name.includes('test') || collection.name.includes('oauth')) {
        await db.collection(collection.name).deleteMany({});
      }
    }

    // Create necessary indexes for performance
    await db.collection('AmexingUser').createIndex({ 'username': 1 });
    await db.collection('AmexingUser').createIndex({ 'email': 1 });
    await db.collection('AmexingUser').createIndex({ 'oauthAccounts.provider': 1, 'oauthAccounts.providerId': 1 });
    
    await db.collection('PermissionAudit').createIndex({ 'userId': 1, 'timestamp': -1 });
    await db.collection('PermissionAudit').createIndex({ 'action': 1, 'timestamp': -1 });
    
    await db.collection('PermissionContext').createIndex({ 'userId': 1, 'sessionId': 1 });
    await db.collection('PermissionDelegation').createIndex({ 'fromUserId': 1, 'isActive': 1 });
    await db.collection('PermissionDelegation').createIndex({ 'toUserId': 1, 'isActive': 1 });

    await mongoClient.close();
    console.log('✅ Test database setup completed');

    // Setup Redis for caching (if used)
    if (process.env.REDIS_URL) {
      console.log('🔄 Setting up Redis for test caching...');
      const redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
      await redisClient.flushDb(); // Clear test cache
      await redisClient.disconnect();
      console.log('✅ Redis setup completed');
    }

    // Create test corporate configurations
    console.log('🏢 Creating test corporate configurations...');
    const CorporateConfig = Parse.Object.extend('CorporateConfig');
    
    const testCorporateConfig = new CorporateConfig();
    testCorporateConfig.set('domain', 'company.com');
    testCorporateConfig.set('name', 'Test Company');
    testCorporateConfig.set('permissionMappings', {
      'google_admin': ['admin_full', 'user_management', 'system_config'],
      'azure_global_admin': ['admin_full', 'compliance_admin', 'user_management'],
      'dept_sistemas': ['technical_access', 'system_support'],
      'dept_rrhh': ['employee_management', 'payroll_access'],
      'dept_finanzas': ['financial_access', 'budget_management'],
      'dept_marketing': ['marketing_access', 'campaign_management']
    });
    testCorporateConfig.set('departmentPermissions', {
      'sistemas': ['technical_access', 'system_config', 'user_support'],
      'rrhh': ['employee_management', 'payroll_access', 'benefits_admin'],
      'finanzas': ['financial_access', 'budget_management', 'audit_read'],
      'marketing': ['marketing_access', 'campaign_management', 'social_media']
    });
    testCorporateConfig.set('isActive', true);
    await testCorporateConfig.save(null, { useMasterKey: true });

    // Create test OAuth provider configurations
    console.log('🔐 Setting up OAuth provider configurations...');
    const OAuthProviderConfig = Parse.Object.extend('OAuthProviderConfig');
    
    const googleConfig = new OAuthProviderConfig();
    googleConfig.set('provider', 'google');
    googleConfig.set('clientId', process.env.GOOGLE_CLIENT_ID);
    googleConfig.set('clientSecret', process.env.GOOGLE_CLIENT_SECRET);
    googleConfig.set('redirectUri', process.env.GOOGLE_REDIRECT_URI);
    googleConfig.set('scope', 'openid email profile');
    googleConfig.set('isActive', true);
    await googleConfig.save(null, { useMasterKey: true });

    const microsoftConfig = new OAuthProviderConfig();
    microsoftConfig.set('provider', 'microsoft');
    microsoftConfig.set('clientId', process.env.MICROSOFT_CLIENT_ID);
    microsoftConfig.set('clientSecret', process.env.MICROSOFT_CLIENT_SECRET);
    microsoftConfig.set('redirectUri', process.env.MICROSOFT_REDIRECT_URI);
    microsoftConfig.set('scope', 'openid email profile');
    microsoftConfig.set('isActive', true);
    await microsoftConfig.save(null, { useMasterKey: true });

    // Create test users with various permission scenarios
    console.log('👥 Creating test users...');
    const AmexingUser = Parse.Object.extend('AmexingUser');
    
    // Admin user
    const adminUser = new AmexingUser();
    adminUser.set('username', 'test-admin');
    adminUser.set('email', 'admin@company.com');
    adminUser.set('firstName', 'Test');
    adminUser.set('lastName', 'Admin');
    adminUser.set('role', 'admin');
    adminUser.set('department', 'sistemas');
    adminUser.set('oauthAccounts', [{
      provider: 'google',
      providerId: 'google-admin-123',
      email: 'admin@company.com',
      groups: ['google_admin', 'dept_sistemas']
    }]);
    await adminUser.save(null, { useMasterKey: true });

    // Multi-department user
    const multiDeptUser = new AmexingUser();
    multiDeptUser.set('username', 'test-multidept');
    multiDeptUser.set('email', 'multidept@company.com');
    multiDeptUser.set('firstName', 'Multi');
    multiDeptUser.set('lastName', 'Department');
    multiDeptUser.set('role', 'manager');
    multiDeptUser.set('department', 'sistemas');
    multiDeptUser.set('departments', ['sistemas', 'rrhh']);
    multiDeptUser.set('oauthAccounts', [{
      provider: 'microsoft',
      providerId: 'azure-manager-456',
      email: 'multidept@company.com',
      groups: ['dept_sistemas', 'dept_rrhh', 'manager_group']
    }]);
    await multiDeptUser.save(null, { useMasterKey: true });

    // Regular employee user
    const employeeUser = new AmexingUser();
    employeeUser.set('username', 'test-employee');
    employeeUser.set('email', 'employee@company.com');
    employeeUser.set('firstName', 'Test');
    employeeUser.set('lastName', 'Employee');
    employeeUser.set('role', 'employee');
    employeeUser.set('department', 'marketing');
    employeeUser.set('oauthAccounts', [{
      provider: 'google',
      providerId: 'google-employee-789',
      email: 'employee@company.com',
      groups: ['dept_marketing', 'employee_group']
    }]);
    await employeeUser.save(null, { useMasterKey: true });

    // Store test user IDs for reference in tests
    global.testUsers = {
      admin: adminUser.id,
      multiDept: multiDeptUser.id,
      employee: employeeUser.id
    };

    // Setup mock OAuth responses (if mocking is enabled)
    if (process.env.MOCK_OAUTH_RESPONSES === 'true') {
      console.log('🎭 Setting up OAuth response mocks...');
      global.oauthMocks = {
        google: {
          userInfo: {
            id: 'google-test-user',
            email: 'test@company.com',
            name: 'Test User',
            groups: ['google_admin', 'dept_sistemas']
          },
          accessToken: 'mock-google-access-token',
          refreshToken: 'mock-google-refresh-token'
        },
        microsoft: {
          userInfo: {
            id: 'azure-test-user',
            mail: 'test@company.com',
            displayName: 'Test User',
            groups: ['azure_global_admin', 'dept_finanzas']
          },
          accessToken: 'mock-microsoft-access-token',
          refreshToken: 'mock-microsoft-refresh-token'
        }
      };
    }

    console.log('✅ OAuth test environment setup completed successfully!');
    console.log(`📊 Created ${Object.keys(global.testUsers).length} test users`);
    console.log('🚀 Ready to run OAuth permission tests');

  } catch (error) {
    console.error('❌ Failed to set up OAuth test environment:', error);
    throw error;
  }
};