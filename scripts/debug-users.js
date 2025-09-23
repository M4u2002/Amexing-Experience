#!/usr/bin/env node

/**
 * Debug Users Script - Check what users exist in the database
 */

require('dotenv').config({
  path: `./environments/.env.${process.env.NODE_ENV || 'development'}`,
});

const Parse = require('parse/node');

async function debugUsers() {
  try {
    console.log('🔗 Initializing Parse SDK...');

    // Initialize Parse SDK
    Parse.initialize(
      process.env.PARSE_APP_ID || 'amexing-app-id',
      null,
      process.env.PARSE_MASTER_KEY || 'amexing-master-key'
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';

    console.log('✅ Parse SDK initialized');

    // Query all AmexingUser records
    const query = new Parse.Query('AmexingUser');
    const allUsers = await query.find({ useMasterKey: true });

    console.log(`\n📊 Found ${allUsers.length} users in AmexingUser table:`);
    console.log('┌─────────────────────────────────┬─────────────────────────────────┬──────────────────────┬─────────┬────────┐');
    console.log('│ Email                           │ Username                        │ Role                 │ Active  │ Exists │');
    console.log('├─────────────────────────────────┼─────────────────────────────────┼──────────────────────┼─────────┼────────┤');

    allUsers.forEach(user => {
      const email = (user.get('email') || '').padEnd(31);
      const username = (user.get('username') || '').padEnd(31);
      const role = (user.get('role') || '').padEnd(20);
      const active = user.get('active') ? '✅' : '❌';
      const exists = user.get('exists') ? '✅' : '❌';

      console.log(`│ ${email} │ ${username} │ ${role} │ ${active.padEnd(7)} │ ${exists.padEnd(6)} │`);
    });

    console.log('└─────────────────────────────────┴─────────────────────────────────┴──────────────────────┴─────────┴────────┘');

    // Check for any potential duplicates
    const emails = allUsers.map(u => u.get('email')).filter(Boolean);
    const usernames = allUsers.map(u => u.get('username')).filter(Boolean);

    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    const duplicateUsernames = usernames.filter((username, index) => usernames.indexOf(username) !== index);

    if (duplicateEmails.length > 0) {
      console.log(`\n⚠️  Duplicate emails found: ${duplicateEmails.join(', ')}`);
    }

    if (duplicateUsernames.length > 0) {
      console.log(`\n⚠️  Duplicate usernames found: ${duplicateUsernames.join(', ')}`);
    }

    if (duplicateEmails.length === 0 && duplicateUsernames.length === 0) {
      console.log('\n✅ No duplicates found');
    }

  } catch (error) {
    console.error('❌ Error debugging users:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  debugUsers()
    .then(() => {
      console.log('\n✨ Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { debugUsers };