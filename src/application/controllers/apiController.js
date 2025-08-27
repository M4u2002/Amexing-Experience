const Parse = require('parse/node');
const logger = require('../../infrastructure/logger');

class ApiController {
  async getStatus(req, res) {
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  }

  async getVersion(req, res) {
    res.json({
      version: '1.0.0',
      parseVersion: Parse.VERSION,
      nodeVersion: process.version,
      api: {
        name: 'AmexingWeb API',
        description: 'PCI DSS compliant e-commerce API',
      },
    });
  }

  async getUserProfile(req, res, next) {
    try {
      const { user } = req;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      res.json({
        id: user.id,
        username: user.get('username'),
        email: user.get('email'),
        emailVerified: user.get('emailVerified'),
        createdAt: user.get('createdAt'),
        lastLoginAt: user.get('lastLoginAt'),
      });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      next(error);
    }
  }

  async updateUserProfile(req, res, next) {
    try {
      const { user } = req;
      const { email, username } = req.body;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      // Update user fields
      if (email && email !== user.get('email')) {
        user.set('email', email);
        user.set('emailVerified', false);
      }

      if (username && username !== user.get('username')) {
        user.set('username', username);
      }

      // Save user
      await user.save(null, { sessionToken: req.sessionToken });

      logger.logSystemChange(user.id, 'PROFILE_UPDATE', null, null);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          username: user.get('username'),
          email: user.get('email'),
          emailVerified: user.get('emailVerified'),
        },
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      next(error);
    }
  }

  async getData(req, res) {
    try {
      // Example data endpoint
      const data = {
        items: [
          { id: 1, name: 'Item 1', price: 29.99 },
          { id: 2, name: 'Item 2', price: 49.99 },
          { id: 3, name: 'Item 3', price: 19.99 },
        ],
        total: 3,
        timestamp: new Date().toISOString(),
      };

      res.json(data);
    } catch (error) {
      logger.error('Error getting data:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve data',
      });
    }
  }
}

module.exports = new ApiController();
