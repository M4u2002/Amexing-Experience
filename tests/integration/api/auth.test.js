/**
 * Authentication API Tests
 */

const request = require('supertest');
const app = require('../../../src/index');
const { setupTests, teardownTests, clearDatabase } = require('../../setup');
const { createTestUser } = require('../../helpers/testUtils');

describe('Authentication API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create test user
      const userData = {
        username: 'apitest',
        email: 'api@test.com',
        password: 'TestPass123!'
      };
      
      await createTestUser(userData);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: expect.objectContaining({
          username: userData.username
        }),
        sessionToken: expect.any(String)
      });
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpass'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
          // missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        user: expect.objectContaining({
          username: userData.username,
          email: userData.email
        }),
        sessionToken: expect.any(String)
      });
    });

    it('should reject duplicate username', async () => {
      const userData = {
        username: 'duplicate',
        email: 'duplicate@test.com',
        password: 'TestPass123!'
      };

      // Create first user
      await createTestUser(userData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          email: 'different@test.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@test.com',
          password: '123' // Too short
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'TestPass123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      // Create and login user
      const userData = {
        username: 'logouttest',
        email: 'logout@test.com',
        password: 'TestPass123!'
      };
      
      await createTestUser(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        });

      const sessionToken = loginResponse.body.sessionToken;

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('X-Parse-Session-Token', sessionToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String)
      });
    });

    it('should handle logout without session', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              username: 'test',
              password: 'test'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test
  });
});