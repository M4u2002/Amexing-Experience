/**
 * Fix Existing Users - Set exists: true for active users
 * Updates existing users to comply with AI Agent Pattern
 */

const Parse = require('parse/node');
const path = require('path');

// Load development environment
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

async function fixExistingUsers() {
  console.log('🔧 Fixing Existing Users for AI Agent Pattern Compliance');
  console.log('🔗 Server URL:', process.env.PARSE_SERVER_URL);
  console.log('🗄️  Database:', process.env.DATABASE_URI ? 'MongoDB Atlas' : 'Not configured');
  console.log('');

  try {
    // Initialize Parse SDK
    Parse.initialize(
      process.env.PARSE_APP_ID,
      null,
      process.env.PARSE_MASTER_KEY
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL;

    // Wait for Parse Server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('1️⃣  Finding users that need fixing...');

    // Find active users without exists: true
    const AmexingUser = Parse.Object.extend('AmexingUser');
    const query = new Parse.Query(AmexingUser);
    query.equalTo('active', true);
    query.notEqualTo('exists', true); // Users that don't have exists: true

    const usersToFix = await query.find({ useMasterKey: true });
    console.log(`✅ Found ${usersToFix.length} users that need fixing`);

    if (usersToFix.length === 0) {
      console.log('🎉 All users are already AI Agent Pattern compliant!');
      return;
    }

    console.log('\n📋 Users to fix:');
    usersToFix.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.get('email')} (${user.get('role')}) - exists: ${user.get('exists')}`);
    });

    console.log('\n2️⃣  Updating users...');

    // Update each user to set exists: true
    const updatePromises = usersToFix.map(async (user, index) => {
      try {
        user.set('exists', true);
        user.set('updatedAt', new Date());

        await user.save(null, { useMasterKey: true });
        console.log(`   ✅ Updated: ${user.get('email')}`);
        return { success: true, email: user.get('email') };
      } catch (error) {
        console.log(`   ❌ Failed to update ${user.get('email')}: ${error.message}`);
        return { success: false, email: user.get('email'), error: error.message };
      }
    });

    const results = await Promise.all(updatePromises);

    console.log('\n3️⃣  Update Results:');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`   ✅ Successfully updated: ${successful.length} users`);
    if (failed.length > 0) {
      console.log(`   ❌ Failed to update: ${failed.length} users`);
      failed.forEach(f => console.log(`      - ${f.email}: ${f.error}`));
    }

    console.log('\n4️⃣  Verification - Testing AI Agent Pattern query...');

    // Verify the fix worked
    const verificationQuery = new Parse.Query(AmexingUser);
    verificationQuery.equalTo('active', true);
    verificationQuery.equalTo('exists', true);

    const verificationResults = await verificationQuery.find({ useMasterKey: true });
    console.log(`✅ AI Agent Pattern now returns: ${verificationResults.length} users`);

    if (verificationResults.length > 0) {
      console.log('\n📋 Users now available for API:');
      verificationResults.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.get('email')} (${user.get('role')})`);
      });
    }

    console.log('\n🎉 Fix Complete! The API should now return all active users.');
    console.log('💡 You can now refresh the dashboard and see all users in the table.');

  } catch (error) {
    console.error('💥 Error fixing users:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the fix
fixExistingUsers().catch(console.error);