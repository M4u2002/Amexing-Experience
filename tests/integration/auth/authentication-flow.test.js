/**
 * Authentication Flow Integration Tests
 * Tests for complete authentication workflows including registration, login, and token management
 * 
 * @author Amexing Development Team  
 * @version 1.0.0
 * @created 2024-09-12
 */

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Parse = require('parse/node');
const app = require('../../../src/index');
const AmexingUser = require('../../../src/domain/models/AmexingUser');

describe('Authentication Flow Integration Tests', () => {
  let mongoServer;
  let parseServer;

  beforeAll(async () => {
    // Start in-memory MongoDB for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Initialize Parse for testing
    Parse.initialize(
      process.env.PARSE_APP_ID || 'test-app-id',
      null,
      process.env.PARSE_MASTER_KEY || 'test-master-key'
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1338/parse';
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear the database before each test
    try {
      const query = new Parse.Query(AmexingUser);
      const users = await query.find({ useMasterKey: true });
      if (users.length > 0) {
        await Parse.Object.destroyAll(users, { useMasterKey: true });
      }
    } catch (error) {
      // Ignore errors if collection doesn't exist
    }
  });

  describe('User Registration Flow', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should successfully register a new user via API', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.message).toBe('User registered successfully');
      
      // Should set authentication cookies
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(cookie => cookie.includes('accessToken'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('refreshToken'))).toBe(true);
    });

    it('should fail registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/auth/register')
        .send({ ...validUserData, username: 'differentuser' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email already exists');
    });

    it('should fail registration with duplicate username', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same username
      const response = await request(app)
        .post('/auth/register')
        .send({ ...validUserData, email: 'different@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Username already exists');
    });

    it('should fail registration with mismatched passwords', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ ...validUserData, confirmPassword: 'DifferentPassword123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Passwords do not match');
    });

    it('should fail registration with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ 
          ...validUserData, 
          password: 'weak',
          confirmPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password validation failed');
    });

    it('should fail registration with missing required fields', async () => {
      const incompleteData = { ...validUserData };
      delete incompleteData.firstName;

      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('All fields are required');
    });
  });

  describe('User Login Flow', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);
    });

    it('should successfully login with username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          identifier: 'testuser',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.message).toBe('Login successful');
      
      // Should set authentication cookies
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(cookie => cookie.includes('accessToken'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('refreshToken'))).toBe(true);
    });

    it('should successfully login with email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should fail login with incorrect password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          identifier: 'testuser',
          password: 'WrongPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail login with non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          identifier: 'nonexistent',
          password: 'TestPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail login with missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          identifier: 'testuser'
          // Missing password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Identifier and password are required');
    });
  });

  describe('Token Management Flow', () => {
    let userCookies;

    beforeEach(async () => {
      // Register and login a user to get tokens
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const loginResponse = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Extract cookies from login response
      userCookies = loginResponse.headers['set-cookie'];
    });

    it('should successfully refresh tokens', async () => {
      // Extract refresh token from cookies
      const refreshTokenCookie = userCookies.find(cookie => cookie.includes('refreshToken'));
      expect(refreshTokenCookie).toBeDefined();

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      
      // Should set new authentication cookies
      expect(response.headers['set-cookie']).toBeDefined();
      const newCookies = response.headers['set-cookie'];
      expect(newCookies.some(cookie => cookie.includes('accessToken'))).toBe(true);
      expect(newCookies.some(cookie => cookie.includes('refreshToken'))).toBe(true);
    });

    it('should fail token refresh without refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Refresh token required');
    });

    it('should successfully logout user', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
      
      // Should clear authentication cookies
      expect(response.headers['set-cookie']).toBeDefined();
      const clearedCookies = response.headers['set-cookie'];
      expect(clearedCookies.some(cookie => cookie.includes('accessToken=;'))).toBe(true);
      expect(clearedCookies.some(cookie => cookie.includes('refreshToken=;'))).toBe(true);
    });
  });

  describe('Protected Route Access', () => {
    let userCookies;

    beforeEach(async () => {
      // Register and login a user to get tokens
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const loginResponse = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      userCookies = loginResponse.headers['set-cookie'];
    });

    it('should access protected API routes with valid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Cookie', userCookies)
        .expect(200);

      // Response format depends on apiController implementation
      expect(response.body).toBeDefined();
    });

    it('should deny access to protected API routes without token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      // Create a user for password reset tests
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);
    });

    it('should successfully initiate password reset', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset link has been sent');
      // In development, reset token is returned for testing
      expect(response.body.resetToken).toBeDefined();
    });

    it('should return success message for non-existent email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If the email exists');
    });

    it('should successfully reset password with valid token', async () => {
      // First, initiate password reset
      const resetInitResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      const resetToken = resetInitResponse.body.resetToken;

      // Then, reset password with token
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password has been reset successfully');

      // Verify that login works with new password
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          identifier: 'testuser',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail password reset with invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired reset token');
    });

    it('should fail password reset with mismatched passwords', async () => {
      // First, initiate password reset
      const resetInitResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      const resetToken = resetInitResponse.body.resetToken;

      // Then, try to reset with mismatched passwords
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Passwords do not match');
    });
  });
});