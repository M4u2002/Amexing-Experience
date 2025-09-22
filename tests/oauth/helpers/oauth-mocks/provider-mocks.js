/**
 * OAuth Provider Mocks
 * Mock implementations for Google, Microsoft, and Apple OAuth providers
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class OAuthProviderMocks {
  constructor() {
    this.mockSecrets = {
      jwtSecret: 'test-jwt-secret-for-oauth-mocking',
      googleClientSecret: 'test-google-client-secret',
      microsoftClientSecret: 'test-microsoft-client-secret',
      applePrivateKey: this.generateTestPrivateKey()
    };
  }

  /**
   * Generate test private key for Apple OAuth
   */
  generateTestPrivateKey() {
    return `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wEiOfQIU90YXjzLXGt2Tw6LOBLQvHOdoKsoKWpRANkNQB2FJ6xWVqYEHpj8TQjQO
G6J3rLhqLnLlAhPP6F7C7nKJWmhKpCKoHpBHs2K4QHQBaNHkTLBOD2cjdmQK1pRh
a2bPOb8kKp3lX0pO0z4gBKZZC6lHE5bYf9dOm8LcKp9wZhO9kD+jCNrJ8p5fKS+W
1j0Jd8FnGXYdUqKQwOWV5EB3lQf1qG+W9OqJ9LKJKlB2b0w2qE7xVCfYQ8fE8RnL
8Qxjxe7rq5dGE8wJpq7nGKqPE7LtJt6xPgJnvJz9wO5PjKpQOzEcJXKqHxWUj4QL
ZjNQ5B7VAgMBAAECggEBAKTmjaS6tkK8BlPXClTQ2vpz/N6uxDeS35mXpqaXEtOR
IYfK8odb1mPQ7jTgqiOB2DKj+BQ5aWGd5JyfxCCNkVo4wPC2XmPKEOJwM7sStSpT
QCfvNHPF+SfzwjUi2KaQH3KqdI9hGlQ3k+YJ3qLJoKQJZnY4MqCiA/WqCQ6cYl0n
kZF3nOJP7NJYNSkmENdBg8gGCL1yfDbH4wvZy5k6OvJXrE4PKpqJZFzA7Q8jzjS7
J3DM8Fh8zF9Zd2tG+6nLfLy8dQw2HKTVOv1W5B5GJGD1gLhYVqRoZyFR9WFhH+TY
R5r8vMjKFPF1f7+z6gFn5OzTnRKqJHkz9MhKTbJ0j2kCgYEA4vRykGgGjZQ8vgJt
4PqH0BZjTnE6LJ8xZ9K8E5ePq+t4nPzK6bF+3rFpYpA+RgK3eFJ9hGJpBqFqJ2Gf
M2J9Q8FzGJ7X3sRt9eJtQl2OzB5oBWpw/1LjX8BzpBJJ7TxIx7BVF3F5F+CQF7J9
G3RnJkXYfH3G1oHvPJfR5v8Q2sMCgYEA1GrfSR8+CjvQdfTROvNA7yx1JAFRZv7i
p4JbLXF3/J5jLqXGjNi6JxGFV+J1HrJ3zGj8KrFqMzKt8QjJJ2+vxZHoD7zJKzRr
Y3G8TJJ7FqHZ9KjGXqFd3+y2V8rQfRk4D6tPGFJ7z2xoSiJ1RrEtQ3nGzDgRF3F5
0yUKF9YQuJ8CgYBd+GcZeKt7+9XKJg8RqFJ7vF9qJ7KjQqRjZxJcI1F9zF3n7vF9
9JjGqFqGrjF3J2zG9qF7RjF9c3F7+J9xGrEt7RqF9yJqGrJrF7JfF9zGqF7GjqJ9
7RqGjF7J9xF9zGqF7+J7RqGzF3J2qF7RjGqJrF9yJqF7+J9xF7GjqJ9zRqGrF7J9
"""TEST PRIVATE KEY FOR OAUTH MOCKING ONLY"""
-----END PRIVATE KEY-----`;
  }

  /**
   * Mock Google OAuth flow
   */
  createGoogleMock() {
    return {
      // Mock authorization URL
      getAuthorizationUrl: (options = {}) => {
        const params = new URLSearchParams({
          client_id: 'test-google-client-id',
          redirect_uri: options.redirectUri || 'http://localhost:1337/auth/google/callback',
          response_type: 'code',
          scope: options.scope || 'openid profile email',
          state: options.state || crypto.randomBytes(16).toString('hex'),
          access_type: 'offline',
          prompt: 'consent'
        });

        return `https://accounts.google.com/oauth/authorize?${params.toString()}`;
      },

      // Mock token exchange
      exchangeCodeForTokens: async (code, redirectUri) => {
        if (!code || code === 'invalid_code') {
          throw new Error('Invalid authorization code');
        }

        const accessToken = this.generateMockToken('google', 'access');
        const refreshToken = this.generateMockToken('google', 'refresh');
        const idToken = this.generateMockIdToken('google');

        return {
          access_token: accessToken,
          refresh_token: refreshToken,
          id_token: idToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email'
        };
      },

      // Mock user info retrieval
      getUserInfo: async (accessToken) => {
        if (!accessToken || accessToken === 'invalid_token') {
          throw new Error('Invalid access token');
        }

        return {
          id: `google_${Date.now()}`,
          email: `test.google.${Date.now()}@gmail.com`,
          verified_email: true,
          name: 'Test Google User',
          given_name: 'Test',
          family_name: 'User',
          picture: 'https://example.com/google-avatar.jpg',
          locale: 'en',
          hd: 'amexing-test.com' // Hosted domain for corporate accounts
        };
      },

      // Mock token refresh
      refreshAccessToken: async (refreshToken) => {
        if (!refreshToken || refreshToken === 'invalid_refresh_token') {
          throw new Error('Invalid refresh token');
        }

        const newAccessToken = this.generateMockToken('google', 'access');
        
        return {
          access_token: newAccessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email'
        };
      }
    };
  }

  /**
   * Mock Microsoft OAuth flow
   */
  createMicrosoftMock() {
    return {
      // Mock authorization URL
      getAuthorizationUrl: (options = {}) => {
        const params = new URLSearchParams({
          client_id: 'test-microsoft-client-id',
          redirect_uri: options.redirectUri || 'http://localhost:1337/auth/microsoft/callback',
          response_type: 'code',
          scope: options.scope || 'openid profile email User.Read',
          state: options.state || crypto.randomBytes(16).toString('hex'),
          response_mode: 'query'
        });

        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
      },

      // Mock token exchange
      exchangeCodeForTokens: async (code, redirectUri) => {
        if (!code || code === 'invalid_code') {
          throw new Error('Invalid authorization code');
        }

        const accessToken = this.generateMockToken('microsoft', 'access');
        const refreshToken = this.generateMockToken('microsoft', 'refresh');
        const idToken = this.generateMockIdToken('microsoft');

        return {
          access_token: accessToken,
          refresh_token: refreshToken,
          id_token: idToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email User.Read'
        };
      },

      // Mock user info retrieval
      getUserInfo: async (accessToken) => {
        if (!accessToken || accessToken === 'invalid_token') {
          throw new Error('Invalid access token');
        }

        return {
          id: `microsoft_${Date.now()}`,
          userPrincipalName: `test.microsoft.${Date.now()}@outlook.com`,
          mail: `test.microsoft.${Date.now()}@outlook.com`,
          displayName: 'Test Microsoft User',
          givenName: 'Test',
          surname: 'User',
          jobTitle: 'Test Engineer',
          officeLocation: 'Test Office',
          businessPhones: ['+1234567890'],
          mobilePhone: '+1234567891'
        };
      },

      // Mock token refresh
      refreshAccessToken: async (refreshToken) => {
        if (!refreshToken || refreshToken === 'invalid_refresh_token') {
          throw new Error('Invalid refresh token');
        }

        const newAccessToken = this.generateMockToken('microsoft', 'access');
        
        return {
          access_token: newAccessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email User.Read'
        };
      }
    };
  }

  /**
   * Mock Apple OAuth flow
   */
  createAppleMock() {
    return {
      // Mock authorization URL
      getAuthorizationUrl: (options = {}) => {
        const params = new URLSearchParams({
          client_id: 'test-apple-client-id',
          redirect_uri: options.redirectUri || 'http://localhost:1337/auth/apple/callback',
          response_type: 'code',
          scope: options.scope || 'name email',
          state: options.state || crypto.randomBytes(16).toString('hex'),
          response_mode: 'form_post'
        });

        return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
      },

      // Mock token exchange
      exchangeCodeForTokens: async (code, redirectUri) => {
        if (!code || code === 'invalid_code') {
          throw new Error('Invalid authorization code');
        }

        const accessToken = this.generateMockToken('apple', 'access');
        const refreshToken = this.generateMockToken('apple', 'refresh');
        const idToken = this.generateMockIdToken('apple');

        return {
          access_token: accessToken,
          refresh_token: refreshToken,
          id_token: idToken,
          token_type: 'Bearer',
          expires_in: 3600
        };
      },

      // Mock user info retrieval (Apple uses ID token)
      getUserInfo: async (idToken) => {
        if (!idToken || idToken === 'invalid_token') {
          throw new Error('Invalid ID token');
        }

        try {
          // In real implementation, we would verify the JWT signature
          const decoded = jwt.decode(idToken);
          
          return {
            sub: decoded.sub || `apple_${Date.now()}`,
            email: decoded.email || `test.apple.${Date.now()}@icloud.com`,
            email_verified: decoded.email_verified || true,
            name: decoded.name || {
              firstName: 'Test',
              lastName: 'User'
            },
            real_user_status: 1 // Apple's real user indicator
          };
        } catch (error) {
          throw new Error('Failed to decode ID token');
        }
      },

      // Mock token refresh
      refreshAccessToken: async (refreshToken) => {
        if (!refreshToken || refreshToken === 'invalid_refresh_token') {
          throw new Error('Invalid refresh token');
        }

        const newAccessToken = this.generateMockToken('apple', 'access');
        
        return {
          access_token: newAccessToken,
          token_type: 'Bearer',
          expires_in: 3600
        };
      }
    };
  }

  /**
   * Generate mock token
   */
  generateMockToken(provider, type) {
    const payload = {
      iss: this.getIssuer(provider),
      aud: `test-${provider}-client-id`,
      sub: `${provider}_test_user_${Date.now()}`,
      type: type,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.mockSecrets.jwtSecret);
  }

  /**
   * Generate mock ID token
   */
  generateMockIdToken(provider) {
    const payload = {
      iss: this.getIssuer(provider),
      aud: `test-${provider}-client-id`,
      sub: `${provider}_test_user_${Date.now()}`,
      email: `test.${provider}.${Date.now()}@${this.getProviderDomain(provider)}`,
      email_verified: true,
      name: `Test ${this.capitalizeProvider(provider)} User`,
      given_name: 'Test',
      family_name: 'User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nonce: crypto.randomBytes(16).toString('hex')
    };

    // Add provider-specific claims
    if (provider === 'google') {
      payload.picture = 'https://example.com/google-avatar.jpg';
      payload.locale = 'en';
      payload.hd = 'amexing-test.com';
    } else if (provider === 'microsoft') {
      payload.preferred_username = payload.email;
      payload.tid = 'test-tenant-id';
    } else if (provider === 'apple') {
      payload.real_user_status = 1;
      payload.name = {
        firstName: 'Test',
        lastName: 'User'
      };
    }

    return jwt.sign(payload, this.mockSecrets.jwtSecret);
  }

  /**
   * Get OAuth issuer for provider
   */
  getIssuer(provider) {
    const issuers = {
      google: 'https://accounts.google.com',
      microsoft: 'https://login.microsoftonline.com/common/v2.0',
      apple: 'https://appleid.apple.com'
    };
    return issuers[provider] || 'https://example.com';
  }

  /**
   * Get provider domain for email generation
   */
  getProviderDomain(provider) {
    const domains = {
      google: 'gmail.com',
      microsoft: 'outlook.com',
      apple: 'icloud.com'
    };
    return domains[provider] || 'example.com';
  }

  /**
   * Capitalize provider name
   */
  capitalizeProvider(provider) {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  /**
   * Create error mocks for testing error scenarios
   */
  createErrorMocks() {
    return {
      invalidCode: {
        error: 'invalid_grant',
        error_description: 'The provided authorization grant is invalid'
      },
      invalidToken: {
        error: 'invalid_token',
        error_description: 'The access token provided is expired, revoked, malformed, or invalid'
      },
      insufficientScope: {
        error: 'insufficient_scope',
        error_description: 'The request requires higher privileges than provided by the access token'
      },
      rateLimited: {
        error: 'rate_limit_exceeded',
        error_description: 'Rate limit exceeded, please try again later'
      },
      serverError: {
        error: 'server_error',
        error_description: 'The authorization server encountered an unexpected condition'
      }
    };
  }

  /**
   * Get all provider mocks
   */
  getAllProviderMocks() {
    return {
      google: this.createGoogleMock(),
      microsoft: this.createMicrosoftMock(),
      apple: this.createAppleMock(),
      errors: this.createErrorMocks()
    };
  }

  /**
   * Simulate network delay for realistic testing
   */
  async simulateNetworkDelay(min = 100, max = 500) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Create mock with network simulation
   */
  createRealisticMock(provider) {
    const baseMock = this[`create${this.capitalizeProvider(provider)}Mock`]();
    
    // Wrap all async methods with network delay
    Object.keys(baseMock).forEach(key => {
      if (typeof baseMock[key] === 'function' && baseMock[key].constructor.name === 'AsyncFunction') {
        const originalMethod = baseMock[key];
        baseMock[key] = async (...args) => {
          await this.simulateNetworkDelay();
          return originalMethod.apply(this, args);
        };
      }
    });

    return baseMock;
  }
}

module.exports = OAuthProviderMocks;