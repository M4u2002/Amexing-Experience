# Secure Development Guide - PCI DSS Compliant Code
**Development Standards for AmexingWeb Payment Processing Application**

## Overview

This guide provides mandatory security practices for all code development on AmexingWeb to maintain PCI DSS 4.0 compliance. Every code change must follow these guidelines to avoid breaking our security posture and compliance status.

## 🚨 **CRITICAL: Pre-Development Checklist**

Before writing any code, developers MUST verify:

### ✅ **Security Context Assessment**
- [ ] **Data Classification**: Will this code handle cardholder data (CHD)?
- [ ] **PCI Scope**: Does this change affect systems in the PCI DSS scope?
- [ ] **Authentication**: Will this modify authentication or authorization flows?
- [ ] **Input Handling**: Will this process user input or external data?
- [ ] **Network Communication**: Will this establish network connections?

### ✅ **Compliance Impact Check**
- [ ] **Requirement 6 (Secure Development)**: Following secure coding standards?
- [ ] **Requirement 7 (Access Control)**: Implementing least privilege?
- [ ] **Requirement 8 (Authentication)**: Maintaining strong authentication?
- [ ] **Requirement 10 (Logging)**: Including appropriate audit logging?
- [ ] **Requirement 4 (Encryption)**: Using approved cryptographic methods?

---

## 🔐 **Mandatory Security Practices**

### 1. Input Validation & Sanitization (Req 6.2.4.a)

#### **REQUIRED: Input Validation Framework**
```javascript
// ✅ CORRECT: Comprehensive input validation
const { body, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Apply to ALL routes that accept input
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks

// Validate EVERY input field
const validateUserInput = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be alphanumeric'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must meet complexity requirements')
];

// ❌ FORBIDDEN: Direct database queries without validation
// User.findOne({ username: req.body.username }); // DANGEROUS!

// ✅ REQUIRED: Always validate before processing
app.post('/api/users', validateUserInput, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.logSecurityEvent('INVALID_INPUT_ATTEMPT', {
      ip: req.ip,
      errors: errors.array(),
      url: req.url
    });
    return res.status(400).json({ errors: errors.array() });
  }
  // Process validated input...
});
```

#### **REQUIRED: File Upload Security**
```javascript
// ✅ CORRECT: Secure file upload implementation
const multer = require('multer');
const path = require('path');

const secureUpload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // REQUIRED: Whitelist allowed file types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      logger.logSecurityEvent('UNAUTHORIZED_FILE_UPLOAD', {
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip
      });
      cb(new Error('Unauthorized file type'));
    }
  }
});
```

### 2. Authentication & Authorization (Req 8)

#### **REQUIRED: Session Management**
```javascript
// ✅ CORRECT: Secure session configuration
const session = require('express-session');
const MongoStore = require('connect-mongo');

const sessionConfig = {
  secret: process.env.SESSION_SECRET, // REQUIRED: Strong random secret
  name: 'sessionId', // REQUIRED: Don't use default names
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE_URI,
    ttl: 15 * 60 // REQUIRED: 15-minute timeout (Req 8.2.8)
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // REQUIRED: HTTPS only in production
    httpOnly: true, // REQUIRED: Prevent XSS
    maxAge: 15 * 60 * 1000, // REQUIRED: 15-minute expiry
    sameSite: 'strict' // REQUIRED: CSRF protection
  }
};

// ❌ FORBIDDEN: Weak session configuration
// { secret: 'mysecret', cookie: { secure: false } } // DANGEROUS!
```

#### **REQUIRED: Authentication Middleware**
```javascript
// ✅ REQUIRED: Authentication check for protected routes
const requireAuth = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-parse-session-token'];
    
    if (!sessionToken) {
      logger.logAccessAttempt(false, null, req.ip, 'Missing session token');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // REQUIRED: Validate session with Parse Server
    const user = await Parse.User.become(sessionToken);
    
    if (!user) {
      logger.logAccessAttempt(false, null, req.ip, 'Invalid session token');
      return res.status(401).json({ error: 'Invalid session' });
    }

    // REQUIRED: Check for inactive accounts (Req 8.2.6)
    if (!user.get('active')) {
      logger.logSecurityEvent('INACTIVE_ACCOUNT_ACCESS', {
        userId: user.id,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Account inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.logAccessAttempt(false, null, req.ip, error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// REQUIRED: Apply to all protected routes
app.use('/api/protected/*', requireAuth);
```

### 3. Cryptography & Data Protection (Req 3, 4)

#### **REQUIRED: Encryption Standards**
```javascript
// ✅ CORRECT: Use approved encryption methods
const crypto = require('crypto');

class SecureDataHandler {
  constructor() {
    // REQUIRED: AES-256-GCM only (approved algorithm)
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
  }

  // REQUIRED: Encrypt sensitive data before storage
  encryptSensitiveData(data, key) {
    if (!data || !key) {
      throw new Error('Data and key required for encryption');
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('PCI-DSS-AmexingWeb', 'utf8'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // REQUIRED: Decrypt data securely
  decryptSensitiveData(encryptedData, key) {
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('PCI-DSS-AmexingWeb', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// ❌ FORBIDDEN: Weak encryption methods
// crypto.createCipher('des', key); // DANGEROUS! Weak algorithm
// Buffer.from(data).toString('base64'); // NOT ENCRYPTION!
```

#### **REQUIRED: PAN Handling (If Applicable)**
```javascript
// ✅ CORRECT: PAN masking for display (Req 3.4.1)
function maskPAN(pan) {
  if (!pan || pan.length < 13) {
    return '****';
  }
  
  // REQUIRED: Show only first 6 and last 4 digits
  const firstSix = pan.substring(0, 6);
  const lastFour = pan.substring(pan.length - 4);
  const masked = '*'.repeat(pan.length - 10);
  
  return `${firstSix}${masked}${lastFour}`;
}

// ✅ REQUIRED: Never log full PAN
function logPaymentTransaction(transactionData) {
  const safeData = {
    ...transactionData,
    pan: maskPAN(transactionData.pan), // REQUIRED: Mask before logging
    amount: transactionData.amount,
    timestamp: new Date().toISOString()
  };
  
  logger.info('Payment transaction', safeData);
}

// ❌ FORBIDDEN: Full PAN in logs or displays
// console.log(`Processing payment for card: ${fullPAN}`); // VIOLATION!
```

### 4. Security Logging (Req 10)

#### **REQUIRED: Audit Logging Framework**
```javascript
// ✅ REQUIRED: Comprehensive security logging
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // REQUIRED: Separate security log file
    new winston.transports.File({ 
      filename: 'logs/security-audit.log',
      maxsize: 10 * 1024 * 1024, // 10MB rotation
      maxFiles: 12 // Keep 12 months
    }),
    // REQUIRED: Real-time monitoring
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// REQUIRED: Log all security-relevant events
function logSecurityEvent(eventType, details) {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    severity: getSeverityLevel(eventType),
    details,
    // REQUIRED: Include user context when available
    userId: details.userId || 'anonymous',
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    sessionId: details.sessionId || 'none'
  };

  securityLogger.info('SECURITY_EVENT', securityEvent);

  // REQUIRED: Real-time alerting for critical events
  if (['AUTHENTICATION_FAILURE', 'AUTHORIZATION_FAILURE', 'SUSPICIOUS_ACTIVITY'].includes(eventType)) {
    alertSecurityTeam(securityEvent);
  }
}

// REQUIRED: Log authentication attempts (Req 10.2.1.2)
function logAuthenticationAttempt(success, username, ip, details = {}) {
  logSecurityEvent('AUTHENTICATION_ATTEMPT', {
    success,
    username: username || 'unknown',
    ip,
    details,
    timestamp: new Date().toISOString()
  });
}
```

### 5. Error Handling & Information Disclosure

#### **REQUIRED: Secure Error Handling**
```javascript
// ✅ CORRECT: Secure error handling
function secureErrorHandler(err, req, res, next) {
  // REQUIRED: Log full error details for internal use
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  });

  // REQUIRED: Generic error message for client
  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = {
    error: 'An error occurred',
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  // FORBIDDEN: Expose internal details in production
  if (!isProduction) {
    errorResponse.details = err.message; // Only in development
  }

  res.status(err.status || 500).json(errorResponse);
}

// ❌ FORBIDDEN: Exposing sensitive information
// res.status(500).json({ error: err.stack }); // DANGEROUS!
// res.json({ dbConnectionString: process.env.DATABASE_URI }); // VIOLATION!
```

---

## 🔍 **Code Review Checklist**

### Security Review Requirements

Every pull request MUST pass this security checklist:

#### **Input Security ✅**
- [ ] All user inputs validated with express-validator
- [ ] SQL/NoSQL injection prevention implemented
- [ ] XSS protection applied to outputs
- [ ] File upload restrictions enforced
- [ ] Rate limiting applied to endpoints

#### **Authentication & Authorization ✅**
- [ ] Authentication required for protected resources
- [ ] Authorization checks implement least privilege
- [ ] Session management follows security standards
- [ ] Password policies enforced
- [ ] Account lockout mechanisms in place

#### **Data Protection ✅**
- [ ] Sensitive data encrypted with approved algorithms
- [ ] PAN masked in all displays and logs
- [ ] Encryption keys managed securely
- [ ] Data retention policies followed
- [ ] Secure data transmission (HTTPS)

#### **Logging & Monitoring ✅**
- [ ] Security events logged appropriately
- [ ] Authentication attempts logged
- [ ] Access to cardholder data logged
- [ ] No sensitive data in log files
- [ ] Log integrity protection implemented

#### **Error Handling ✅**
- [ ] Errors handled securely without information disclosure
- [ ] Generic error messages for clients
- [ ] Detailed logging for internal use
- [ ] No stack traces exposed in production
- [ ] Graceful degradation implemented

---

## 🚀 **Development Workflow Integration**

### Pre-Commit Hooks (REQUIRED)

```bash
#!/bin/bash
# .git/hooks/pre-commit - REQUIRED for all commits

set -e
echo "🔒 Running PCI DSS compliance checks..."

# REQUIRED: Security linting
echo "1. Running ESLint security rules..."
npm run lint:security || exit 1

# REQUIRED: Static security analysis
echo "2. Running Semgrep security analysis..."
semgrep --config=auto src/ || exit 1

# REQUIRED: Dependency vulnerability check
echo "3. Checking for vulnerabilities..."
npm audit --audit-level high || exit 1

# REQUIRED: Secrets detection
echo "4. Scanning for secrets..."
git diff --cached --name-only | xargs grep -l "password\|secret\|key" && {
  echo "⚠️  Potential secrets detected in staged files"
  echo "Please review and ensure no actual secrets are committed"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
}

echo "✅ All security checks passed!"
```

### Git Hooks Installation (REQUIRED)

**⚠️ IMPORTANT**: All developers MUST install automated Git hooks for validation.

```bash
# Install required git hooks
yarn hooks:install

# Verify installation
yarn hooks:validate

# Test hooks functionality
yarn hooks:test
```

**Automated validation includes**:
- ✅ **Conventional commit format** - Ensures consistent commit messages
- ✅ **Security classification** - Requires classification for security changes
- ✅ **PCI DSS compliance** - Requirement reference validation
- ✅ **Secret detection** - Prevents credential commits

**📚 Complete guide**: [Commit Message Guidelines](COMMIT_GUIDELINES.md)

### Testing Requirements (REQUIRED)

```javascript
// REQUIRED: Security test coverage
describe('Security Tests - PCI DSS Compliance', () => {
  
  // REQUIRED: Input validation tests
  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const response = await request(app)
        .post('/api/users')
        .send({ username: maliciousInput });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should sanitize XSS attempts', async () => {
      const xssInput = '<script>alert("xss")</script>';
      const response = await request(app)
        .post('/api/comments')
        .send({ content: xssInput });
      
      expect(response.body.content).not.toContain('<script>');
    });
  });

  // REQUIRED: Authentication tests
  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/protected/data');
      
      expect(response.status).toBe(401);
    });

    it('should implement session timeout', async () => {
      // Test 15-minute session timeout requirement
      const oldSession = await loginUser();
      
      // Simulate 16 minutes passing
      jest.advanceTimersByTime(16 * 60 * 1000);
      
      const response = await request(app)
        .get('/api/protected/data')
        .set('Authorization', `Bearer ${oldSession.token}`);
      
      expect(response.status).toBe(401);
    });
  });

  // REQUIRED: Data protection tests
  describe('Data Protection', () => {
    it('should mask PAN in responses', async () => {
      const response = await request(app)
        .get('/api/payment-methods')
        .set('Authorization', `Bearer ${validToken}`);
      
      const panPattern = /^\d{6}\*+\d{4}$/;
      expect(response.body.pan).toMatch(panPattern);
    });
  });
});
```

---

## 📋 **CLAUDE.md Integration**

### Development Context for AI Assistance

When working with AI coding assistance (Claude, GitHub Copilot, etc.), always provide this context:

```markdown
# SECURITY CONTEXT FOR AI ASSISTANCE

## Project Type: PCI DSS Level 1 Payment Processing Application
## Compliance Requirements: PCI DSS 4.0, GDPR, SOX
## Security Level: Maximum (Financial Services)

## MANDATORY REQUIREMENTS:
1. All user input MUST be validated and sanitized
2. Authentication required for ALL data access
3. Encryption required for ALL sensitive data storage
4. Comprehensive audit logging for ALL security events
5. No cardholder data in logs or error messages

## FORBIDDEN PRACTICES:
- Storing credentials in code
- Exposing stack traces to users
- Using weak encryption algorithms
- Bypassing authentication checks
- Logging sensitive data

## REQUIRED LIBRARIES:
- express-validator (input validation)
- express-mongo-sanitize (NoSQL injection prevention)
- xss-clean (XSS protection)
- helmet (security headers)
- winston (security logging)

Please ensure all generated code follows PCI DSS security standards.
```

---

## 🛡️ **Security-First Development Mindset**

### Before Writing Code, Ask:

1. **"Could this expose cardholder data?"**
   - If yes, implement data classification and protection
   - Ensure proper encryption and access controls

2. **"Could this be exploited by an attacker?"**
   - Implement input validation and sanitization
   - Apply defense-in-depth principles

3. **"Does this follow the principle of least privilege?"**
   - Minimize access to only what's necessary
   - Implement proper authorization checks

4. **"Will this be auditable?"**
   - Ensure comprehensive logging
   - Include security event tracking

5. **"Could this break during a security incident?"**
   - Design for security failures
   - Implement graceful degradation

### Daily Security Practices

- **Start each coding session** by reviewing recent security advisories
- **Run security tests** before every commit
- **Review dependencies** weekly for vulnerabilities
- **Update security documentation** with any changes
- **Participate in security training** monthly

---

## 📚 **Additional Resources**

### Required Reading
- [PCI DSS 4.0 Requirements](../planning/pci_dss_4.0/)
- [Commit Message Guidelines](COMMIT_GUIDELINES.md) - **MANDATORY for all developers**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Security Tools Integration
- **ESLint Security Plugin**: Automated security rule checking
- **Semgrep**: Static analysis for security vulnerabilities
- **npm audit**: Dependency vulnerability scanning
- **OWASP ZAP**: Web application security testing

### Emergency Contacts
- **Security Team**: security@meeplab.com
- **Incident Response**: incident@meeplab.com
- **Compliance Officer**: compliance@meeplab.com

---

**Document Version**: 1.0  
**Last Updated**: August 2025  
**Next Review**: September 2025  
**Mandatory Training**: Required for all developers  
**Compliance Level**: PCI DSS 4.0 Level 1