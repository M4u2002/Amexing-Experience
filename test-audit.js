// Quick test to verify audit hooks are working
const Parse = require('parse/node');

Parse.initialize(
  'CrTRTaJpoJFNt8PJ',
  null,
  'MEu9DMJo6bQHqxoKqLx0mx/il5hTnBEgn6SIdfKsEvA+1xcW2c5yJ4Idbq4awCUP'
);
Parse.serverURL = 'http://localhost:1337/parse';

async function testAuditLog() {
  try {
    console.log('Testing AuditLog class...\n');

    // Query for AuditLog class
    const AuditLog = Parse.Object.extend('AuditLog');
    const query = new Parse.Query(AuditLog);
    query.descending('createdAt');
    query.limit(10);

    const results = await query.find({ useMasterKey: true });

    console.log(`✅ Found ${results.length} audit log entries in database`);

    if (results.length > 0) {
      console.log('\n📋 Latest 5 entries:');
      results.slice(0, 5).forEach((log, index) => {
        const data = log.toJSON();
        console.log(`\n${index + 1}. ${data.action} - ${data.entityType}`);
        console.log(`   User: ${data.username || 'Unknown'}`);
        console.log(`   Time: ${data.timestamp || data.createdAt}`);
        console.log(`   Changes: ${Object.keys(data.changes || {}).length} fields`);
      });
    } else {
      console.log('\n❌ No audit logs found in database');
      console.log('\n🔍 This means the hooks are NOT executing.');
      console.log('   Possible causes:');
      console.log('   1. Hooks not registered properly');
      console.log('   2. Error in hook execution');
      console.log('   3. Server needs restart');
    }
  } catch (error) {
    console.error('\n❌ Error querying AuditLog:', error.message);

    if (error.message.includes('unauthorized')) {
      console.log('\n🔐 Permission issue - table might not exist yet');
    }
  }

  process.exit(0);
}

testAuditLog();
