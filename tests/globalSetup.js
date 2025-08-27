/**
 * Jest Global Setup
 * Runs once before all tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Start in-memory MongoDB for testing if no test database is configured
  if (!process.env.TEST_DATABASE_URI) {
    console.log('Starting in-memory MongoDB for testing...');
    
    const mongod = new MongoMemoryServer({
      instance: {
        dbName: 'AmexingTEST',
        port: 27018, // Different port to avoid conflicts
      },
    });

    await mongod.start();
    const uri = mongod.getUri();
    
    // Store MongoDB instance in global for cleanup
    global.__MONGOD__ = mongod;
    
    // Set database URI for tests
    process.env.TEST_DATABASE_URI = uri;
    process.env.DATABASE_URI = uri;
    
    console.log('In-memory MongoDB started at:', uri);
  } else {
    console.log('Using configured test database:', process.env.TEST_DATABASE_URI);
  }

  // Additional global setup can go here
  console.log('Global test setup complete');
};