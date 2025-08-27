const Parse = require('parse/node');
const logger = require('../../infrastructure/logger');

class AuthController {
  async showLogin(req, res) {
    res.render('auth/login', {
      title: 'Login - AmexingWeb',
      error: req.query.error || null,
    });
  }

  async showRegister(req, res) {
    res.render('auth/register', {
      title: 'Register - AmexingWeb',
      error: req.query.error || null,
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
        return res.render('auth/login', {
          title: 'Login - AmexingWeb',
          error: 'Username and password are required',
        });
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
          message: 'Invalid credentials',
        });
      }

      return res.render('auth/login', {
        title: 'Login - AmexingWeb',
        error: 'Invalid username or password',
      });
    }
  }

  async register(req, res) {
    // Handle both GET (show form) and POST (process registration)
    if (req.method === 'GET') {
      return this.showRegister(req, res);
    }

    try {
      const { username, password, email } = req.body;

      if (!username || !password || !email) {
        if (req.accepts('json')) {
          return res.status(400).json({
            success: false,
            message: 'Username, password, and email are required',
          });
        }
        return res.render('auth/register', {
          title: 'Register - AmexingWeb',
          error: 'All fields are required',
        });
      }

      // Create new Parse User
      const user = new Parse.User();
      user.set('username', username);
      user.set('password', password);
      user.set('email', email);

      const newUser = await user.signUp();

      // Store session information
      req.session.user = {
        id: newUser.id,
        username: newUser.get('username'),
      };
      req.session.sessionToken = newUser.getSessionToken();

      logger.info(`User ${username} registered successfully`);

      if (req.accepts('json')) {
        return res.json({
          success: true,
          user: {
            id: newUser.id,
            username: newUser.get('username'),
          },
        });
      }

      return res.redirect('/');
    } catch (error) {
      logger.error('Registration error:', error);

      if (req.accepts('json')) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Registration failed',
        });
      }

      return res.render('auth/register', {
        title: 'Register - AmexingWeb',
        error: error.message || 'Registration failed',
      });
    }
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
}

module.exports = new AuthController();
