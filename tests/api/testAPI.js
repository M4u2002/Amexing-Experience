/**
 * Direct API Testing Script for Development Environment
 * Tests the actual running development server with MongoDB Atlas
 */

const axios = require('axios');
const Parse = require('parse/node');
const path = require('path');

// Load development environment
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

const BASE_URL = 'http://localhost:1337';

async function testAPI() {
  console.log('🚀 Starting API Tests for Development Environment');
  console.log('🔗 Server URL:', BASE_URL);
  console.log('🗄️  Database:', process.env.DATABASE_URI ? 'MongoDB Atlas' : 'Not configured');
  console.log('');

  // Wait for Parse Server to fully initialize
  console.log('⏳ Waiting for Parse Server to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('');

  let superadminToken = null;
  let adminToken = null;

  try {
    // Test 1: Server Health Check
    console.log('1️⃣  Testing Server Health...');
    const healthResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Server is responding (Status:', healthResponse.status, ')');
    console.log('');

    // Test 2: Authentication Test
    console.log('2️⃣  Testing Authentication...');

    // Get CSRF token first
    const loginPageResponse = await axios.get(`${BASE_URL}/login`);

    // Try multiple patterns to extract CSRF token
    let csrfToken = null;
    const patterns = [
      /name="csrfToken".*?value="([^"]+)"/,
      /name="_csrf".*?value="([^"]+)"/,
      /name='_csrf'.*?value='([^']+)'/,
      /<meta name="csrf-token" content="([^"]+)"/,
      /<input[^>]*name="csrfToken"[^>]*value="([^"]+)"/,
      /<input[^>]*name="_csrf"[^>]*value="([^"]+)"/,
      /<input[^>]*value="([^"]+)"[^>]*name="csrfToken"/,
      /<input[^>]*value="([^"]+)"[^>]*name="_csrf"/
    ];

    for (const pattern of patterns) {
      const match = loginPageResponse.data.match(pattern);
      if (match) {
        csrfToken = match[1];
        console.log('✅ CSRF token extracted using pattern:', pattern.source);
        break;
      }
    }

    if (!csrfToken) {
      console.log('❌ Could not extract CSRF token from login page');
      console.log('🔍 Login page content sample:', loginPageResponse.data.substring(0, 500));
      console.log('🔍 Searching for CSRF in full content...');

      // Search for any input with csrf in name or id
      const csrfInputMatch = loginPageResponse.data.match(/<input[^>]*(?:name|id)="[^"]*csrf[^"]*"[^>]*>/i);
      if (csrfInputMatch) {
        console.log('🔍 Found CSRF input:', csrfInputMatch[0]);
      }

      return;
    }

    // Extract cookies
    const cookies = loginPageResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.join('; ') : '';

    // Login as superadmin
    try {
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
        superadminToken = loginResponse.data.tokens.accessToken;
        console.log('✅ Superadmin authentication successful');
        console.log('   Access token length:', superadminToken.length);
      } else {
        console.log('❌ Superadmin authentication failed:', loginResponse.data.message || 'Unknown error');
        console.log('   Full response:', loginResponse.data);
      }
    } catch (authError) {
      console.log('❌ Superadmin authentication error:');
      console.log('   Status:', authError.response?.status);
      console.log('   Data:', authError.response?.data);
      console.log('   Message:', authError.message);
    }

    console.log('');

    // Test 3: API Endpoint Tests
    console.log('3️⃣  Testing API Endpoints...');

    if (superadminToken) {
      // Test GET /api/users
      try {
        console.log('   Testing GET /api/users...');
        const usersResponse = await axios.get(`${BASE_URL}/api/users?page=1&limit=5`, {
          headers: {
            'Authorization': `Bearer ${superadminToken}`
          }
        });

        if (usersResponse.data.success) {
          console.log('✅ GET /api/users successful');
          console.log('   - Total users:', usersResponse.data.data?.pagination?.total || 'Unknown');
          console.log('   - Retrieved users:', usersResponse.data.data?.users?.length || 0);
        } else {
          console.log('❌ GET /api/users failed:', usersResponse.data.message);
        }
      } catch (apiError) {
        console.log('❌ GET /api/users error:', apiError.response?.status, apiError.response?.data || apiError.message);
      }

      // Test GET /api/users/statistics
      try {
        console.log('   Testing GET /api/users/statistics...');
        const statsResponse = await axios.get(`${BASE_URL}/api/users/statistics`, {
          headers: {
            'Authorization': `Bearer ${superadminToken}`
          }
        });

        if (statsResponse.data.success) {
          console.log('✅ GET /api/users/statistics successful');
          console.log('   - Statistics keys:', Object.keys(statsResponse.data.data?.statistics || {}));
        } else {
          console.log('❌ GET /api/users/statistics failed:', statsResponse.data.message);
        }
      } catch (statsError) {
        console.log('❌ GET /api/users/statistics error:', statsError.response?.status, statsError.response?.data || statsError.message);
      }
    } else {
      console.log('❌ Skipping API tests - no authentication token');
    }

    console.log('');

    // Test 4: Parse Server Direct Connection
    console.log('4️⃣  Testing Parse Server Connection...');

    try {
      Parse.initialize(
        process.env.PARSE_APP_ID,
        null,
        process.env.PARSE_MASTER_KEY
      );
      Parse.serverURL = process.env.PARSE_SERVER_URL;

      // Test a simple query
      const TestConnection = Parse.Object.extend('TestConnection');
      const query = new Parse.Query(TestConnection);
      query.limit(1);

      const results = await query.find({ useMasterKey: true });
      console.log('✅ Parse Server connection successful');
      console.log('   - Test query results:', results.length);
    } catch (parseError) {
      console.log('❌ Parse Server connection error:', parseError.message);
    }

    console.log('');

    // Test 5: Unauthorized Request Test
    console.log('5️⃣  Testing Unauthorized Access...');
    try {
      const unauthorizedResponse = await axios.get(`${BASE_URL}/api/users`);
      console.log('❌ Unauthorized request should have failed but got status:', unauthorizedResponse.status);
    } catch (unauthorizedError) {
      if (unauthorizedError.response?.status === 401) {
        console.log('✅ Unauthorized request correctly rejected (401)');
      } else {
        console.log('❌ Unexpected error for unauthorized request:', unauthorizedError.response?.status || unauthorizedError.message);
      }
    }

    console.log('');
    console.log('🎉 API Testing Complete!');

  } catch (error) {
    console.error('💥 Critical test error:', error.message);
  }
}

// Run the tests
testAPI().catch(console.error);