# Testing Guide

## 🧪 Testing Strategy

AmexingWeb follows a comprehensive testing approach with **security-first** mindset for PCI DSS compliance.

## 🚀 Quick Testing Commands

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage

# Run specific test suites
yarn test:unit           # Unit tests only
yarn test:integration    # Integration tests only
yarn test:security       # Security-focused tests

# Comprehensive validation
yarn test:full-validation  # Security + startup + tests
```

## 📁 Test Structure

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── controllers/         # Controller logic tests
│   ├── middleware/          # Middleware functionality
│   └── helpers/            # Utility function tests
├── integration/             # Database + API tests
│   ├── api/                # API endpoint tests
│   ├── security/           # Security integration tests
│   └── application.startup.test.js  # Full app startup
├── helpers/                 # Test utilities
│   └── testUtils.js        # Common test helpers
└── setup.js                # Test environment setup
```

## 🔒 Security Testing (PCI DSS)

### Security Test Suite
```bash
# Run security-specific tests
yarn test:security

# Validate application startup
yarn test:startup
```

**Security tests cover**:
- ✅ Authentication and authorization
- ✅ Input validation and sanitization
- ✅ Session management
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Audit logging

### Example Security Test
```javascript
// tests/security/authentication.test.js
describe('Authentication Security', () => {
  it('should reject weak passwords', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: '123',  // Weak password
        email: 'test@example.com'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Password must be at least 12 characters');
  });
});
```

## 📊 Unit Testing

### Writing Unit Tests
```javascript
// tests/unit/controllers/authController.test.js
const authController = require('../../../src/application/controllers/authController');

describe('AuthController', () => {
  it('should render login page', async () => {
    const mockReq = { method: 'GET' };
    const mockRes = { render: jest.fn() };
    
    await authController.login(mockReq, mockRes);
    
    expect(mockRes.render).toHaveBeenCalledWith('auth/login', {
      title: 'Login - AmexingWeb',
      error: null
    });
  });
});
```

### Test Utilities
```javascript
// Use provided test helpers
const { createMockRequest, createMockResponse } = require('../../helpers/testUtils');

const mockReq = createMockRequest({
  body: { username: 'test', password: 'password123' }
});
const mockRes = createMockResponse();
```

## 🔌 Integration Testing

### API Testing
```bash
# Test API endpoints
yarn test tests/integration/api/
```

### Database Testing
```javascript
// Automatic test database setup
describe('User Management', () => {
  beforeEach(async () => {
    // Test database is automatically created
    await clearTestDatabase();
  });
  
  it('should create user in database', async () => {
    const user = await createTestUser({
      username: 'testuser',
      email: 'test@example.com'
    });
    
    expect(user.id).toBeDefined();
  });
});
```

## 📈 Coverage Requirements

### Coverage Targets (PCI DSS Compliance)
- **Overall**: 85% minimum
- **Security functions**: 95% minimum
- **Controllers**: 90% minimum
- **Middleware**: 95% minimum

### View Coverage Report
```bash
# Generate detailed coverage
yarn test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

## ⚡ Performance Testing

### Load Testing
```bash
# Install k6 for load testing
brew install k6

# Run basic load test
k6 run tests/performance/basic-load.js
```

### Memory Testing
```javascript
// Check for memory leaks in tests
describe('Memory Management', () => {
  it('should not leak memory during user operations', async () => {
    const initialMemory = process.memoryUsage();
    
    // Perform operations
    for (let i = 0; i < 1000; i++) {
      await createTestUser();
    }
    
    const finalMemory = process.memoryUsage();
    expect(finalMemory.heapUsed).toBeLessThan(initialMemory.heapUsed * 2);
  });
});
```

## 🔧 Test Configuration

### Jest Configuration
Configuration is located in `.config/jest/jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',  // Exclude main entry point
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};
```

### Environment Variables
Tests use separate environment:
```env
NODE_ENV=test
TEST_DATABASE_URI=mongodb://localhost:27017/AmexingTEST
PARSE_APP_ID=test-app-id
PARSE_MASTER_KEY=test-master-key
```

## 🚨 Test Debugging

### Debug Failing Tests
```bash
# Run with verbose output
yarn test --verbose

# Run specific test file
yarn test tests/unit/controllers/authController.test.js

# Debug with Node.js inspector
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Common Test Issues

1. **Database connection errors**:
   ```bash
   # Ensure test database is accessible
   mongosh mongodb://localhost:27017/AmexingTEST
   ```

2. **Parse Server initialization**:
   ```bash
   # Check test Parse Server configuration
   cat tests/setup.js
   ```

3. **Async timing issues**:
   ```javascript
   // Use proper async/await in tests
   it('should handle async operations', async () => {
     await expect(asyncOperation()).resolves.toBeDefined();
   });
   ```

## ✅ Testing Best Practices

### Security Testing
- ✅ Test all authentication flows
- ✅ Validate input sanitization
- ✅ Test authorization boundaries
- ✅ Verify audit logging works
- ✅ Test session management

### General Testing
- ✅ Write tests before fixing bugs
- ✅ Keep tests simple and focused
- ✅ Use descriptive test names
- ✅ Clean up test data after each test
- ✅ Mock external dependencies

### CI/CD Integration
Tests run automatically on:
- ✅ Every PR (GitHub Actions)
- ✅ Before deployment
- ✅ Scheduled security scans

For continuous testing setup, see: [DEPLOYMENT.md](./DEPLOYMENT.md#testing-in-cicd)