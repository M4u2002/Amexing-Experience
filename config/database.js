const winston = require('winston');

class DatabaseConfig {
  constructor() {
    this.uri = process.env.DATABASE_URI || 'mongodb://localhost:27017/amexingdb';
    this.name = process.env.DATABASE_NAME || 'amexingdb';
    this.options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      authSource: 'admin',
      retryWrites: true,
      w: 'majority',
    };
  }

  getConnectionString() {
    return this.uri;
  }

  getOptions() {
    return this.options;
  }

  async testConnection(mongoClient) {
    try {
      const client = new mongoClient(this.uri, this.options);
      await client.connect();
      await client.db(this.name).admin().ping();
      await client.close();
      winston.info('MongoDB connection test successful');
      return true;
    } catch (error) {
      winston.error('MongoDB connection test failed:', error);
      return false;
    }
  }
}

module.exports = new DatabaseConfig();