#!/usr/bin/env node

/**
 * Test script for /api/users endpoint with authentication
 * Tests if the endpoint returns all 7 users correctly
 */

require('dotenv').config({
  path: `./environments/.env.${process.env.NODE_ENV || 'development'}`,
});

const Parse = require('parse/node');
const http = require('http');

// Initialize Parse
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

async function authenticateAsSuperAdmin() {
  try {
    console.log('🔐 Authenticating as superadmin...');

    // Find the superadmin user
    const userQuery = new Parse.Query('AmexingUser');
    userQuery.equalTo('role', 'superadmin');
    userQuery.equalTo('active', true);
    userQuery.equalTo('exists', true);
    userQuery.include('roleId');

    const superadmin = await userQuery.first({ useMasterKey: true });

    if (!superadmin) {
      throw new Error('Superadmin user not found');
    }

    console.log(`✅ Found superadmin: ${superadmin.get('email')}`);

    // For testing, we'll use master key directly since we have it
    // In production, you'd authenticate with email/password
    return {
      user: superadmin,
      sessionToken: 'master-key-testing'
    };

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function testUsersEndpoint(auth) {
  try {
    console.log('\n🔍 Testing /api/users endpoint...');

    const options = {
      hostname: 'localhost',
      port: 1337,
      path: '/api/users',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Parse-Application-Id': process.env.PARSE_APP_ID,
        'X-Parse-Session-Token': auth.sessionToken,
        'X-Parse-Master-Key': process.env.PARSE_MASTER_KEY  // For testing purposes
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(data)
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    console.log(`📊 Response Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ API endpoint responded successfully');

      if (response.body && response.body.users) {
        const users = response.body.users;
        console.log(`📈 Returned ${users.length} users`);

        if (users.length === 7) {
          console.log('🎉 SUCCESS: All 7 users returned correctly!');

          console.log('\n👥 User Details:');
          users.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.email} - ${user.role || user.roleName} (${user.active ? 'Active' : 'Inactive'})`);
          });

          // Check if users have role information
          const usersWithRoles = users.filter(u => u.role || u.roleName);
          console.log(`\n🎭 Users with role info: ${usersWithRoles.length}/${users.length}`);

          if (response.body.pagination) {
            console.log('\n📄 Pagination Info:');
            console.log(`  Page: ${response.body.pagination.page}`);
            console.log(`  Total: ${response.body.pagination.totalCount}`);
            console.log(`  Total Pages: ${response.body.pagination.totalPages}`);
          }

          return { success: true, users };
        } else {
          console.log(`⚠️  Expected 7 users, got ${users.length}`);
          return { success: false, message: `Wrong user count: ${users.length}` };
        }
      } else {
        console.log('❌ Response does not contain users array');
        console.log('Response:', JSON.stringify(response.body, null, 2));
        return { success: false, message: 'No users array in response' };
      }
    } else {
      console.log(`❌ API endpoint failed with status ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.body, null, 2));
      return { success: false, message: `HTTP ${response.statusCode}` };
    }

  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    return { success: false, error: error.message };
  }
}

async function testUserQueryDirectly() {
  try {
    console.log('\n🔍 Testing direct Parse query for comparison...');

    const userQuery = new Parse.Query('AmexingUser');
    userQuery.equalTo('active', true);
    userQuery.equalTo('exists', true);
    userQuery.include('roleId');
    userQuery.limit(1000);

    const users = await userQuery.find({ useMasterKey: true });

    console.log(`📊 Direct query found ${users.length} users`);

    const roleAnalysis = {};
    users.forEach(user => {
      const rolePointer = user.get('roleId');
      const stringRole = user.get('role');
      const roleName = rolePointer ? rolePointer.get('name') : stringRole;

      roleAnalysis[roleName] = (roleAnalysis[roleName] || 0) + 1;
    });

    console.log('🎭 Role distribution from direct query:');
    Object.entries(roleAnalysis).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    return users;

  } catch (error) {
    console.error('❌ Direct query failed:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Testing /api/users Endpoint');
  console.log('===============================\n');

  try {
    // First test direct query to establish baseline
    await testUserQueryDirectly();

    // Authenticate
    const auth = await authenticateAsSuperAdmin();

    // Test the API endpoint
    const result = await testUsersEndpoint(auth);

    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log('🎉 TEST PASSED: /api/users endpoint works correctly!');
      console.log('✅ All 7 users are being returned as expected');
    } else {
      console.log('❌ TEST FAILED: /api/users endpoint has issues');
      console.log(`   Reason: ${result.message || result.error}`);
      console.log('\n💡 Potential issues to investigate:');
      console.log('   1. Role-based filtering excluding users');
      console.log('   2. Permission checks failing');
      console.log('   3. Pointer relationships not loading correctly');
      console.log('   4. Authentication middleware issues');
    }

  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testUsersEndpoint, authenticateAsSuperAdmin };