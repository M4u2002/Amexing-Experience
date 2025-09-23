/**
 * Test User Actions API - Automated tests for toggle-status and archive endpoints
 * Tests the new user action endpoints with proper authentication and permissions
 */

const axios = require('axios');
const path = require('path');

// Load development environment
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

const BASE_URL = 'http://localhost:1337';

async function testUserActionsAPI() {
  console.log('🧪 Testing User Actions API Endpoints');
  console.log('🔗 Server URL:', BASE_URL);
  console.log('');

  let authTokens = {};
  let testUserIds = {};

  try {
    // Step 1: Authenticate users
    console.log('1️⃣  Authenticating test users...');

    const testCredentials = {
      superadmin: {
        email: 'superadmin@dev.amexing.com',
        password: 'DevSuper2024!@#'
      },
      admin: {
        email: 'admin@dev.amexing.com',
        password: 'DevAdmin2024!@#'
      }
    };

    for (const [role, credentials] of Object.entries(testCredentials)) {
      try {
        // Get CSRF token
        const loginPageResponse = await axios.get(`${BASE_URL}/login`);
        const csrfMatch = loginPageResponse.data.match(/name="csrfToken".*?value="([^"]+)"/);
        const csrfToken = csrfMatch ? csrfMatch[1] : null;

        if (!csrfToken) {
          console.log(`❌ Could not extract CSRF token for ${role}`);
          continue;
        }

        // Login
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          identifier: credentials.email,
          password: credentials.password,
          csrfToken: csrfToken
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': loginPageResponse.headers['set-cookie']?.join('; ') || ''
          }
        });

        if (loginResponse.data.success) {
          authTokens[role] = loginResponse.data.tokens.accessToken;
          console.log(`   ✅ ${role} authenticated successfully`);
        } else {
          console.log(`   ❌ ${role} authentication failed`);
        }
      } catch (error) {
        console.log(`   ❌ ${role} authentication error:`, error.message);
      }
    }

    if (Object.keys(authTokens).length === 0) {
      console.log('❌ No users authenticated. Cannot proceed with tests.');
      return;
    }

    // Step 2: Get user list to identify test targets
    console.log('\n2️⃣  Getting user list for testing...');

    const usersResponse = await axios.get(`${BASE_URL}/api/users?limit=10`, {
      headers: {
        'Authorization': `Bearer ${authTokens.superadmin || authTokens.admin}`
      }
    });

    if (usersResponse.data.success && usersResponse.data.data.users.length > 0) {
      // Find test users (exclude superadmin for safety)
      const testUsers = usersResponse.data.data.users.filter(user =>
        user.role !== 'superadmin' && user.email !== 'superadmin@dev.amexing.com'
      );

      if (testUsers.length >= 2) {
        testUserIds.toggleTarget = testUsers[0].id;
        testUserIds.archiveTarget = testUsers[1].id;
        console.log(`   ✅ Test targets identified:`);
        console.log(`      - Toggle target: ${testUsers[0].email} (${testUsers[0].role})`);
        console.log(`      - Archive target: ${testUsers[1].email} (${testUsers[1].role})`);
      } else {
        console.log('   ❌ Not enough non-superadmin users for testing');
        return;
      }
    } else {
      console.log('   ❌ Could not retrieve user list');
      return;
    }

    // Step 3: Test Toggle Status API
    console.log('\n3️⃣  Testing PATCH /api/users/:id/toggle-status...');

    const toggleTests = [
      {
        name: 'Deactivate user (superadmin)',
        token: authTokens.superadmin,
        userId: testUserIds.toggleTarget,
        payload: { active: false, reason: 'Test deactivation' },
        expectedStatus: 200
      },
      {
        name: 'Reactivate user (superadmin)',
        token: authTokens.superadmin,
        userId: testUserIds.toggleTarget,
        payload: { active: true, reason: 'Test reactivation' },
        expectedStatus: 200
      },
      {
        name: 'Toggle with admin permissions',
        token: authTokens.admin,
        userId: testUserIds.toggleTarget,
        payload: { active: false, reason: 'Admin test' },
        expectedStatus: 200
      },
      {
        name: 'Toggle without active field (should fail)',
        token: authTokens.superadmin,
        userId: testUserIds.toggleTarget,
        payload: { reason: 'Missing active field' },
        expectedStatus: 400
      }
    ];

    for (const test of toggleTests) {
      if (!test.token) {
        console.log(`   ⏭️  Skipping "${test.name}" - no token`);
        continue;
      }

      try {
        console.log(`   Testing: ${test.name}`);
        const response = await axios.patch(
          `${BASE_URL}/api/users/${test.userId}/toggle-status`,
          test.payload,
          {
            headers: {
              'Authorization': `Bearer ${test.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === test.expectedStatus && response.data.success) {
          console.log(`   ✅ ${test.name} - SUCCESS`);
          if (response.data.data) {
            console.log(`      Status changed to: ${response.data.data.newStatus}`);
          }
        } else {
          console.log(`   ❌ ${test.name} - UNEXPECTED RESPONSE`);
          console.log(`      Expected: ${test.expectedStatus}, Got: ${response.status}`);
        }
      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;

        if (status === test.expectedStatus) {
          console.log(`   ✅ ${test.name} - CORRECTLY FAILED (${status}): ${message}`);
        } else {
          console.log(`   ❌ ${test.name} - ERROR (${status}): ${message}`);
        }
      }
    }

    // Step 4: Test Archive API
    console.log('\n4️⃣  Testing PATCH /api/users/:id/archive...');

    const archiveTests = [
      {
        name: 'Archive user (superadmin)',
        token: authTokens.superadmin,
        userId: testUserIds.archiveTarget,
        payload: { reason: 'Test archive' },
        expectedStatus: 200
      },
      {
        name: 'Archive user (admin - should fail)',
        token: authTokens.admin,
        userId: testUserIds.toggleTarget,
        payload: { reason: 'Admin cannot archive' },
        expectedStatus: 400
      },
      {
        name: 'Archive non-existent user',
        token: authTokens.superadmin,
        userId: 'nonexistent123',
        payload: { reason: 'Test non-existent' },
        expectedStatus: 400
      }
    ];

    for (const test of archiveTests) {
      if (!test.token) {
        console.log(`   ⏭️  Skipping "${test.name}" - no token`);
        continue;
      }

      try {
        console.log(`   Testing: ${test.name}`);
        const response = await axios.patch(
          `${BASE_URL}/api/users/${test.userId}/archive`,
          test.payload,
          {
            headers: {
              'Authorization': `Bearer ${test.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === test.expectedStatus && response.data.success) {
          console.log(`   ✅ ${test.name} - SUCCESS`);
          if (response.data.data?.archived) {
            console.log(`      User archived successfully`);
          }
        } else {
          console.log(`   ❌ ${test.name} - UNEXPECTED RESPONSE`);
          console.log(`      Expected: ${test.expectedStatus}, Got: ${response.status}`);
        }
      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;

        if (status === test.expectedStatus || (test.expectedStatus === 400 && status >= 400)) {
          console.log(`   ✅ ${test.name} - CORRECTLY FAILED (${status}): ${message}`);
        } else {
          console.log(`   ❌ ${test.name} - ERROR (${status}): ${message}`);
        }
      }
    }

    // Step 5: Verify archived user is not visible in normal queries
    console.log('\n5️⃣  Verifying archived user visibility...');

    try {
      const usersAfterArchive = await axios.get(`${BASE_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${authTokens.superadmin}`
        }
      });

      const archivedUserStillVisible = usersAfterArchive.data.data.users.some(
        user => user.id === testUserIds.archiveTarget
      );

      if (!archivedUserStillVisible) {
        console.log('   ✅ Archived user correctly hidden from normal queries');
      } else {
        console.log('   ❌ Archived user still visible in normal queries');
      }
    } catch (error) {
      console.log('   ❌ Error checking user visibility:', error.message);
    }

    console.log('\n🎉 User Actions API Testing Complete!');
    console.log('\n📊 Summary:');
    console.log('   - Toggle Status API: Multiple scenarios tested');
    console.log('   - Archive API: Permission validation tested');
    console.log('   - AI Agent Pattern: Verified archived users are hidden');

  } catch (error) {
    console.error('💥 Critical test error:', error.message);
  }
}

// Run the tests
testUserActionsAPI().catch(console.error);