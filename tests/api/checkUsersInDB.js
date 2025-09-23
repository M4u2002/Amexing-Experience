/**
 * Check Users in Database - Debug script
 * Verifies what users actually exist in MongoDB Atlas
 */

const Parse = require('parse/node');
const path = require('path');

// Load development environment
require('dotenv').config({
  path: path.join(__dirname, '../../environments/.env.development'),
});

async function checkUsersInDatabase() {
  console.log('🔍 Checking Users in MongoDB Atlas Database');
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

    console.log('1️⃣  Checking AmexingUser class with master key...');

    // Query all users with master key (no filtering)
    const AmexingUser = Parse.Object.extend('AmexingUser');
    const allUsersQuery = new Parse.Query(AmexingUser);

    const allUsers = await allUsersQuery.find({ useMasterKey: true });
    console.log(`✅ Total users found (no filtering): ${allUsers.length}`);

    if (allUsers.length > 0) {
      console.log('\n📋 All Users in Database:');
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.get('email')} (${user.get('role')}) - active: ${user.get('active')}, exists: ${user.get('exists')}`);
      });
    }

    console.log('\n2️⃣  Checking with active filter...');

    // Query only active users
    const activeUsersQuery = new Parse.Query(AmexingUser);
    activeUsersQuery.equalTo('active', true);

    const activeUsers = await activeUsersQuery.find({ useMasterKey: true });
    console.log(`✅ Active users found: ${activeUsers.length}`);

    if (activeUsers.length > 0) {
      console.log('\n📋 Active Users:');
      activeUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.get('email')} (${user.get('role')}) - exists: ${user.get('exists')}`);
      });
    }

    console.log('\n3️⃣  Checking with active AND exists filter (AI Agent pattern)...');

    // Query active AND exists users (AI Agent pattern)
    const aiAgentQuery = new Parse.Query(AmexingUser);
    aiAgentQuery.equalTo('active', true);
    aiAgentQuery.equalTo('exists', true);

    const aiAgentUsers = await aiAgentQuery.find({ useMasterKey: true });
    console.log(`✅ Active AND exists users found: ${aiAgentUsers.length}`);

    if (aiAgentUsers.length > 0) {
      console.log('\n📋 Active AND Exists Users (AI Agent Pattern):');
      aiAgentUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.get('email')} (${user.get('role')})`);
      });
    }

    console.log('\n4️⃣  Checking field distribution...');

    // Check field distribution
    const fieldStats = {
      active_true: 0,
      active_false: 0,
      active_undefined: 0,
      exists_true: 0,
      exists_false: 0,
      exists_undefined: 0,
      both_true: 0
    };

    allUsers.forEach(user => {
      const active = user.get('active');
      const exists = user.get('exists');

      if (active === true) fieldStats.active_true++;
      else if (active === false) fieldStats.active_false++;
      else fieldStats.active_undefined++;

      if (exists === true) fieldStats.exists_true++;
      else if (exists === false) fieldStats.exists_false++;
      else fieldStats.exists_undefined++;

      if (active === true && exists === true) fieldStats.both_true++;
    });

    console.log('📊 Field Distribution:');
    console.log(`   - active: true = ${fieldStats.active_true}`);
    console.log(`   - active: false = ${fieldStats.active_false}`);
    console.log(`   - active: undefined = ${fieldStats.active_undefined}`);
    console.log(`   - exists: true = ${fieldStats.exists_true}`);
    console.log(`   - exists: false = ${fieldStats.exists_false}`);
    console.log(`   - exists: undefined = ${fieldStats.exists_undefined}`);
    console.log(`   - BOTH true = ${fieldStats.both_true}`);

    console.log('\n5️⃣  Testing BaseModel.queryActive equivalent...');

    // Test what BaseModel.queryActive would return
    const baseModelQuery = new Parse.Query(AmexingUser);
    baseModelQuery.equalTo('active', true);
    baseModelQuery.equalTo('exists', true);
    baseModelQuery.limit(10); // Same as default API limit

    const baseModelResults = await baseModelQuery.find({ useMasterKey: true });
    console.log(`✅ BaseModel.queryActive equivalent: ${baseModelResults.length} users`);

    console.log('\n🎯 Diagnosis Complete!');

  } catch (error) {
    console.error('💥 Error checking database:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the check
checkUsersInDatabase().catch(console.error);