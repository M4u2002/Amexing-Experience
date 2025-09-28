/**
 * Reset Superadmin Login Script
 * Resets login attempts and unlocks the superadmin account
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

async function resetSuperadminLogin() {
  console.log('=== RESET SUPERADMIN LOGIN ===\n');

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
    console.log('Before reset:');
    console.log('- Login attempts:', user.get('loginAttempts'));
    console.log('- Locked until:', user.get('lockedUntil'));
    console.log('- Account locked:', user.isAccountLocked());

    // Reset login attempts and unlock account
    user.set('loginAttempts', 0);
    user.unset('lockedUntil');

    await user.save(null, { useMasterKey: true });

    console.log('\n✅ Login reset successful');
    console.log('After reset:');
    console.log('- Login attempts:', user.get('loginAttempts'));
    console.log('- Locked until:', user.get('lockedUntil'));
    console.log('- Account locked:', user.isAccountLocked());

    // Test password again
    console.log('\n🔓 Testing password after reset...');
    const password = 'DevSuper2024!@#';
    const isValid = await user.validatePassword(password);

    if (isValid) {
      console.log('✅ Password validation successful!');
      console.log('The superadmin account is now ready for login tests');
    } else {
      console.log('❌ Password validation failed');
      console.log('There may be a different issue with the password');
    }

  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
}

// Run the reset
resetSuperadminLogin()
  .then(() => {
    console.log('\n=== RESET COMPLETED ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Reset script failed:', error);
    process.exit(1);
  });