/**
 * Simplified Jest Configuration for OAuth Testing
 * Basic configuration for running OAuth permission tests
 */

const baseConfig = require('./jest.config');

module.exports = {
  // Inherit from base config
  ...baseConfig,
  
  // Test environment
  displayName: 'OAuth Permission Tests',
  
  // OAuth-specific test patterns  
  testMatch: [
    '**/tests/oauth/**/*.test.js'
  ],
  
  // Ignore patterns specific to OAuth testing
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    '/tests/oauth/helpers/mocks/',
    '/tests/oauth/fixtures/',
    '/tests/oauth/deprecated/'
  ],
  
  // Timeout for OAuth flows
  testTimeout: 45000,
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/oauth/helpers/custom-matchers.js'
  ],
  
  // Environment setup
  setupFiles: [
    '<rootDir>/tests/jest.env.js',
    '<rootDir>/tests/oauth/oauth.env.js'
  ],
  
  // Module name mapping
  moduleNameMapper: {
    '^@oauth/(.*)$': '<rootDir>/src/oauth/$1',
    '^@oauth-tests/(.*)$': '<rootDir>/tests/oauth/$1'
  },
  
  // Transform configuration  
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test environment
  testEnvironment: 'node',
  
  // Additional Jest options
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Sequential execution for integration tests
  maxWorkers: process.env.CI ? 1 : '50%',
  
  // Detect issues
  detectOpenHandles: true,
  detectLeaks: true,
  
  // Fail fast in CI
  bail: process.env.CI ? 1 : false,
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/application/services/OAuth*.js',
    'src/application/services/Permission*.js',
    'src/cloud/functions/oauth-*.js',
    '!src/**/*.test.js',
    '!src/**/*.mock.js'
  ],
  
  // Coverage thresholds for OAuth code
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75, 
      lines: 75,
      statements: 75
    }
  },
  
  // Simple reporter
  reporters: ['default'],
  
  // Disable problematic features for now
  watchPathIgnorePatterns: [
    '<rootDir>/reports/',
    '<rootDir>/coverage/',
    '<rootDir>/logs/',
    '<rootDir>/node_modules/'
  ]
};