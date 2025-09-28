/**
 * Database Investigation Script
 * Investigates the AmexingUser and Role collections to understand the current schema structure
 * and check for the superadmin@dev.amexing.com user and its role associations.
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

async function investigateDatabase() {
  console.log('=== DATABASE INVESTIGATION REPORT ===\n');

  try {
    // 1. Check AmexingUser collection structure
    console.log('1. AMEXINGUSER COLLECTION ANALYSIS');
    console.log('-----------------------------------');

    const userQuery = new Parse.Query('AmexingUser');
    userQuery.limit(1);
    const sampleUsers = await userQuery.find({ useMasterKey: true });

    if (sampleUsers.length > 0) {
      const sampleUser = sampleUsers[0];
      console.log('Sample AmexingUser fields:');
      console.log('- ID:', sampleUser.id);
      console.log('- Username:', sampleUser.get('username'));
      console.log('- Email:', sampleUser.get('email'));
      console.log('- RoleId:', sampleUser.get('roleId'));
      console.log('- Role field type:', typeof sampleUser.get('roleId'));
      console.log('- All fields:', Object.keys(sampleUser.attributes));
    } else {
      console.log('No users found in AmexingUser collection');
    }

    // 2. Check for superadmin@dev.amexing.com specifically
    console.log('\n2. SUPERADMIN USER INVESTIGATION');
    console.log('--------------------------------');

    const superAdminQuery = new Parse.Query('AmexingUser');
    superAdminQuery.equalTo('email', 'superadmin@dev.amexing.com');
    const superAdmin = await superAdminQuery.first({ useMasterKey: true });

    if (superAdmin) {
      console.log('Superadmin user found:');
      console.log('- ID:', superAdmin.id);
      console.log('- Username:', superAdmin.get('username'));
      console.log('- Email:', superAdmin.get('email'));
      console.log('- RoleId:', superAdmin.get('roleId'));
      console.log('- RoleId type:', typeof superAdmin.get('roleId'));
      console.log('- Active:', superAdmin.get('active'));
      console.log('- Exists:', superAdmin.get('exists'));
      console.log('- EmailVerified:', superAdmin.get('emailVerified'));
      console.log('- OrganizationId:', superAdmin.get('organizationId'));
      console.log('- DelegatedPermissions:', superAdmin.get('delegatedPermissions'));
      console.log('- All attributes:', JSON.stringify(superAdmin.attributes, null, 2));
    } else {
      console.log('Superadmin user NOT FOUND');
    }

    // 3. Check Role collection
    console.log('\n3. ROLE COLLECTION ANALYSIS');
    console.log('---------------------------');

    const roleQuery = new Parse.Query('Role');
    const roles = await roleQuery.find({ useMasterKey: true });

    console.log(`Found ${roles.length} roles in the Role collection:`);
    roles.forEach((role, index) => {
      console.log(`${index + 1}. Role ID: ${role.id}`);
      console.log(`   - Name: ${role.get('name')}`);
      console.log(`   - DisplayName: ${role.get('displayName')}`);
      console.log(`   - Level: ${role.get('level')}`);
      console.log(`   - Scope: ${role.get('scope')}`);
      console.log(`   - Organization: ${role.get('organization')}`);
      console.log(`   - Active: ${role.get('active')}`);
      console.log(`   - Exists: ${role.get('exists')}`);
    });

    // 4. Check for superadmin role specifically
    console.log('\n4. SUPERADMIN ROLE INVESTIGATION');
    console.log('--------------------------------');

    const superAdminRoleQuery = new Parse.Query('Role');
    superAdminRoleQuery.equalTo('name', 'superadmin');
    const superAdminRole = await superAdminRoleQuery.first({ useMasterKey: true });

    if (superAdminRole) {
      console.log('Superadmin role found:');
      console.log('- ID:', superAdminRole.id);
      console.log('- Name:', superAdminRole.get('name'));
      console.log('- DisplayName:', superAdminRole.get('displayName'));
      console.log('- Level:', superAdminRole.get('level'));
      console.log('- BasePermissions:', superAdminRole.get('basePermissions'));
      console.log('- All attributes:', JSON.stringify(superAdminRole.attributes, null, 2));
    } else {
      console.log('Superadmin role NOT FOUND');
    }

    // 5. Test relationship query if both user and role exist
    console.log('\n5. USER-ROLE RELATIONSHIP VERIFICATION');
    console.log('-------------------------------------');

    if (superAdmin && superAdminRole) {
      console.log('Testing relationship...');
      const userRoleId = superAdmin.get('roleId');
      const roleId = superAdminRole.id;

      console.log('User roleId:', userRoleId);
      console.log('Superadmin role ID:', roleId);
      console.log('Relationship exists:', userRoleId === roleId);

      if (userRoleId !== roleId) {
        console.log('⚠️  ISSUE: User roleId does not match superadmin role ID');
      } else {
        console.log('✅ Relationship is correctly established');
      }
    } else {
      console.log('Cannot test relationship - missing user or role');
    }

    // 6. Count all users and their role associations
    console.log('\n6. USER-ROLE ASSOCIATION SUMMARY');
    console.log('--------------------------------');

    const allUsersQuery = new Parse.Query('AmexingUser');
    allUsersQuery.equalTo('exists', true);
    const allUsers = await allUsersQuery.find({ useMasterKey: true });

    console.log(`Total active users: ${allUsers.length}`);

    const roleAssociations = {};
    let usersWithNoRole = 0;

    for (const user of allUsers) {
      const roleId = user.get('roleId');
      if (roleId) {
        roleAssociations[roleId] = (roleAssociations[roleId] || 0) + 1;
      } else {
        usersWithNoRole++;
      }
    }

    console.log('Users without role assignment:', usersWithNoRole);
    console.log('Role associations:');
    for (const [roleId, count] of Object.entries(roleAssociations)) {
      console.log(`- Role ID ${roleId}: ${count} users`);
    }

  } catch (error) {
    console.error('Error during investigation:', error);
  }
}

// Run the investigation
investigateDatabase()
  .then(() => {
    console.log('\n=== INVESTIGATION COMPLETED ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Investigation failed:', error);
    process.exit(1);
  });