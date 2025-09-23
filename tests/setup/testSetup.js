/**
 * Test Setup Configuration for Amexing User Management API Tests
 * Configures Parse Server connection using MongoDB Atlas from .env.development
 * Creates test users and handles authentication for API endpoint testing
 */

const Parse = require('parse/node');
const path = require('path');

// Load environment variables from the development file
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

/**
 * Initialize Parse Server connection for tests
 */
async function setupParseConnection() {
  // Initialize Parse with development environment settings
  Parse.initialize(
    process.env.PARSE_APP_ID,
    null, // JavaScript key (not needed for server-side)
    process.env.PARSE_MASTER_KEY
  );

  Parse.serverURL = process.env.PARSE_SERVER_URL;

  console.log('Parse SDK initialized for testing with:');
  console.log('- App ID:', process.env.PARSE_APP_ID);
  console.log('- Server URL:', process.env.PARSE_SERVER_URL);
  console.log('- Database:', process.env.DATABASE_URI ? 'MongoDB Atlas Connected' : 'No Database URI');
}

/**
 * Test users for different scenarios
 */
const testUsers = {
  superadmin: {
    username: 'superadmin@dev.amexing.com',
    email: 'superadmin@dev.amexing.com',
    password: 'DevSuper2024!@#',
    firstName: 'Super',
    lastName: 'Administrator',
    role: 'superadmin',
    active: true,
    exists: true,
    emailVerified: true
  },
  admin: {
    username: 'admin@dev.amexing.com',
    email: 'admin@dev.amexing.com',
    password: 'DevAdmin2024!@#',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    active: true,
    exists: true,
    emailVerified: true
  },
  client: {
    username: 'client@test.amexing.com',
    email: 'client@test.amexing.com',
    password: 'TestClient2024!@#',
    firstName: 'Test',
    lastName: 'Client',
    role: 'client',
    active: true,
    exists: true,
    emailVerified: true,
    clientId: 'test-client-001'
  },
  employee: {
    username: 'employee@test.amexing.com',
    email: 'employee@test.amexing.com',
    password: 'TestEmployee2024!@#',
    firstName: 'Test',
    lastName: 'Employee',
    role: 'employee',
    active: true,
    exists: true,
    emailVerified: true,
    clientId: 'test-client-001',
    departmentId: 'test-dept-001'
  }
};

/**
 * Create or find test users in the database
 */
async function createTestUsers() {
  const createdUsers = {};

  for (const [key, userData] of Object.entries(testUsers)) {
    try {
      // Try to find existing user
      const AmexingUser = Parse.Object.extend('AmexingUser');
      const query = new Parse.Query(AmexingUser);
      query.equalTo('email', userData.email);

      let user = await query.first({ useMasterKey: true });

      if (!user) {
        // Create new user
        user = new AmexingUser();

        // Set user properties
        Object.keys(userData).forEach(key => {
          if (key !== 'password') {
            user.set(key, userData[key]);
          }
        });

        // Set password hash (in a real scenario, this would be hashed)
        user.set('passwordHash', userData.password); // Simplified for testing

        user = await user.save(null, { useMasterKey: true });
        console.log(`Created test user: ${userData.email}`);
      } else {
        console.log(`Found existing test user: ${userData.email}`);
      }

      createdUsers[key] = user;
    } catch (error) {
      console.error(`Error creating test user ${userData.email}:`, error);
      throw error;
    }
  }

  return createdUsers;
}

/**
 * Authenticate a test user and return JWT token
 */
async function authenticateTestUser(userType) {
  const userData = testUsers[userType];
  if (!userData) {
    throw new Error(`Unknown user type: ${userType}`);
  }

  try {
    // Use the authentication service to get a JWT token
    const AuthenticationService = require('../../src/application/services/AuthenticationService');
    const loginResult = await AuthenticationService.loginUser(userData.email, userData.password);

    if (loginResult.success) {
      return {
        user: loginResult.user,
        accessToken: loginResult.tokens.accessToken,
        refreshToken: loginResult.tokens.refreshToken
      };
    } else {
      throw new Error(`Authentication failed for ${userData.email}`);
    }
  } catch (error) {
    console.error(`Authentication error for ${userData.email}:`, error);
    throw error;
  }
}

/**
 * Clean up test data (optional, for test isolation)
 */
async function cleanupTestData() {
  try {
    const AmexingUser = Parse.Object.extend('AmexingUser');
    const query = new Parse.Query(AmexingUser);
    query.contains('email', '@test.amexing.com');

    const testUsers = await query.find({ useMasterKey: true });

    if (testUsers.length > 0) {
      await Parse.Object.destroyAll(testUsers, { useMasterKey: true });
      console.log(`Cleaned up ${testUsers.length} test users`);
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Main setup function for tests
 */
async function setupTests() {
  await setupParseConnection();
  const users = await createTestUsers();
  return users;
}

/**
 * Teardown function for tests
 */
async function teardownTests() {
  // Don't cleanup dev users, only test users
  await cleanupTestData();
}

module.exports = {
  setupParseConnection,
  createTestUsers,
  authenticateTestUser,
  cleanupTestData,
  setupTests,
  teardownTests,
  testUsers
};