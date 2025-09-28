/**
 * Authentication Fix Test Script
 * Tests the updated authentication system to ensure role relationships work correctly.
 */

require('dotenv').config({ path: './environments/.env.development' });
const Parse = require('parse/node');
const AuthenticationService = require('../src/application/services/AuthenticationService');

// Initialize Parse
Parse.initialize(
  process.env.PARSE_APP_ID || 'amexing-dev-app-id',
  process.env.PARSE_JAVASCRIPT_KEY || 'amexing-dev-js-key'
);

Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
Parse.masterKey = process.env.PARSE_MASTER_KEY || 'amexing-dev-master-key-ultra-secure-2024';

async function testAuthenticationFix() {
  console.log('=== AUTHENTICATION FIX TEST ===\n');

  try {
    // 1. Test the login process
    console.log('1. TESTING UPDATED LOGIN PROCESS');
    console.log('--------------------------------');

    const identifier = 'superadmin@dev.amexing.com';
    const password = process.env.DEV_SUPERADMIN_PASSWORD || 'DevSuper2024!@#';

    console.log(`Attempting login with: ${identifier}`);

    const loginResult = await AuthenticationService.loginUser(identifier, password);

    console.log('✅ Login successful!');
    console.log('Login result user role:', loginResult.user.role || loginResult.user.roleName);
    console.log('Login result user roleId:', loginResult.user.roleId);
    console.log('Login result user organizationId:', loginResult.user.organizationId);

    // 2. Test token generation
    console.log('\n2. TESTING TOKEN GENERATION');
    console.log('----------------------------');

    const tokens = loginResult.tokens;
    console.log('Access token generated:', !!tokens.accessToken);
    console.log('Refresh token generated:', !!tokens.refreshToken);

    // 3. Test token validation
    console.log('\n3. TESTING TOKEN VALIDATION');
    console.log('----------------------------');

    const validationResult = await AuthenticationService.validateToken(tokens.accessToken);

    console.log('✅ Token validation successful!');
    console.log('Validation result role:', validationResult.role);
    console.log('Validation result roleId:', validationResult.roleId);
    console.log('Validation result organizationId:', validationResult.organizationId);
    console.log('Validation result has roleObject:', !!validationResult.roleObject);

    if (validationResult.roleObject) {
      console.log('Role object name:', validationResult.roleObject.get('name'));
      console.log('Role object level:', validationResult.roleObject.get('level'));
      console.log('Role object scope:', validationResult.roleObject.get('scope'));
    }

    // 4. Verify the fix
    console.log('\n4. VERIFICATION');
    console.log('----------------');

    const expectedRole = 'superadmin';
    const actualRole = validationResult.role;

    if (actualRole === expectedRole) {
      console.log('✅ AUTHENTICATION FIX SUCCESSFUL!');
      console.log(`   Expected role: ${expectedRole}`);
      console.log(`   Actual role: ${actualRole}`);
      console.log('   Dashboard redirection should now work correctly');
    } else {
      console.log('❌ AUTHENTICATION FIX FAILED!');
      console.log(`   Expected role: ${expectedRole}`);
      console.log(`   Actual role: ${actualRole}`);
    }

    // 5. Test user.toSafeJSON() method
    console.log('\n5. TESTING USER.TOSAFEJSON()');
    console.log('------------------------------');

    const safeUserData = validationResult.user;
    console.log('User role from toSafeJSON:', safeUserData.role || safeUserData.roleName);
    console.log('User roleId from toSafeJSON:', safeUserData.roleId);
    console.log('User organizationId from toSafeJSON:', safeUserData.organizationId);

    if (safeUserData.role === expectedRole) {
      console.log('✅ User.toSafeJSON() returns correct role');
    } else {
      console.log('❌ User.toSafeJSON() returns incorrect role');
      console.log('   This could affect dashboard components');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAuthenticationFix()
  .then(() => {
    console.log('\n=== TEST COMPLETED ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });