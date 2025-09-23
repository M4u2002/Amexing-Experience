/**
 * Test Fixed API - Verify UserManagementService sorting fix
 * Tests the corrected applySorting method with Parse Server correct syntax
 */

const axios = require('axios');
const path = require('path');

// Load development environment
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

const BASE_URL = 'http://localhost:1337';

async function testFixedAPI() {
  console.log('🔧 Testing Fixed UserManagement API');
  console.log('🔗 Server URL:', BASE_URL);
  console.log('');

  let authToken = null;

  try {
    // Step 1: Get CSRF token
    console.log('1️⃣  Getting CSRF token...');
    const loginPageResponse = await axios.get(`${BASE_URL}/login`);

    const csrfMatch = loginPageResponse.data.match(/name="csrfToken".*?value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;

    if (!csrfToken) {
      console.log('❌ Could not extract CSRF token');
      return;
    }
    console.log('✅ CSRF token extracted');

    // Step 2: Authenticate
    console.log('2️⃣  Authenticating superadmin...');
    const cookies = loginPageResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.join('; ') : '';

    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'superadmin@dev.amexing.com',
      password: 'DevSuper2024!@#',
      csrfToken: csrfToken
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      }
    });

    console.log('   Login response status:', loginResponse.status);
    console.log('   Login response data:', JSON.stringify(loginResponse.data, null, 2));

    if (loginResponse.data.success) {
      authToken = loginResponse.data.tokens.accessToken;
      console.log('✅ Authentication successful');
    } else {
      console.log('❌ Authentication failed:', loginResponse.data.message || 'Unknown error');
      console.log('   Full response:', loginResponse.data);
      return;
    }

    // Step 3: Test API endpoints with sorting
    console.log('3️⃣  Testing API endpoints with sorting...');

    const testCases = [
      {
        name: 'Default sorting (lastName asc)',
        url: '/api/users?page=1&limit=3'
      },
      {
        name: 'Sort by firstName ascending',
        url: '/api/users?page=1&limit=3&sortField=firstName&sortDirection=asc'
      },
      {
        name: 'Sort by email descending',
        url: '/api/users?page=1&limit=3&sortField=email&sortDirection=desc'
      },
      {
        name: 'Sort by role ascending',
        url: '/api/users?page=1&limit=3&sortField=role&sortDirection=asc'
      },
      {
        name: 'Invalid sort field (should use default)',
        url: '/api/users?page=1&limit=3&sortField=invalidField&sortDirection=asc'
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`   Testing: ${testCase.name}`);
        const response = await axios.get(`${BASE_URL}${testCase.url}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.data.success) {
          console.log(`   ✅ ${testCase.name} - SUCCESS`);
          console.log(`   - Status: ${response.status}`);
          console.log(`   - Users found: ${response.data.data?.users?.length || 0}`);
          console.log(`   - Total users: ${response.data.data?.pagination?.total || 'Unknown'}`);

          // Show first user to verify sorting
          if (response.data.data?.users?.length > 0) {
            const firstUser = response.data.data.users[0];
            console.log(`   - First user: ${firstUser.firstName} ${firstUser.lastName} (${firstUser.email})`);
          }
        } else {
          console.log(`   ❌ ${testCase.name} - FAILED: ${response.data.error}`);
        }
      } catch (error) {
        console.log(`   ❌ ${testCase.name} - ERROR: ${error.response?.status} ${error.response?.data?.error || error.message}`);
      }
      console.log('');
    }

    // Step 4: Test statistics endpoint
    console.log('4️⃣  Testing statistics endpoint...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/users/statistics`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (statsResponse.data.success) {
        console.log('✅ Statistics endpoint - SUCCESS');
        console.log('   - Statistics keys:', Object.keys(statsResponse.data.data?.statistics || {}));
      } else {
        console.log('❌ Statistics endpoint - FAILED:', statsResponse.data.error);
      }
    } catch (error) {
      console.log('❌ Statistics endpoint - ERROR:', error.response?.status, error.response?.data?.error || error.message);
    }

    console.log('');
    console.log('🎉 Fixed API Testing Complete!');

  } catch (error) {
    console.error('💥 Critical test error:', error.message);
  }
}

// Run the test
testFixedAPI().catch(console.error);