#!/usr/bin/env node

/**
 * Test script for /api/users endpoint with proper JWT authentication
 */

require('dotenv').config({
  path: `./environments/.env.${process.env.NODE_ENV || 'development'}`,
});

const Parse = require('parse/node');
const http = require('http');

// Initialize Parse
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

// Import our services to generate JWT
const { AuthenticationServiceCore } = require('./src/application/services/AuthenticationServiceCore');

async function generateJWTToken() {
  try {
    console.log('🔐 Generating JWT token for superadmin...');

    // Find the superadmin user
    const userQuery = new Parse.Query('AmexingUser');
    userQuery.equalTo('role', 'superadmin');
    userQuery.equalTo('active', true);
    userQuery.equalTo('exists', true);

    const superadmin = await userQuery.first({ useMasterKey: true });

    if (!superadmin) {
      throw new Error('Superadmin user not found');
    }

    console.log(`✅ Found superadmin: ${superadmin.get('email')}`);

    // Use AuthenticationServiceCore to generate proper JWT
    const authCore = new AuthenticationServiceCore();
    const tokens = await authCore.generateTokens(superadmin);

    console.log('✅ JWT tokens generated successfully');
    console.log(`   Token type: ${tokens.tokenType}`);
    console.log(`   Expires in: ${tokens.expiresIn}`);

    return {
      user: superadmin,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };

  } catch (error) {
    console.error('❌ JWT generation failed:', error.message);
    throw error;
  }
}

async function testUsersEndpointWithJWT(auth) {
  try {
    console.log('\n🔍 Testing /api/users endpoint with JWT...');

    const options = {
      hostname: 'localhost',
      port: 1337,
      path: '/api/users',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
        'X-Parse-Application-Id': process.env.PARSE_APP_ID
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

      // Check if response has users in data.users structure
      const users = response.body?.data?.users || response.body?.users;

      if (users && Array.isArray(users)) {
        console.log(`📈 Returned ${users.length} users`);

        if (users.length === 7) {
          console.log('🎉 SUCCESS: All 7 users returned correctly!');

          console.log('\n👥 User Details:');
          users.forEach((user, index) => {
            const role = user.role || user.roleName || 'No role';
            const roleId = user.roleId || 'No roleId';
            console.log(`  ${index + 1}. ${user.email} - ${role} (ID: ${roleId}) [${user.active ? 'Active' : 'Inactive'}]`);
          });

          // Analyze role information
          const usersWithRoles = users.filter(u => u.role || u.roleName);
          const usersWithRoleIds = users.filter(u => u.roleId);

          console.log(`\n🎭 Role Analysis:`);
          console.log(`  Users with role names: ${usersWithRoles.length}/${users.length}`);
          console.log(`  Users with roleId: ${usersWithRoleIds.length}/${users.length}`);

          const pagination = response.body?.data?.pagination || response.body?.pagination;
          if (pagination) {
            console.log('\n📄 Pagination Info:');
            console.log(`  Page: ${pagination.page}`);
            console.log(`  Total: ${pagination.totalCount}`);
            console.log(`  Total Pages: ${pagination.totalPages}`);
          }

          return { success: true, users, count: users.length };
        } else {
          console.log(`⚠️  Expected 7 users, got ${users.length}`);

          if (users.length > 0) {
            console.log('\n👥 Users found:');
            users.forEach((user, index) => {
              console.log(`  ${index + 1}. ${user.email} - ${user.role || 'No role'}`);
            });
          }

          return { success: false, message: `Wrong user count: ${users.length}`, users };
        }
      } else {
        console.log('❌ Response does not contain users array');
        console.log('Response structure:', Object.keys(response.body || {}));
        console.log('Full response:', JSON.stringify(response.body, null, 2));
        return { success: false, message: 'No users array in response' };
      }
    } else {
      console.log(`❌ API endpoint failed with status ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.body, null, 2));
      return { success: false, message: `HTTP ${response.statusCode}`, response: response.body };
    }

  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDirectQuery() {
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
    users.forEach((user, index) => {
      const rolePointer = user.get('roleId');
      const stringRole = user.get('role');

      let roleName = 'undefined';
      if (rolePointer && typeof rolePointer.get === 'function') {
        roleName = rolePointer.get('name') || stringRole;
      } else if (stringRole) {
        roleName = stringRole;
      }

      roleAnalysis[roleName] = (roleAnalysis[roleName] || 0) + 1;

      console.log(`  ${index + 1}. ${user.get('email')} - Role: ${stringRole}, RoleId: ${rolePointer ? 'Present' : 'None'}`);
    });

    console.log('\n🎭 Role distribution from direct query:');
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
  console.log('🚀 Testing /api/users Endpoint with JWT');
  console.log('=====================================\n');

  try {
    // First test direct query to establish baseline
    await testDirectQuery();

    // Generate JWT token
    const auth = await generateJWTToken();

    // Test the API endpoint
    const result = await testUsersEndpointWithJWT(auth);

    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('🎉 TEST PASSED: /api/users endpoint works correctly!');
      console.log(`✅ All ${result.count} users are being returned as expected`);
      console.log('\n🔧 Next step: Migration and fixes were successful!');
    } else {
      console.log('❌ TEST FAILED: /api/users endpoint has issues');
      console.log(`   Reason: ${result.message || result.error}`);

      if (result.users && result.users.length > 0) {
        console.log(`\n📊 Got ${result.users.length} users instead of 7`);
        console.log('💡 This suggests role-based filtering is excluding users');
      } else {
        console.log('\n💡 Potential issues to investigate:');
        console.log('   1. JWT token validation failing');
        console.log('   2. Permission middleware blocking access');
        console.log('   3. Service layer errors');
        console.log('   4. Database query filtering incorrectly');
      }
    }

  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testUsersEndpointWithJWT, generateJWTToken };