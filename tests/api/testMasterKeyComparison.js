/**
 * Master Key Comparison Test
 * Tests Parse Server queries with masterKey: true vs masterKey: false
 * to demonstrate the difference in access permissions
 */

const Parse = require('parse/node');
const path = require('path');

// Load development environment
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

async function testMasterKeyComparison() {
  console.log('🔑 Master Key Comparison Test');
  console.log('🔗 Server URL:', process.env.PARSE_SERVER_URL);
  console.log('🗄️  Database:', process.env.DATABASE_URI ? 'MongoDB Atlas' : 'Not configured');
  console.log('');

  // Initialize Parse SDK
  Parse.initialize(
    process.env.PARSE_APP_ID,
    null,
    process.env.PARSE_MASTER_KEY
  );
  Parse.serverURL = process.env.PARSE_SERVER_URL;

  try {
    console.log('1️⃣  Testing with masterKey: true');
    console.log('='.repeat(50));

    // Test with master key
    const TestConnection = Parse.Object.extend('TestConnection');
    const queryWithMaster = new Parse.Query(TestConnection);
    queryWithMaster.limit(5);

    try {
      const resultsWithMaster = await queryWithMaster.find({ useMasterKey: true });
      console.log('✅ Query with masterKey: true successful');
      console.log('   - Records found:', resultsWithMaster.length);
      console.log('   - Sample record IDs:', resultsWithMaster.slice(0, 3).map(r => r.id));
    } catch (error) {
      console.log('❌ Query with masterKey: true failed:', error.message);
    }

    console.log('');
    console.log('2️⃣  Testing with masterKey: false');
    console.log('='.repeat(50));

    // Test without master key
    const queryWithoutMaster = new Parse.Query(TestConnection);
    queryWithoutMaster.limit(5);

    try {
      const resultsWithoutMaster = await queryWithoutMaster.find({ useMasterKey: false });
      console.log('✅ Query with masterKey: false successful');
      console.log('   - Records found:', resultsWithoutMaster.length);
      console.log('   - Sample record IDs:', resultsWithoutMaster.slice(0, 3).map(r => r.id));
    } catch (error) {
      console.log('❌ Query with masterKey: false failed:', error.message);
      console.log('   - Error code:', error.code);
      console.log('   - This is expected behavior for unauthorized queries');
    }

    console.log('');
    console.log('3️⃣  Testing AmexingUser queries comparison');
    console.log('='.repeat(50));

    // Test with AmexingUser class
    const AmexingUser = Parse.Object.extend('AmexingUser');

    // With master key
    try {
      const userQueryMaster = new Parse.Query(AmexingUser);
      userQueryMaster.limit(3);
      const usersWithMaster = await userQueryMaster.find({ useMasterKey: true });
      console.log('✅ AmexingUser query with masterKey: true successful');
      console.log('   - Users found:', usersWithMaster.length);
      console.log('   - User emails:', usersWithMaster.map(u => u.get('email')));
    } catch (error) {
      console.log('❌ AmexingUser query with masterKey: true failed:', error.message);
    }

    // Without master key
    try {
      const userQueryNoMaster = new Parse.Query(AmexingUser);
      userQueryNoMaster.limit(3);
      const usersWithoutMaster = await userQueryNoMaster.find({ useMasterKey: false });
      console.log('✅ AmexingUser query with masterKey: false successful');
      console.log('   - Users found:', usersWithoutMaster.length);
      console.log('   - User emails:', usersWithoutMaster.map(u => u.get('email')));
    } catch (error) {
      console.log('❌ AmexingUser query with masterKey: false failed:', error.message);
      console.log('   - Error code:', error.code);
      console.log('   - This demonstrates ACL restrictions without master key');
    }

    console.log('');
    console.log('4️⃣  Testing authenticated user query (simulating API call)');
    console.log('='.repeat(50));

    // Simulate what happens when API calls are made without master key
    try {
      const publicQuery = new Parse.Query(AmexingUser);
      publicQuery.equalTo('active', true);
      publicQuery.limit(1);

      const publicResults = await publicQuery.find(); // No master key specified
      console.log('✅ Public query (no masterKey param) successful');
      console.log('   - Records accessible:', publicResults.length);
    } catch (error) {
      console.log('❌ Public query failed:', error.message);
      console.log('   - This shows what API endpoints experience without proper authentication');
    }

    console.log('');
    console.log('🎯 Summary:');
    console.log('- masterKey: true = Full database access (admin operations)');
    console.log('- masterKey: false = Respects ACLs and user permissions');
    console.log('- No masterKey param = Uses current user session/ACLs');
    console.log('- API endpoints should use authenticated user context, not master key');

  } catch (error) {
    console.error('💥 Critical test error:', error.message);
  }
}

// Run the comparison test
testMasterKeyComparison().catch(console.error);