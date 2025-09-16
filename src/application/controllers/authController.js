const Parse = require('parse/node');
const logger = require('../../infrastructure/logger');
const securityMiddlewares = require('../../infrastructure/security/securityMiddleware');

/**
 * Controller for handling authentication operations including login, registration, and logout.
 * Provides both web interface and JSON API endpoints for authentication flows.
 * @class AuthController
 */
class AuthController {
  async showLogin(req, res) {
    const csrf = securityMiddlewares.csrfProtection.create(req.session.csrfSecret);

    // Get OAuth providers for login form
    let oauthProviders = [];
    try {
      const providersResult = await Parse.Cloud.run('getOAuthProviders');
      oauthProviders = providersResult.providers || [];
    } catch (error) {
      logger.error('Error getting OAuth providers for login:', error);
    }
    res.render('auth/login', {
      title: 'Login - AmexingWeb',
      error: req.query.error || null,
      csrfToken: csrf,
      parseAppId: process.env.PARSE_APP_ID,
      oauthProviders,
    });
  }

  async showRegister(req, res) {
    const csrf = securityMiddlewares.csrfProtection.create(req.session.csrfSecret);
    res.render('auth/register', {
      title: 'Register - AmexingWeb',
      error: req.query.error || null,
      csrfToken: csrf,
      parseAppId: process.env.PARSE_APP_ID,
    });
  }

  async login(req, res) {
    // Handle both GET (show form) and POST (process login)
    if (req.method === 'GET') {
      return this.showLogin(req, res);
    }

    try {
      const { username, password } = req.body;

      if (!username || !password) {
        if (req.accepts('json')) {
          return res.status(400).json({
            success: false,
            message: 'Username and password are required',
          });
        }
        return this.returnWithToken(req, res);
      }

      // Authenticate with Parse Server
      const user = await Parse.User.logIn(username, password);

      // Store session information
      req.session.user = {
        id: user.id,
        username: user.get('username'),
      };
      req.session.sessionToken = user.getSessionToken();

      logger.info(`User ${username} logged in successfully`);

      if (req.accepts('json')) {
        return res.json({
          success: true,
          user: {
            id: user.id,
            username: user.get('username'),
          },
        });
      }

      return res.redirect('/');
    } catch (error) {
      logger.error('Login error:', error);

      if (req.accepts('json')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid login',
        });
      }

      return this.returnWithToken(req, res);
    }
  }

  async returnWithToken(req, res) {
    const csrf = securityMiddlewares.csrfProtection.create(req.session.csrfSecret);
    return res.render('auth/login', {
      title: 'Login - AmexingWeb',
      error: 'Invalid username or password',
      csrfToken: csrf,
      parseAppId: process.env.PARSE_APP_ID,
    });
  }

  async register(req, res) {
    // Handle both GET (show form) and POST (process registration)
    if (req.method === 'GET') {
      return this.showRegister(req, res);
    }

    try {
      const validationResult = this.validateRegistration(req.body);
      if (!validationResult.isValid) {
        return this.handleRegistrationValidationError(res, validationResult.error);
      }

      const newUser = await this.createUser(req.body);
      this.setUserSession(req, newUser);

      logger.info(`User ${req.body.username} registered successfully`);

      return this.handleRegistrationSuccess(res, newUser);
    } catch (error) {
      return this.handleRegistrationError(res, error);
    }
  }

  validateRegistration({ username, password, email }) {
    if (!username || !password || !email) {
      return {
        isValid: false,
        error: 'Username, password, and email are required',
      };
    }
    return { isValid: true };
  }

  handleRegistrationValidationError(res, errorMessage) {
    if (res.req.accepts('json')) {
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
    const csrf = securityMiddlewares.csrfProtection.create(res.req.session.csrfSecret);
    return res.render('auth/register', {
      title: 'Register - AmexingWeb',
      error: 'All fields are required',
      csrfToken: csrf,
      parseAppId: process.env.PARSE_APP_ID,
    });
  }

  async createUser({ username, password, email }) {
    const user = new Parse.User();
    user.set('username', username);
    user.set('password', password);
    user.set('email', email);
    return user.signUp();
  }

  setUserSession(req, user) {
    req.session.user = {
      id: user.id,
      username: user.get('username'),
    };
    req.session.sessionToken = user.getSessionToken();
  }

  handleRegistrationSuccess(res, user) {
    if (res.req.accepts('json')) {
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.get('username'),
        },
      });
    }
    return res.redirect('/');
  }

  handleRegistrationError(res, error) {
    logger.error('Registration error:', error);

    if (res.req.accepts('json')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
    const csrf = securityMiddlewares.csrfProtection.create(res.req.session.csrfSecret);

    return res.render('auth/register', {
      title: 'Register - AmexingWeb',
      error: error.message || 'Registration failed',
      csrfToken: csrf,
      parseAppId: process.env.PARSE_APP_ID,
    });
  }

  async logout(req, res) {
    try {
      // Clear Parse session if exists
      if (req.session?.sessionToken) {
        const { sessionToken } = req.session;
        await Parse.User.logOut({ sessionToken });
      }

      // Destroy Express session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session:', err);
        }
      });

      // Clear cookie
      res.clearCookie('amexing.sid');

      // Handle response type
      if (req.accepts('json')) {
        return res.json({
          success: true,
          message: 'Logged out successfully',
        });
      }

      // Redirect to home
      res.redirect('/');
    } catch (error) {
      logger.error('Error during logout:', error);

      if (req.accepts('json')) {
        return res.status(500).json({
          success: false,
          message: 'Logout failed',
        });
      }

      res.redirect('/');
    }
  }

  async showForgotPassword(req, res) {
    const csrf = securityMiddlewares.csrfProtection.create(req.session.csrfSecret);
    res.render('auth/forgot-password', {
      title: 'Forgot Password - AmexingWeb',
      error: req.query.error || null,
      success: req.query.success || null,
      csrfToken: csrf,
    });
  }

  async showResetPassword(req, res) {
    const csrf = securityMiddlewares.csrfProtection.create(req.session.csrfSecret);
    const { token } = req.query;

    if (!token) {
      return res.redirect(`/auth/forgot-password?error=${encodeURIComponent('Invalid or missing reset token')}`);
    }

    res.render('auth/reset-password', {
      title: 'Reset Password - AmexingWeb',
      error: req.query.error || null,
      token,
      csrfToken: csrf,
    });
  }
}

module.exports = new AuthController();
