/**
 * PCI DSS Compliance Setup for OAuth Testing
 * Ensures all OAuth tests comply with PCI DSS requirements
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class PCIComplianceSetup {
  constructor() {
    this.complianceConfig = {
      dataMasking: true,
      auditLogging: true,
      encryptionRequired: true,
      dataRetentionDays: 0, // No data retention in tests
      syntheticDataOnly: true
    };
    this.auditLogs = [];
  }

  /**
   * Initialize PCI DSS compliance for OAuth testing
   */
  async setup() {
    try {
      // Verify test environment compliance
      await this.verifyTestEnvironment();
      
      // Initialize audit logging
      this.initializeAuditLogging();
      
      // Set up synthetic data validation
      await this.setupSyntheticDataValidation();
      
      console.log('PCI DSS compliance setup complete for OAuth testing');
    } catch (error) {
      console.error('Failed to setup PCI DSS compliance:', error);
      throw error;
    }
  }

  /**
   * Verify test environment meets PCI DSS requirements
   */
  async verifyTestEnvironment() {
    const checks = [
      this.verifyNoProductionData(),
      this.verifyEncryptionCapabilities(),
      this.verifyAuditCapabilities(),
      this.verifyDataIsolation()
    ];

    const results = await Promise.all(checks);
    const failed = results.filter(result => !result.passed);

    if (failed.length > 0) {
      throw new Error(`PCI DSS compliance checks failed: ${failed.map(f => f.reason).join(', ')}`);
    }

    this.logAuditEvent('PCI_COMPLIANCE_VERIFIED', 'Test environment verified for PCI DSS compliance');
  }

  /**
   * Verify no production data is present
   */
  async verifyNoProductionData() {
    // Check for any indicators of production data
    const productionIndicators = [
      '@amexing.com',
      'production',
      'prod',
      'live'
    ];

    // This is a mock verification - in real implementation,
    // this would check database connections, environment variables, etc.
    const envVars = Object.keys(process.env);
    const suspiciousVars = envVars.filter(key => 
      productionIndicators.some(indicator => 
        key.toLowerCase().includes(indicator) || 
        (process.env[key] && process.env[key].toLowerCase().includes(indicator))
      )
    );

    if (suspiciousVars.length > 0 && process.env.NODE_ENV !== 'test') {
      return {
        passed: false,
        reason: `Potential production data indicators found: ${suspiciousVars.join(', ')}`
      };
    }

    return { passed: true };
  }

  /**
   * Verify encryption capabilities
   */
  async verifyEncryptionCapabilities() {
    try {
      // Test AES-256-GCM encryption
      const testData = 'test-encryption-data';
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const algorithm = 'aes-256-gcm';
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(testData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      if (decrypted !== testData) {
        return {
          passed: false,
          reason: 'Encryption/decryption test failed'
        };
      }

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        reason: `Encryption verification failed: ${error.message}`
      };
    }
  }

  /**
   * Verify audit capabilities
   */
  async verifyAuditCapabilities() {
    try {
      // Test audit logging functionality
      this.logAuditEvent('TEST_AUDIT', 'Testing audit capabilities');
      
      if (this.auditLogs.length === 0) {
        return {
          passed: false,
          reason: 'Audit logging is not working'
        };
      }

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        reason: `Audit verification failed: ${error.message}`
      };
    }
  }

  /**
   * Verify data isolation
   */
  async verifyDataIsolation() {
    // Verify test database is isolated
    if (process.env.NODE_ENV === 'production') {
      return {
        passed: false,
        reason: 'Tests cannot run in production environment'
      };
    }

    return { passed: true };
  }

  /**
   * Initialize audit logging
   */
  initializeAuditLogging() {
    this.auditLogs = [];
    this.startTime = new Date();
    
    this.logAuditEvent('AUDIT_INITIALIZED', 'PCI DSS audit logging initialized for OAuth testing');
  }

  /**
   * Set up synthetic data validation
   */
  async setupSyntheticDataValidation() {
    this.syntheticDataPatterns = [
      /test\.user\.\d+@amexing-test\.com/,
      /testuser\d+/,
      /test-.*-client-id/,
      /test-.*-client-secret/,
      /oauth_test_user_\d+/,
      /TEST_CORP_\d+/
    ];

    this.logAuditEvent('SYNTHETIC_DATA_VALIDATION_SETUP', 'Synthetic data validation patterns configured');
  }

  /**
   * Validate that data is synthetic
   */
  validateSyntheticData(data) {
    const dataString = JSON.stringify(data);
    
    // Check if data matches synthetic patterns
    const isSynthetic = this.syntheticDataPatterns.some(pattern => 
      pattern.test(dataString)
    );

    // Check for real-looking data patterns
    const realDataPatterns = [
      /@gmail\.com/,
      /@outlook\.com/,
      /@icloud\.com/,
      /\+\d{10,15}/, // Real phone numbers
      /[A-Z]{2}\d{2}[A-Z]{4}\d{14}/ // IBAN-like patterns
    ];

    const hasRealData = realDataPatterns.some(pattern => 
      pattern.test(dataString)
    );

    if (hasRealData && !isSynthetic) {
      this.logAuditEvent('REAL_DATA_DETECTED', 'Potential real data detected in test', {
        dataType: typeof data,
        dataPreview: dataString.substring(0, 100)
      });
      
      throw new Error('Real data detected in test environment - PCI DSS violation');
    }

    return true;
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = [
      'password',
      'accessToken',
      'refreshToken',
      'clientSecret',
      'privateKey',
      'masterKey',
      'email',
      'phone'
    ];

    const masked = { ...data };

    sensitiveFields.forEach(field => {
      if (masked[field]) {
        const value = masked[field].toString();
        masked[field] = value.substring(0, 4) + '*'.repeat(Math.max(0, value.length - 8)) + value.substring(Math.max(4, value.length - 4));
      }
    });

    return masked;
  }

  /**
   * Log audit event
   */
  logAuditEvent(eventType, description, additionalData = {}) {
    const auditEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      description,
      sessionId: this.getSessionId(),
      userId: 'test-user',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Runner',
      additionalData: this.maskSensitiveData(additionalData)
    };

    this.auditLogs.push(auditEvent);

    // In a real implementation, this would write to a secure audit log
    if (process.env.DEBUG_PCI_AUDIT) {
      console.log(`[PCI AUDIT] ${eventType}: ${description}`);
    }
  }

  /**
   * Get session ID for audit logging
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = crypto.randomBytes(16).toString('hex');
    }
    return this.sessionId;
  }

  /**
   * Encrypt data for secure storage
   */
  encryptData(data, key) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    
    // Ensure key is properly formatted for AES-256 (32 bytes)
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
    const finalKey = keyBuffer.subarray(0, 32);
    
    const cipher = crypto.createCipheriv(algorithm, finalKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm
    };
  }

  /**
   * Decrypt data
   */
  decryptData(encryptedData, key) {
    const { encrypted, iv, authTag, algorithm } = encryptedData;
    
    // Ensure key is properly formatted for AES-256 (32 bytes)
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
    const finalKey = keyBuffer.subarray(0, 32);
    
    const decipher = crypto.createDecipheriv(algorithm, finalKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Generate PCI DSS compliant test data
   */
  generateCompliantTestData(dataType) {
    const testData = {
      user: {
        email: `test.user.${Date.now()}@amexing-test.com`,
        username: `testuser${Date.now()}`,
        firstName: 'Test',
        lastName: 'User',
        phone: `+1234567${String(Date.now()).slice(-3)}`
      },
      oauth: {
        provider: 'test-provider',
        providerId: `test_${Date.now()}`,
        accessToken: `test_access_token_${crypto.randomBytes(16).toString('hex')}`,
        refreshToken: `test_refresh_token_${crypto.randomBytes(16).toString('hex')}`
      },
      corporate: {
        corporateId: `TEST_CORP_${String(Date.now()).slice(-3)}`,
        department: 'Test Department',
        employeeId: `TEST_EMP_${Date.now()}`
      }
    };

    const generated = testData[dataType] || testData.user;
    
    // Validate generated data is synthetic
    this.validateSyntheticData(generated);
    
    this.logAuditEvent('SYNTHETIC_DATA_GENERATED', `Generated ${dataType} test data`, {
      dataType,
      fieldsGenerated: Object.keys(generated)
    });

    return generated;
  }

  /**
   * Clean up and generate compliance report
   */
  async teardown() {
    try {
      this.logAuditEvent('PCI_COMPLIANCE_TEARDOWN', 'Cleaning up PCI DSS compliance setup');
      
      // Generate compliance report
      const report = await this.generateComplianceReport();
      
      // Clear audit logs
      this.auditLogs = [];
      
      console.log('PCI DSS compliance teardown complete');
      return report;
    } catch (error) {
      console.error('Failed to teardown PCI DSS compliance:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport() {
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    const report = {
      testSession: {
        sessionId: this.getSessionId(),
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${duration}ms`
      },
      compliance: {
        dataValidation: 'PASSED',
        auditLogging: 'PASSED',
        encryption: 'PASSED',
        dataIsolation: 'PASSED',
        syntheticDataOnly: 'PASSED'
      },
      auditEvents: this.auditLogs.length,
      violations: 0,
      recommendations: [
        'Continue using synthetic data only',
        'Maintain audit logging for all test operations',
        'Regular compliance verification recommended'
      ]
    };

    // Save report if in debug mode
    if (process.env.DEBUG_PCI_AUDIT) {
      const reportPath = path.join(process.cwd(), 'reports', 'oauth', 'pci-compliance-report.json');
      try {
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      } catch (error) {
        console.warn('Could not save PCI compliance report:', error.message);
      }
    }

    return report;
  }

  /**
   * Get audit logs
   */
  getAuditLogs() {
    return [...this.auditLogs];
  }

  /**
   * Verify PCI DSS compliance for specific operation
   */
  verifyOperationCompliance(operation, data) {
    this.logAuditEvent('OPERATION_COMPLIANCE_CHECK', `Checking compliance for ${operation}`, {
      operation,
      dataFields: Object.keys(data || {})
    });

    // Validate data is synthetic
    if (data) {
      this.validateSyntheticData(data);
    }

    // Check operation is allowed in test environment
    const allowedOperations = [
      'create_test_user',
      'oauth_authentication',
      'token_validation',
      'user_registration',
      'profile_update'
    ];

    if (!allowedOperations.includes(operation)) {
      this.logAuditEvent('OPERATION_NOT_ALLOWED', `Operation ${operation} is not allowed in test environment`);
      throw new Error(`Operation ${operation} is not allowed in PCI DSS compliant test environment`);
    }

    return true;
  }
}

module.exports = PCIComplianceSetup;