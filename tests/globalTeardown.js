/**
 * Jest Global Teardown
 * Runs once after all tests
 */

module.exports = async () => {
  console.log('Starting global test teardown...');

  // Stop in-memory MongoDB if it was started
  if (global.__MONGOD__) {
    console.log('Stopping in-memory MongoDB...');
    await global.__MONGOD__.stop();
    console.log('In-memory MongoDB stopped');
  }

  // Additional cleanup can go here
  console.log('Global test teardown complete');
};