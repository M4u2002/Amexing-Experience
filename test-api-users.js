#!/usr/bin/env node

/**
 * Test script for /api/users endpoint
 * Tests the endpoint without migrating data first to see current state
 */

require('dotenv').config({
  path: `./environments/.env.${process.env.NODE_ENV || 'development'}`,
});

const Parse = require('parse/node');
const http = require('http');

// Initialize Parse
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

async function testParseConnection() {
  try {
    console.log('🔍 Testing Parse Server connection...');
    console.log(`Server URL: ${process.env.PARSE_SERVER_URL}`);

    // Test basic Parse connection
    const TestObject = Parse.Object.extend('TestObject');
    const testObject = new TestObject();
    await testObject.save({ test: 'connection' }, { useMasterKey: true });
    await testObject.destroy({ useMasterKey: true });

    console.log('✅ Parse Server connection successful');
    return true;
  } catch (error) {
    console.error('❌ Parse Server connection failed:', error.message);
    return false;
  }
}

async function checkUsersInDatabase() {
  try {
    console.log('\n🔍 Checking users in database...');

    // Query all users
    const userQuery = new Parse.Query('AmexingUser');
    userQuery.limit(1000);
    const users = await userQuery.find({ useMasterKey: true });

    console.log(`📊 Found ${users.length} users in database`);

    // Analyze role structure
    const roleAnalysis = {
      withStringRole: 0,
      withRoleId: 0,
      withBoth: 0,
      withNeither: 0,
      roleDistribution: {}
    };

    users.forEach(user => {
      const hasStringRole = !!user.get('role');
      const hasRoleId = !!user.get('roleId');
      const role = user.get('role') || 'undefined';

      if (hasStringRole && hasRoleId) {
        roleAnalysis.withBoth++;
      } else if (hasStringRole && !hasRoleId) {
        roleAnalysis.withStringRole++;
      } else if (!hasStringRole && hasRoleId) {
        roleAnalysis.withRoleId++;
      } else {
        roleAnalysis.withNeither++;
      }

      roleAnalysis.roleDistribution[role] = (roleAnalysis.roleDistribution[role] || 0) + 1;
    });

    console.log('\n📈 Role Analysis:');
    console.log(`  Users with string role only: ${roleAnalysis.withStringRole}`);
    console.log(`  Users with roleId only: ${roleAnalysis.withRoleId}`);
    console.log(`  Users with both: ${roleAnalysis.withBoth}`);
    console.log(`  Users with neither: ${roleAnalysis.withNeither}`);
    console.log('\n🎭 Role Distribution:');
    Object.entries(roleAnalysis.roleDistribution).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    return users;
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    return [];
  }
}

async function checkRolesInDatabase() {
  try {
    console.log('\n🔍 Checking roles in database...');

    const roleQuery = new Parse.Query('Role');
    const roles = await roleQuery.find({ useMasterKey: true });

    console.log(`📊 Found ${roles.length} roles in database`);

    if (roles.length > 0) {
      console.log('\n🎭 Available Roles:');
      roles.forEach(role => {
        console.log(`  - ${role.get('name')} (${role.get('displayName')}) - Level ${role.get('level')}`);
      });
    }

    return roles;
  } catch (error) {
    console.error('❌ Error checking roles:', error.message);
    return [];
  }
}

async function testAPIEndpoint() {
  try {
    console.log('\n🔍 Testing /api/users endpoint...');

    // This would require authentication, so we'll just note it for now
    console.log('ℹ️  API endpoint test requires authentication - will test after server is running');

  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting User Management Analysis');
  console.log('====================================\n');

  const isConnected = await testParseConnection();
  if (!isConnected) {
    console.log('\n💡 To start Parse Server:');
    console.log('   yarn dev');
    process.exit(1);
  }

  const users = await checkUsersInDatabase();
  const roles = await checkRolesInDatabase();

  await testAPIEndpoint();

  console.log('\n✅ Analysis complete!');
  console.log('\n📋 Next Steps:');

  if (roles.length === 0) {
    console.log('  1. Run migration to create roles: node scripts/migrations/001-create-rbac-system.js');
  } else if (users.some(u => u.get('role') && !u.get('roleId'))) {
    console.log('  1. Users need migration from string roles to Pointer roles');
    console.log('  2. Run migration: node scripts/migrations/001-create-rbac-system.js');
  } else {
    console.log('  1. Database appears to be migrated');
    console.log('  2. Test /api/users endpoint with proper authentication');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testParseConnection, checkUsersInDatabase, checkRolesInDatabase };