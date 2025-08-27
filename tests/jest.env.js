/**
 * Jest Environment Setup
 * Sets environment variables for testing
 */

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Load test environment variables
require('dotenv').config({
  path: '.env.test'
});

// Override specific test configurations
process.env.PARSE_APP_ID = 'test-app-id';
process.env.PARSE_MASTER_KEY = 'test-master-key';
process.env.PARSE_SERVER_URL = 'http://localhost:1338/parse';
process.env.DATABASE_URI = process.env.TEST_DATABASE_URI || 'mongodb://localhost:27017/AmexingTEST';
process.env.PORT = '1338';
process.env.LOG_LEVEL = 'error';

// Disable certain features during testing
process.env.ENABLE_MONITORING = 'false';
process.env.ENABLE_AUDIT_LOGGING = 'false';

console.log('Test environment configured');
console.log('Database URI:', process.env.DATABASE_URI);
console.log('Parse Server URL:', process.env.PARSE_SERVER_URL);