/**
 * SettingsService Integration Tests
 * Tests setting retrieval, caching, and type coercion functionality
 */

const Parse = require('parse/node');
const SettingsService = require('../../../src/application/services/SettingsService');
const Setting = require('../../../src/domain/models/Setting');

describe('SettingsService Integration Tests', () => {
  let settingsService;

  beforeAll(async () => {
    // Initialize Parse for test environment
    Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1339/parse';

    // Create service instance
    settingsService = new SettingsService();

    // Create test setting
    const setting = new Setting();
    setting.set('key', 'test Payment SurchargePercentage');
    setting.set('value', 21.09);
    setting.set('valueType', 'number');
    setting.set('category', 'pricing');
    setting.set('description', 'Test surcharge setting');
    setting.set('editable', true);
    setting.set('active', true);
    setting.set('exists', true);
    await setting.save(null, { useMasterKey: true });
  }, 30000);

  afterAll(async () => {
    // Cleanup test settings
    const query = new Parse.Query('Setting');
    query.equalTo('key', 'testPaymentSurchargePercentage');
    const setting = await query.first({ useMasterKey: true });
    if (setting) {
      setting.set('exists', false);
      await setting.save(null, { useMasterKey: true });
    }
  });

  beforeEach(() => {
    // Clear cache before each test
    settingsService.clearCache();
  });

  describe('getSetting', () => {
    it('should retrieve a setting by key', async () => {
      const setting = await settingsService.getSetting('testPaymentSurchargePercentage');

      expect(setting).toBeDefined();
      expect(setting.getKey()).toBe('testPaymentSurchargePercentage');
      expect(setting.getValue()).toBe(21.09);
      expect(setting.getValueType()).toBe('number');
    });

    it('should return null for non-existent setting', async () => {
      const setting = await settingsService.getSetting('nonExistentSetting');

      expect(setting).toBeNull();
    });

    it('should use cache on second retrieval', async () => {
      // First call - should hit database
      const setting1 = await settingsService.getSetting('testPaymentSurchargePercentage');
      expect(setting1).toBeDefined();

      // Second call - should use cache
      const setting2 = await settingsService.getSetting('testPaymentSurchargePercentage');
      expect(setting2).toBeDefined();
      expect(setting2.id).toBe(setting1.id);

      // Verify cache stats
      const stats = settingsService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('getValue', () => {
    it('should retrieve typed value', async () => {
      const value = await settingsService.getValue('testPaymentSurchargePercentage');

      expect(value).toBe(21.09);
      expect(typeof value).toBe('number');
    });

    it('should return default value for non-existent setting', async () => {
      const value = await settingsService.getValue('nonExistent', 'default');

      expect(value).toBe('default');
    });
  });

  describe('getNumericValue', () => {
    it('should retrieve numeric value', async () => {
      const value = await settingsService.getNumericValue('testPaymentSurchargePercentage', 0);

      expect(value).toBe(21.09);
      expect(typeof value).toBe('number');
    });

    it('should return default for non-existent setting', async () => {
      const value = await settingsService.getNumericValue('nonExistent', 15.5);

      expect(value).toBe(15.5);
    });
  });

  describe('exists', () => {
    it('should return true for existing active setting', async () => {
      const exists = await settingsService.exists('testPaymentSurchargePercentage');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent setting', async () => {
      const exists = await settingsService.exists('nonExistent');

      expect(exists).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      // Populate cache
      await settingsService.getSetting('testPaymentSurchargePercentage');

      let stats = settingsService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      settingsService.clearCache();

      stats = settingsService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should invalidate specific cache entry', async () => {
      // Populate cache
      await settingsService.getSetting('testPaymentSurchargePercentage');

      // Invalidate specific key
      settingsService.invalidateCache('testPaymentSurchargePercentage');

      // Cache should be cleared for that key
      const stats = settingsService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should update cache timeout', () => {
      const newTimeout = 120000; // 2 minutes
      settingsService.setCacheTimeout(newTimeout);

      const stats = settingsService.getCacheStats();
      expect(stats.timeout).toBe(newTimeout);
    });
  });
});
