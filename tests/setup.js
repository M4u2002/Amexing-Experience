/**
 * Test Setup Configuration
 * Sets up test environment for Parse Server and database testing
 */

const { ParseServer } = require('parse-server');
const Parse = require('parse/node');

// Test configuration
const testConfig = {
  databaseURI: process.env.TEST_DATABASE_URI || 'mongodb://localhost:27017/AmexingTEST',
  appId: 'test-app-id',
  masterKey: 'test-master-key',
  serverURL: 'http://localhost:1338/parse',
  port: 1338,
  silent: true,
  logLevel: 'error',
  maxUploadSize: '1mb',
};

let parseServer;

/**
 * Setup test environment before running tests
 */
const setupTests = async () => {
  try {
    // Initialize Parse Server for testing
    parseServer = new ParseServer(testConfig);
    await parseServer.start();

    // Initialize Parse SDK
    Parse.initialize(testConfig.appId, null, testConfig.masterKey);
    Parse.serverURL = testConfig.serverURL;

    console.log('Test environment setup complete');
    return parseServer;
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
};

/**
 * Cleanup test environment after tests
 */
const teardownTests = async () => {
  try {
    if (parseServer) {
      await parseServer.handleShutdown();
      console.log('Test environment cleaned up');
    }
  } catch (error) {
    console.error('Failed to cleanup test environment:', error);
  }
};

/**
 * Clear test database
 */
const clearDatabase = async () => {
  try {
    const schemas = await Parse.Schema.all();
    
    for (const schema of schemas) {
      if (schema.className.startsWith('_')) continue; // Skip system classes
      
      const query = new Parse.Query(schema.className);
      const objects = await query.find({ useMasterKey: true });
      
      if (objects.length > 0) {
        await Parse.Object.destroyAll(objects, { useMasterKey: true });
      }
    }
    
    console.log('Test database cleared');
  } catch (error) {
    console.error('Failed to clear test database:', error);
  }
};

module.exports = {
  setupTests,
  teardownTests,
  clearDatabase,
  testConfig,
};