#!/usr/bin/env node

/**
 * Clean AmexingUser Table Script
 * Completely drops and recreates the AmexingUser table with clean schema
 * This removes all old columns and unused fields, keeping only standardized lifecycle fields
 */

require('dotenv').config({
  path: `./environments/.env.${process.env.NODE_ENV || 'development'}`,
});

const Parse = require('parse/node');
const { MongoClient } = require('mongodb');

async function cleanAmexingUserTable() {
  try {
    console.log('🔗 Initializing connections...');

    // Initialize Parse SDK
    Parse.initialize(
      process.env.PARSE_APP_ID || 'amexing-app-id',
      null,
      process.env.PARSE_MASTER_KEY || 'amexing-master-key'
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';

    // Connect to MongoDB directly for table operations
    const mongoClient = new MongoClient(process.env.DATABASE_URI);
    await mongoClient.connect();
    const db = mongoClient.db();

    console.log('✅ Connections established');

    // Step 1: Backup existing data (optional - in case we need to restore)
    console.log('📦 Creating backup of existing AmexingUser data...');

    const amexingUserCollection = db.collection('AmexingUser');
    const existingUsers = await amexingUserCollection.find({}).toArray();

    if (existingUsers.length > 0) {
      const backupCollection = `AmexingUser_backup_${Date.now()}`;
      await db.createCollection(backupCollection);
      await db.collection(backupCollection).insertMany(existingUsers);
      console.log(`📁 Backup created: ${existingUsers.length} users saved to ${backupCollection}`);
    } else {
      console.log('📁 No existing users found, skipping backup');
    }

    // Step 2: Drop the existing AmexingUser collection completely
    console.log('🗑️  Dropping AmexingUser collection...');

    try {
      await amexingUserCollection.drop();
      console.log('✅ AmexingUser collection dropped successfully');
    } catch (error) {
      if (error.codeName === 'NamespaceNotFound') {
        console.log('✅ AmexingUser collection did not exist, continuing...');
      } else {
        throw error;
      }
    }

    // Step 3: Create new collection with clean schema
    console.log('🏗️  Creating new AmexingUser collection with clean schema...');

    await db.createCollection('AmexingUser');

    // Create indexes for performance and uniqueness
    await amexingUserCollection.createIndex({ email: 1 }, { unique: true });
    await amexingUserCollection.createIndex({ username: 1 }, { unique: true });
    await amexingUserCollection.createIndex({ active: 1, exists: 1 }); // For lifecycle queries
    await amexingUserCollection.createIndex({ role: 1 });
    await amexingUserCollection.createIndex({ 'oauthAccounts.provider': 1, 'oauthAccounts.providerId': 1 });

    console.log('✅ New AmexingUser collection created with indexes');

    // Step 4: Verify the schema is clean (no old fields)
    console.log('🔍 Verifying clean schema...');

    const collections = await db.listCollections({ name: 'AmexingUser' }).toArray();
    if (collections.length === 1) {
      console.log('✅ AmexingUser collection exists and is clean');
    } else {
      throw new Error('Failed to create AmexingUser collection');
    }

    // Step 5: Close connections
    await mongoClient.close();

    console.log('🎉 AmexingUser table cleaned successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start your development server: yarn dev');
    console.log('2. Run the seed script: node scripts/seed-test-users.js');
    console.log('3. Test authentication with clean data');

  } catch (error) {
    console.error('❌ Error cleaning AmexingUser table:', error);
    process.exit(1);
  }
}

// Clean schema definition - what fields should exist after cleanup
const CLEAN_SCHEMA_FIELDS = {
  // Core Identity
  '_id': 'ObjectId',
  'email': 'String (unique)',
  'username': 'String (unique)',
  'passwordHash': 'String',

  // Profile Information
  'firstName': 'String',
  'lastName': 'String',
  'role': 'String',

  // Lifecycle Management (standardized)
  'active': 'Boolean',
  'exists': 'Boolean',

  // Authentication & Security
  'emailVerified': 'Boolean',
  'loginAttempts': 'Number',
  'lockedUntil': 'Date',
  'lastLoginAt': 'Date',
  'passwordChangedAt': 'Date',
  'mustChangePassword': 'Boolean',

  // OAuth Integration
  'oauthAccounts': 'Array',
  'primaryOAuthProvider': 'String',
  'lastAuthMethod': 'String',

  // Audit Trail
  'createdBy': 'String',
  'modifiedBy': 'String',
  'createdAt': 'Date',
  'updatedAt': 'Date',
};

console.log('🧹 AmexingUser Table Cleanup Script');
console.log('=====================================');
console.log('This script will:');
console.log('1. Backup existing AmexingUser data');
console.log('2. Drop the AmexingUser collection completely');
console.log('3. Create a new clean collection with proper indexes');
console.log('4. Remove all unused columns and legacy fields');
console.log('\n📊 Clean Schema Fields:');
Object.entries(CLEAN_SCHEMA_FIELDS).forEach(([field, type]) => {
  console.log(`  • ${field}: ${type}`);
});
console.log('\n⚠️  WARNING: This will remove all existing user data!');
console.log('Make sure your development server is NOT running before proceeding.\n');

// Run the script
if (require.main === module) {
  cleanAmexingUserTable()
    .then(() => {
      console.log('✨ Table cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error during cleanup:', error);
      process.exit(1);
    });
}

module.exports = { cleanAmexingUserTable, CLEAN_SCHEMA_FIELDS };