/**
 * Token Generation Test Script
 * Tests the current JWT token generation and validates the role field being used.
 */

require('dotenv').config({ path: './environments/.env.development' });
const Parse = require('parse/node');
const jwt = require('jsonwebtoken');

// Initialize Parse
Parse.initialize(
  process.env.PARSE_APP_ID || 'amexing-dev-app-id',
  process.env.PARSE_JAVASCRIPT_KEY || 'amexing-dev-js-key'
);

Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
Parse.masterKey = process.env.PARSE_MASTER_KEY || 'amexing-dev-master-key-ultra-secure-2024';

async function testTokenGeneration() {
  console.log('=== JWT TOKEN GENERATION TEST ===\n');

  try {
    // 1. Get the superadmin user
    console.log('1. FETCHING SUPERADMIN USER');
    console.log('---------------------------');

    const userQuery = new Parse.Query('AmexingUser');
    userQuery.equalTo('email', 'superadmin@dev.amexing.com');
    const user = await userQuery.first({ useMasterKey: true });

    if (!user) {
      console.log('❌ Superadmin user not found');
      return;
    }

    console.log('✅ Superadmin user found');
    console.log('- User ID:', user.id);
    console.log('- Username:', user.get('username'));
    console.log('- Email:', user.get('email'));
    console.log('- Old role field:', user.get('role'));
    console.log('- New roleId field:', user.get('roleId'));

    // 2. Get the role object
    console.log('\n2. FETCHING ROLE OBJECT');
    console.log('-----------------------');

    const roleId = user.get('roleId');
    if (roleId) {
      const roleQuery = new Parse.Query('Role');
      roleQuery.equalTo('objectId', roleId);
      const role = await roleQuery.first({ useMasterKey: true });

      if (role) {
        console.log('✅ Role object found');
        console.log('- Role ID:', role.id);
        console.log('- Role name:', role.get('name'));
        console.log('- Role level:', role.get('level'));
        console.log('- Role scope:', role.get('scope'));
      } else {
        console.log('❌ Role object not found for roleId:', roleId);
      }
    } else {
      console.log('❌ No roleId found in user object');
    }

    // 3. Test current token generation method
    console.log('\n3. CURRENT TOKEN GENERATION (BROKEN)');
    console.log('------------------------------------');

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '8h';

    const currentPayload = {
      userId: user.id,
      username: user.get('username'),
      email: user.get('email'),
      role: user.get('role'), // This is the old string field
      iat: Math.floor(Date.now() / 1000),
    };

    const currentToken = jwt.sign(
      { ...currentPayload, type: 'access' },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    console.log('Current payload role field:', currentPayload.role);
    console.log('Current token (first 50 chars):', currentToken.substring(0, 50) + '...');

    // Decode and verify the current token
    const decoded = jwt.verify(currentToken, jwtSecret);
    console.log('Decoded token role:', decoded.role);

    // 4. Test improved token generation method
    console.log('\n4. IMPROVED TOKEN GENERATION (FIXED)');
    console.log('------------------------------------');

    let roleObject = null;
    let roleName = 'guest';

    if (roleId) {
      const roleQuery = new Parse.Query('Role');
      roleQuery.equalTo('objectId', roleId);
      roleObject = await roleQuery.first({ useMasterKey: true });

      if (roleObject) {
        roleName = roleObject.get('name');
      }
    }

    const improvedPayload = {
      userId: user.id,
      username: user.get('username'),
      email: user.get('email'),
      role: roleName, // Use the role name from the relationship
      roleId: roleId, // Include roleId for reference
      organizationId: user.get('organizationId'),
      iat: Math.floor(Date.now() / 1000),
    };

    const improvedToken = jwt.sign(
      { ...improvedPayload, type: 'access' },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    console.log('Improved payload role field:', improvedPayload.role);
    console.log('Improved payload roleId field:', improvedPayload.roleId);
    console.log('Improved token (first 50 chars):', improvedToken.substring(0, 50) + '...');

    // Decode and verify the improved token
    const decodedImproved = jwt.verify(improvedToken, jwtSecret);
    console.log('Decoded improved token role:', decodedImproved.role);
    console.log('Decoded improved token roleId:', decodedImproved.roleId);

    // 5. Compare the results
    console.log('\n5. COMPARISON');
    console.log('-------------');
    console.log('Current method role result:', decoded.role);
    console.log('Improved method role result:', decodedImproved.role);
    console.log('Expected role for superadmin: superadmin');
    console.log('');

    if (decoded.role === 'superadmin') {
      console.log('✅ Current method works correctly');
    } else {
      console.log('❌ Current method is broken - role is:', decoded.role);
    }

    if (decodedImproved.role === 'superadmin') {
      console.log('✅ Improved method works correctly');
    } else {
      console.log('❌ Improved method is broken - role is:', decodedImproved.role);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTokenGeneration()
  .then(() => {
    console.log('\n=== TEST COMPLETED ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });