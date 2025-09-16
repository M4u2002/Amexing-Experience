# Amexing Authentication System Guide

## Overview

This document provides comprehensive guidance on the Amexing authentication system implemented for Sprint 01. The system includes traditional username/password authentication with JWT session management and prepared OAuth infrastructure for future implementation.

## Architecture

### Core Components

1. **AmexingUser Model** (`src/domain/models/AmexingUser.js`)
   - Custom user entity replacing Parse.User
   - Enhanced OAuth account linking capabilities
   - PCI DSS compliant password management
   - Account lockout and security features

2. **AuthenticationService** (`src/application/services/AuthenticationService.js`)
   - Traditional username/password authentication
   - JWT token generation and validation
   - Password reset functionality
   - User management operations

3. **OAuthService** (`src/application/services/OAuthService.js`)
   - OAuth infrastructure foundation (mock mode)
   - Multi-provider support (Google, Microsoft, Apple)
   - State management for CSRF protection
   - User creation from OAuth profiles

4. **JWT Middleware** (`src/application/middleware/jwtMiddleware.js`)
   - Token-based authentication for API routes
   - Automatic token refresh capabilities
   - Role-based access control
   - Optional authentication support

## Authentication Flows

### 1. User Registration

**Endpoint:** `POST /auth/register`

**Required Fields:**
- `username`: 3-20 characters, alphanumeric and underscores only
- `email`: Valid email format
- `password`: PCI DSS compliant (12+ chars, uppercase, lowercase, number, special char)
- `confirmPassword`: Must match password
- `firstName`: User's first name
- `lastName`: User's last name

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "username": "testuser",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "user"
  },
  "message": "User registered successfully"
}
```

**Security Features:**
- Duplicate email/username validation
- Password strength validation
- Automatic account activation
- JWT token issuance via HTTP-only cookies

### 2. User Login

**Endpoint:** `POST /auth/login`

**Required Fields:**
- `identifier`: Email or username
- `password`: User's password

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  },
  "message": "Login successful"
}
```

**Security Features:**
- Failed login attempt tracking
- Account lockout after 5 failed attempts (configurable)
- Lockout duration: 30 minutes (configurable)
- Secure session management with HTTP-only cookies

### 3. Token Management

#### Token Refresh
**Endpoint:** `POST /auth/refresh`

Uses refresh token from HTTP-only cookies to issue new access tokens.

#### Logout
**Endpoint:** `POST /auth/logout`

Clears authentication cookies and invalidates session.

### 4. Password Reset

#### Initiate Reset
**Endpoint:** `POST /auth/forgot-password`

**Required Fields:**
- `email`: User's email address

#### Complete Reset
**Endpoint:** `POST /auth/reset-password`

**Required Fields:**
- `token`: Password reset token (from email link)
- `password`: New password
- `confirmPassword`: Password confirmation

## OAuth Integration (Prepared Infrastructure)

### Available Providers
- Google OAuth 2.0
- Microsoft Azure AD
- Apple Sign-In

### Mock Mode Configuration
OAuth providers are currently configured in mock mode for development:

```env
OAUTH_MOCK_MODE=true
OAUTH_PROVIDERS_ENABLED=google,microsoft,apple
```

### OAuth Endpoints

#### Get Available Providers
**Endpoint:** `GET /auth/oauth/providers`

#### Initiate OAuth Flow
**Endpoint:** `GET /auth/oauth/{provider}`

#### OAuth Callback
**Endpoint:** `GET /auth/oauth/{provider}/callback`

## Security Configuration

### Environment Variables

#### JWT Configuration
```env
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### Password Policy
```env
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true
```

#### Account Security
```env
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=30
```

### PCI DSS Compliance

The authentication system implements several PCI DSS Level 1 compliance features:

1. **Strong Password Policy**
   - Minimum 12 characters
   - Mixed case, numbers, special characters required
   - Password history tracking (future enhancement)

2. **Account Lockout**
   - Configurable failed attempt threshold
   - Automatic lockout duration
   - Security event logging

3. **Secure Token Management**
   - JWT tokens with short expiration
   - HTTP-only cookies for web clients
   - Secure token refresh mechanism

4. **Audit Logging**
   - All authentication events logged
   - Security events tracked
   - Detailed access attempt logging

## API Usage Examples

### Frontend Integration

#### Registration Form
```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include' // Include cookies
    });
    
    const result = await response.json();
    
    if (result.success) {
      // User registered successfully
      // Tokens are automatically set in HTTP-only cookies
      window.location.href = '/dashboard';
    } else {
      // Handle registration error
      console.error(result.error);
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

#### Login Form
```javascript
const loginUser = async (identifier, password) => {
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Login successful
      window.location.href = '/dashboard';
    } else {
      // Handle login error
      console.error(result.error);
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### API Client Integration

#### Authorization Header
For API clients, include the JWT token in the Authorization header:

```javascript
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken'); // If storing client-side
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  return response.json();
};
```

#### Automatic Token Refresh
```javascript
const apiCallWithRefresh = async (endpoint, options = {}) => {
  let response = await apiCall(endpoint, options);
  
  if (response.error === 'Token expired') {
    // Attempt to refresh token
    const refreshResponse = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (refreshResponse.ok) {
      // Retry original request
      response = await apiCall(endpoint, options);
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }
  
  return response;
};
```

## Protected Routes

### Middleware Usage

#### Require Authentication
```javascript
const { authenticateToken } = require('../middleware/jwtMiddleware');

router.get('/protected', authenticateToken, (req, res) => {
  // req.user contains authenticated user information
  res.json({ user: req.user });
});
```

#### Require Specific Role
```javascript
const { authenticateToken, requireRole } = require('../middleware/jwtMiddleware');

router.get('/admin', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin only content' });
});
```

#### Optional Authentication
```javascript
const { authenticateOptional } = require('../middleware/jwtMiddleware');

router.get('/content', authenticateOptional, (req, res) => {
  if (req.user) {
    // Personalized content for authenticated users
  } else {
    // Public content
  }
});
```

## Frontend Forms

### Login Page
Located at `/login` - renders `src/presentation/views/auth/login.ejs`

Features:
- Email or username input
- Password input
- "Forgot password?" link
- OAuth provider buttons (when enabled)
- CSRF protection

### Registration Page  
Located at `/register` - renders `src/presentation/views/auth/register.ejs`

Features:
- Username input with validation hints
- Email input
- Password input with strength requirements
- Confirm password input
- First/Last name inputs
- CSRF protection

### Password Reset Pages
- `/auth/forgot-password` - Request reset token
- `/auth/reset-password?token=...` - Set new password

## Testing

### Unit Tests
Located in `tests/unit/`:
- `services/AuthenticationService.test.js`
- `middleware/jwtMiddleware.test.js`
- `controllers/authController.test.js`

### Integration Tests
Located in `tests/integration/auth/`:
- `authentication-flow.test.js`

### Running Tests
```bash
# Run all unit tests
yarn test:unit

# Run authentication-specific tests
yarn test:unit --testNamePattern="Authentication|JWT"

# Run integration tests
yarn test:integration
```

## Deployment Checklist

### Environment Setup
1. Configure strong JWT secrets
2. Set appropriate password policies
3. Configure rate limiting
4. Set up audit logging
5. Configure HTTPS in production

### Security Verification
1. Run security scans: `yarn security:check`
2. Audit dependencies: `yarn security:audit`
3. Verify CSRF protection
4. Test rate limiting
5. Validate PCI DSS compliance

### Database Setup
1. Ensure MongoDB connection
2. Set up proper indexes
3. Configure backup procedures
4. Test failover scenarios

## Troubleshooting

### Common Issues

#### "Cannot use the Master Key" Error
Ensure Parse Server is properly configured with master key:
```env
PARSE_MASTER_KEY=your-master-key
```

#### JWT Token Expired
Implement automatic token refresh or redirect to login:
```javascript
if (error.code === 'TOKEN_EXPIRED') {
  // Attempt refresh or redirect to login
}
```

#### Account Lockout
Check failed login attempts and wait for lockout duration to expire, or manually reset in database.

#### OAuth Mock Mode
To enable real OAuth providers:
1. Obtain real client credentials
2. Set `OAUTH_MOCK_MODE=false`
3. Configure provider-specific settings

### Monitoring

#### Security Events
All security events are logged with structured data:
- User registration/login attempts
- Account lockouts
- Password changes
- Token refresh operations

#### Performance Monitoring
Monitor these metrics:
- Authentication response times
- Token refresh frequency
- Failed login attempt patterns
- Database connection health

## Future Enhancements

### Sprint 02 Planned Features
1. Real OAuth provider integration
2. Multi-factor authentication (MFA)
3. Session management improvements
4. Advanced audit logging
5. Password history enforcement

### Long-term Roadmap
1. Single Sign-On (SSO) integration
2. Advanced threat detection
3. Biometric authentication support
4. Zero-trust security model
5. Advanced analytics and reporting

---

For technical support or questions about the authentication system, please refer to the development team documentation or create an issue in the project repository.