/**
 * Parse Server Integration Tests
 */

const Parse = require('parse/node');
const { setupTests, teardownTests, clearDatabase } = require('../setup');
const { createTestUser, createTestObject } = require('../helpers/testUtils');

describe('Parse Server Integration', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('User Management', () => {
    it('should create a new user', async () => {
      const userData = {
        username: 'integrationtest',
        email: 'integration@test.com',
        password: 'TestPass123!'
      };

      const user = await createTestUser(userData);

      expect(user.id).toBeDefined();
      expect(user.get('username')).toBe(userData.username);
      expect(user.get('email')).toBe(userData.email);
    });

    it('should authenticate user with correct credentials', async () => {
      const userData = {
        username: 'logintest',
        email: 'login@test.com',
        password: 'TestPass123!'
      };

      await createTestUser(userData);
      
      const loggedInUser = await Parse.User.logIn(userData.username, userData.password);
      
      expect(loggedInUser.id).toBeDefined();
      expect(loggedInUser.get('username')).toBe(userData.username);
      expect(loggedInUser.getSessionToken()).toBeDefined();
    });

    it('should reject authentication with incorrect credentials', async () => {
      const userData = {
        username: 'wronglogintest',
        email: 'wronglogin@test.com',
        password: 'TestPass123!'
      };

      await createTestUser(userData);
      
      await expect(
        Parse.User.logIn(userData.username, 'wrongpassword')
      ).rejects.toThrow();
    });

    it('should enforce unique username constraint', async () => {
      const userData = {
        username: 'duplicatetest',
        email: 'duplicate1@test.com',
        password: 'TestPass123!'
      };

      await createTestUser(userData);
      
      // Try to create another user with same username
      await expect(
        createTestUser({
          ...userData,
          email: 'duplicate2@test.com'
        })
      ).rejects.toThrow();
    });
  });

  describe('Object Management', () => {
    it('should create and retrieve objects', async () => {
      const testData = {
        name: 'Test Product',
        price: 99.99,
        category: 'electronics'
      };

      const createdObject = await createTestObject('Product', testData);

      expect(createdObject.id).toBeDefined();
      expect(createdObject.get('name')).toBe(testData.name);
      expect(createdObject.get('price')).toBe(testData.price);

      // Retrieve the object
      const query = new Parse.Query('Product');
      const retrievedObject = await query.get(createdObject.id);

      expect(retrievedObject.id).toBe(createdObject.id);
      expect(retrievedObject.get('name')).toBe(testData.name);
    });

    it('should update objects', async () => {
      const testData = {
        name: 'Test Product',
        price: 99.99
      };

      const object = await createTestObject('Product', testData);
      
      // Update the object
      object.set('price', 149.99);
      object.set('name', 'Updated Product');
      await object.save();

      // Verify update
      const query = new Parse.Query('Product');
      const updatedObject = await query.get(object.id);

      expect(updatedObject.get('price')).toBe(149.99);
      expect(updatedObject.get('name')).toBe('Updated Product');
    });

    it('should delete objects', async () => {
      const testData = {
        name: 'Delete Test Product',
        price: 50.00
      };

      const object = await createTestObject('Product', testData);
      const objectId = object.id;
      
      // Delete the object
      await object.destroy();

      // Verify deletion
      const query = new Parse.Query('Product');
      await expect(query.get(objectId)).rejects.toThrow();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test data
      await createTestObject('Product', { name: 'Product A', price: 100, category: 'electronics' });
      await createTestObject('Product', { name: 'Product B', price: 200, category: 'electronics' });
      await createTestObject('Product', { name: 'Product C', price: 150, category: 'books' });
    });

    it('should find objects with simple query', async () => {
      const query = new Parse.Query('Product');
      query.equalTo('category', 'electronics');
      
      const results = await query.find();
      
      expect(results.length).toBe(2);
      results.forEach(product => {
        expect(product.get('category')).toBe('electronics');
      });
    });

    it('should find objects with complex query', async () => {
      const query = new Parse.Query('Product');
      query.equalTo('category', 'electronics');
      query.greaterThan('price', 150);
      
      const results = await query.find();
      
      expect(results.length).toBe(1);
      expect(results[0].get('name')).toBe('Product B');
      expect(results[0].get('price')).toBe(200);
    });

    it('should count objects', async () => {
      const query = new Parse.Query('Product');
      const count = await query.count();
      
      expect(count).toBe(3);
    });

    it('should limit and skip results', async () => {
      const query = new Parse.Query('Product');
      query.limit(2);
      query.skip(1);
      query.ascending('price');
      
      const results = await query.find();
      
      expect(results.length).toBe(2);
      expect(results[0].get('price')).toBe(150);
      expect(results[1].get('price')).toBe(200);
    });
  });

  describe('Security and ACL', () => {
    it('should respect user-based ACL', async () => {
      const user = await createTestUser({
        username: 'acltest',
        email: 'acl@test.com',
        password: 'TestPass123!'
      });

      // Create object with user ACL
      const Product = Parse.Object.extend('Product');
      const product = new Product();
      product.set('name', 'Private Product');
      product.set('price', 999.99);
      
      const acl = new Parse.ACL(user);
      product.setACL(acl);
      
      await product.save();

      // Try to access as different user
      const anotherUser = await createTestUser({
        username: 'anotheruser',
        email: 'another@test.com',
        password: 'TestPass123!'
      });

      Parse.User.current = anotherUser;

      const query = new Parse.Query('Product');
      const results = await query.find();

      // Should not see the private product
      expect(results.length).toBe(0);
    });
  });
});