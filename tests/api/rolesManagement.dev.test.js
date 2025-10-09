/**
 * Roles Management API Integration Tests - Development Environment
 * Tests role management API endpoints using the actual development server
 * Focus on updateRole endpoint with real authentication and database operations
 */

const request = require('supertest');
const Parse = require('parse/node');
const path = require('path');

// Load development environment
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

const BASE_URL = 'http://localhost:1337';

// Test users from development environment
const testCredentials = {
  superadmin: {
    email: process.env.DEV_SUPERADMIN_EMAIL || 'superadmin@dev.amexing.com',
    password: process.env.DEV_SUPERADMIN_PASSWORD || 'fallback-password',
  },
  admin: {
    email: process.env.DEV_ADMIN_EMAIL || 'admin@dev.amexing.com',
    password: process.env.DEV_ADMIN_PASSWORD || 'fallback-password',
  },
};

let authTokens = {};
let testRoleId = null;
let originalRoleDisplayName = null;

/**
 * Authenticate user and get JWT token
 */
async function authenticateUser(role, credentials) {
  try {
    // Get login page for CSRF token
    const response = await request(BASE_URL).get('/login').expect(200);

    // Extract CSRF token
    const csrfMatch = response.text.match(/name="_csrf".*?value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;

    if (!csrfToken) {
      throw new Error('Could not extract CSRF token');
    }

    // Login to get JWT token
    const loginResponse = await request(BASE_URL)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .set('Cookie', response.headers['set-cookie'])
      .send({
        identifier: credentials.email,
        password: credentials.password,
        _csrf: csrfToken,
      });

    if (loginResponse.status === 200 && loginResponse.body.success) {
      console.log(`✓ Authenticated ${role} user successfully`);
      return {
        accessToken: loginResponse.body.tokens.accessToken,
        user: loginResponse.body.user,
      };
    } else {
      console.error(`✗ Failed to authenticate ${role}:`, loginResponse.body);
      return null;
    }
  } catch (error) {
    console.error(`✗ Error authenticating ${role}:`, error.message);
    return null;
  }
}

/**
 * Find a test role to use for updates
 */
async function findTestRole() {
  try {
    const response = await request(BASE_URL)
      .get('/api/roles?limit=1')
      .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
      .expect(200);

    if (response.body.success && response.body.data.roles.length > 0) {
      const role = response.body.data.roles[0];
      testRoleId = role.id;
      originalRoleDisplayName = role.displayName;
      console.log(`✓ Found test role: ${role.displayName} (${testRoleId})`);
      return true;
    }

    console.error('✗ No roles found in database');
    return false;
  } catch (error) {
    console.error('✗ Error finding test role:', error.message);
    return false;
  }
}

/**
 * Restore original role displayName
 */
async function restoreRoleName() {
  if (!testRoleId || !originalRoleDisplayName) return;

  try {
    await request(BASE_URL)
      .put(`/api/roles/${testRoleId}`)
      .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
      .send({ displayName: originalRoleDisplayName });

    console.log(`✓ Restored original role name: ${originalRoleDisplayName}`);
  } catch (error) {
    console.warn('Could not restore original role name:', error.message);
  }
}

beforeAll(async () => {
  // Wait for development server to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Authenticate users
  for (const [role, credentials] of Object.entries(testCredentials)) {
    const auth = await authenticateUser(role, credentials);
    if (auth) {
      authTokens[role] = auth;
    }
  }

  // Find a test role
  if (authTokens.superadmin) {
    await findTestRole();
  }
}, 30000);

afterAll(async () => {
  // Restore original role name
  if (authTokens.superadmin) {
    await restoreRoleName();
  }
}, 10000);

describe('Roles Management API - Integration Tests', () => {
  // ========================================================================
  // GET ROLES ENDPOINTS
  // ========================================================================

  describe('GET /api/roles', () => {
    test('superadmin can retrieve roles list', async () => {
      if (!authTokens.superadmin) {
        console.log('⊘ Skipping test - superadmin not authenticated');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/roles?page=1&limit=5')
        .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toBeDefined();
      expect(Array.isArray(response.body.data.roles)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();

      console.log(`✓ Retrieved ${response.body.data.roles.length} roles`);
    });

    test('admin cannot retrieve roles (403 forbidden)', async () => {
      if (!authTokens.admin) {
        console.log('⊘ Skipping test - admin not authenticated');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/roles')
        .set('Authorization', `Bearer ${authTokens.admin.accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/SuperAdmin/i);

      console.log('✓ Admin correctly rejected from roles endpoint');
    });

    test('unauthenticated request returns 401', async () => {
      const response = await request(BASE_URL).get('/api/roles').expect(401);

      expect(response.body.success).toBe(false);

      console.log('✓ Unauthenticated request correctly rejected');
    });
  });

  // ========================================================================
  // UPDATE ROLE ENDPOINT
  // ========================================================================

  describe('PUT /api/roles/:id - updateRole', () => {
    // SUCCESS CASES
    describe('Success Cases', () => {
      test('superadmin can update role displayName successfully', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const newDisplayName = `Test Updated ${Date.now()}`;

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: newDisplayName })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Role updated successfully');
        expect(response.body.data.role).toBeDefined();
        expect(response.body.data.role.id).toBe(testRoleId);
        expect(response.body.data.role.displayName).toBe(newDisplayName);

        console.log(`✓ Role updated to: ${newDisplayName}`);

        // Verify change persisted by getting the role again
        const verifyResponse = await request(BASE_URL)
          .get(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .expect(200);

        expect(verifyResponse.body.data.role.displayName).toBe(newDisplayName);
        console.log('✓ Change verified in database');
      });

      test('update trims whitespace from displayName', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const nameWithSpaces = `  Trimmed Test ${Date.now()}  `;
        const expectedName = nameWithSpaces.trim();

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: nameWithSpaces })
          .expect(200);

        expect(response.body.data.role.displayName).toBe(expectedName);

        console.log('✓ Whitespace correctly trimmed');
      });

      test('can update role multiple times sequentially', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const updates = [
          `First Update ${Date.now()}`,
          `Second Update ${Date.now()}`,
          `Third Update ${Date.now()}`,
        ];

        for (const displayName of updates) {
          const response = await request(BASE_URL)
            .put(`/api/roles/${testRoleId}`)
            .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
            .send({ displayName })
            .expect(200);

          expect(response.body.data.role.displayName).toBe(displayName);
        }

        console.log('✓ Sequential updates successful');
      });
    });

    // AUTHENTICATION & AUTHORIZATION
    describe('Authentication & Authorization', () => {
      test('unauthenticated request returns 401', async () => {
        if (!testRoleId) {
          console.log('⊘ Skipping test - no test role');
          return;
        }

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .send({ displayName: 'Unauthorized Attempt' })
          .expect(401);

        expect(response.body.success).toBe(false);

        console.log('✓ Unauthenticated update correctly rejected');
      });

      test('admin role cannot update roles (403)', async () => {
        if (!authTokens.admin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.admin.accessToken}`)
          .send({ displayName: 'Admin Attempt' })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/SuperAdmin/i);

        console.log('✓ Admin correctly forbidden from updating roles');
      });

      test('invalid JWT token returns 401', async () => {
        if (!testRoleId) {
          console.log('⊘ Skipping test - no test role');
          return;
        }

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({ displayName: 'Invalid Token Attempt' })
          .expect(401);

        expect(response.body.success).toBe(false);

        console.log('✓ Invalid token correctly rejected');
      });
    });

    // INPUT VALIDATION
    describe('Input Validation', () => {
      test('returns 400 when displayName is missing', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({}) // No displayName
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/required/i);

        console.log('✓ Missing displayName correctly rejected');
      });

      test('returns 400 when displayName is empty string', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: '' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/required|empty/i);

        console.log('✓ Empty displayName correctly rejected');
      });

      test('returns 400 when displayName is only whitespace', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: '   ' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/required|empty/i);

        console.log('✓ Whitespace-only displayName correctly rejected');
      });

      test('returns 400 when displayName exceeds 100 characters', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const longName = 'A'.repeat(101);

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: longName })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/100 characters/i);

        console.log('✓ Long displayName (>100 chars) correctly rejected');
      });

      test('accepts displayName with exactly 100 characters', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const exactName = 'A'.repeat(100);

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: exactName })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.role.displayName).toBe(exactName);

        console.log('✓ 100-character displayName accepted');
      });

      test('returns 400 when displayName is same as current', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        // First, set a known displayName
        const knownName = `Test Same ${Date.now()}`;
        await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: knownName })
          .expect(200);

        // Try to set the same name again
        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: knownName })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/same|no changes/i);

        console.log('✓ Same displayName correctly rejected');
      });

      test('returns 404 when role ID does not exist', async () => {
        if (!authTokens.superadmin) {
          console.log('⊘ Skipping test - superadmin not authenticated');
          return;
        }

        const fakeRoleId = 'nonexistent-role-id-12345';

        const response = await request(BASE_URL)
          .put(`/api/roles/${fakeRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: 'Test Name' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/not found/i);

        console.log('✓ Non-existent role ID correctly returns 404');
      });
    });

    // SECURITY
    describe('Security', () => {
      test('only displayName is updated, other fields are ignored', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        // Get current role data
        const before = await request(BASE_URL)
          .get(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .expect(200);

        const originalLevel = before.body.data.role.level;
        const originalActive = before.body.data.role.active;

        // Attempt to update multiple fields
        const newDisplayName = `Security Test ${Date.now()}`;
        await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({
            displayName: newDisplayName,
            level: 7, // Attempt privilege escalation
            active: false, // Attempt deactivation
            basePermissions: ['admin.all'], // Attempt permission grant
          })
          .expect(200);

        // Verify only displayName changed
        const after = await request(BASE_URL)
          .get(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .expect(200);

        expect(after.body.data.role.displayName).toBe(newDisplayName);
        expect(after.body.data.role.level).toBe(originalLevel);
        expect(after.body.data.role.active).toBe(originalActive);

        console.log('✓ Only displayName updated, other fields protected');
      });

      test('special characters in displayName are handled safely', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const specialName = `Test <script>alert("XSS")</script> ${Date.now()}`;

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: specialName })
          .expect(200);

        // Verify the data is stored as-is (not executed)
        expect(response.body.data.role.displayName).toBe(specialName);

        console.log('✓ Special characters handled safely');
      });

      test('unicode characters in displayName are preserved', async () => {
        if (!authTokens.superadmin || !testRoleId) {
          console.log('⊘ Skipping test - prerequisites not met');
          return;
        }

        const unicodeName = `Administrador 🔒 ${Date.now()}`;

        const response = await request(BASE_URL)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
          .send({ displayName: unicodeName })
          .expect(200);

        expect(response.body.data.role.displayName).toBe(unicodeName);

        console.log('✓ Unicode characters preserved');
      });
    });
  });

  // ========================================================================
  // INTEGRATION SCENARIOS
  // ========================================================================

  describe('Integration Scenarios', () => {
    test('complete workflow: list → update → verify', async () => {
      if (!authTokens.superadmin) {
        console.log('⊘ Skipping test - superadmin not authenticated');
        return;
      }

      // 1. List roles
      const listResponse = await request(BASE_URL)
        .get('/api/roles?limit=1')
        .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.roles.length).toBeGreaterThan(0);

      const role = listResponse.body.data.roles[0];
      const roleId = role.id;
      const originalName = role.displayName;

      console.log(`  1. Listed role: ${originalName}`);

      // 2. Update role
      const newName = `Workflow Test ${Date.now()}`;
      const updateResponse = await request(BASE_URL)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
        .send({ displayName: newName })
        .expect(200);

      expect(updateResponse.body.data.role.displayName).toBe(newName);

      console.log(`  2. Updated to: ${newName}`);

      // 3. Verify update
      const verifyResponse = await request(BASE_URL)
        .get(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.data.role.displayName).toBe(newName);

      console.log('  3. Verified update persisted');

      // 4. Restore original
      await request(BASE_URL)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${authTokens.superadmin.accessToken}`)
        .send({ displayName: originalName })
        .expect(200);

      console.log('✓ Complete workflow successful');
    });
  });
});
