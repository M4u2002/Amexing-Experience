/**
 * Superadmin Password Check Script
 * Verifies the correct password for the superadmin user.
 */

require('dotenv').config({ path: './environments/.env.development' });
const Parse = require('parse/node');

// Initialize Parse
Parse.initialize(
  process.env.PARSE_APP_ID || 'amexing-dev-app-id',
  process.env.PARSE_JAVASCRIPT_KEY || 'amexing-dev-js-key'
);

Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
Parse.masterKey = process.env.PARSE_MASTER_KEY || 'amexing-dev-master-key-ultra-secure-2024';

async function checkSuperadminPassword() {
  console.log('=== SUPERADMIN PASSWORD CHECK ===\n');

  try {
    // Get the superadmin user using the AmexingUser model
    const AmexingUser = require('../src/domain/models/AmexingUser');
    const userQuery = new Parse.Query(AmexingUser);
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
    console.log('- Active:', user.get('active'));
    console.log('- Account locked:', user.isAccountLocked());
    console.log('- Login attempts:', user.get('loginAttempts'));
    console.log('- Has password hash:', !!user.get('passwordHash'));

    // Test common passwords including environment variables
    const testPasswords = [
      process.env.DEV_SUPERADMIN_PASSWORD || 'DevSuper2024!@#',
      'DevSuper2024!@#',
      'AdminPass123!',
      'superadmin123',
      'password123',
      'Admin123!',
      'SuperAdmin123!',
      'DevSuper2024!',
      'DevSuper2024#',
      'AmexingSuper2024!',
      'Amexing123!',
      '123123123123'
    ];

    console.log('\n🔍 Testing passwords...');
    for (const password of testPasswords) {
      try {
        const isValid = await user.validatePassword(password);
        if (isValid) {
          console.log(`✅ CORRECT PASSWORD: ${password}`);
          return password;
        } else {
          console.log(`❌ Incorrect: ${password}`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${password}:`, error.message);
      }
    }

    console.log('\n⚠️  None of the test passwords worked');
    console.log('The superadmin user may have a different password');

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkSuperadminPassword()
  .then(() => {
    console.log('\n=== CHECK COMPLETED ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check script failed:', error);
    process.exit(1);
  });