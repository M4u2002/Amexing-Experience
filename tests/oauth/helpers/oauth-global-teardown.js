/**
 * Global Teardown for OAuth Testing
 * Cleans up test environment after OAuth permission system tests
 */

const Parse = require('parse/node');
const { MongoClient } = require('mongodb');
const redis = require('redis');

module.exports = async () => {
  console.log('🧹 Cleaning up OAuth test environment...');

  try {
    // Cleanup test database
    if (process.env.DATABASE_URI) {
      console.log('🗑️ Cleaning up test database...');
      const mongoClient = new MongoClient(process.env.DATABASE_URI);
      await mongoClient.connect();
      
      const db = mongoClient.db();
      
      // Clean up test collections
      const testCollections = [
        'AmexingUser',
        'CorporateConfig', 
        'OAuthProviderConfig',
        'PermissionAudit',
        'PermissionContext',
        'PermissionDelegation',
        'PermissionInheritance',
        '_Session'
      ];

      for (const collectionName of testCollections) {
        try {
          const collection = db.collection(collectionName);
          const deleteResult = await collection.deleteMany({
            $or: [
              { 'username': { $regex: /^test-/ } },
              { 'email': { $regex: /@company\.com$/ } },
              { 'testGenerated': true },
              { 'isTestData': true }
            ]
          });
          
          if (deleteResult.deletedCount > 0) {
            console.log(`✅ Cleaned ${deleteResult.deletedCount} documents from ${collectionName}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not clean collection ${collectionName}:`, error.message);
        }
      }

      await mongoClient.close();
      console.log('✅ Database cleanup completed');
    }

    // Cleanup Redis cache
    if (process.env.REDIS_URL) {
      console.log('🔄 Cleaning up Redis test cache...');
      const redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
      
      // Clean up test-related cache keys
      const testKeys = await redisClient.keys('test:*');
      const oauthKeys = await redisClient.keys('oauth:test:*');
      const permissionKeys = await redisClient.keys('permission:test:*');
      
      const allTestKeys = [...testKeys, ...oauthKeys, ...permissionKeys];
      
      if (allTestKeys.length > 0) {
        await redisClient.del(allTestKeys);
        console.log(`✅ Cleaned ${allTestKeys.length} cache keys from Redis`);
      }
      
      await redisClient.disconnect();
      console.log('✅ Redis cleanup completed');
    }

    // Clean up global test variables
    if (global.testUsers) {
      delete global.testUsers;
    }
    
    if (global.oauthMocks) {
      delete global.oauthMocks;
    }
    
    if (global.testSessions) {
      delete global.testSessions;
    }

    // Clean up temporary test files if any were created
    console.log('📁 Cleaning up temporary test files...');
    const fs = require('fs').promises;
    const path = require('path');
    
    const tempTestDir = path.join(__dirname, '..', 'temp');
    try {
      const files = await fs.readdir(tempTestDir);
      for (const file of files) {
        if (file.startsWith('test-') || file.includes('oauth-test')) {
          await fs.unlink(path.join(tempTestDir, file));
        }
      }
    } catch (error) {
      // Temp directory might not exist, which is fine
    }

    // Generate test run summary
    console.log('📋 Generating test run summary...');
    const summary = {
      timestamp: new Date().toISOString(),
      environment: 'oauth-test',
      cleanup: {
        database: 'completed',
        redis: process.env.REDIS_URL ? 'completed' : 'skipped',
        globals: 'completed',
        tempFiles: 'completed'
      },
      testUsers: global.testUsers ? Object.keys(global.testUsers).length : 0
    };

    // Log summary to console
    console.log('📊 OAuth Test Cleanup Summary:');
    console.log(`   Timestamp: ${summary.timestamp}`);
    console.log(`   Database: ${summary.cleanup.database}`);
    console.log(`   Redis: ${summary.cleanup.redis}`);
    console.log(`   Test Users Cleaned: ${summary.testUsers}`);

    console.log('✅ OAuth test environment cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Failed to clean up OAuth test environment:', error);
    
    // Don't fail the test suite if cleanup fails
    console.warn('⚠️ Continuing despite cleanup errors...');
  }
};