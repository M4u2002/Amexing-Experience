const Parse = require('parse/node');
const logger = require('../../infrastructure/logger');

class AuthMiddleware {
  async requireAuth(req, res, next) {
    try {
      // Check for session token in headers or session
      const sessionToken = req.headers['x-parse-session-token']
        || req.session?.sessionToken
        || req.cookies?.sessionToken;

      if (!sessionToken) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No session token provided',
        });
      }

      // Verify session with Parse
      const user = await Parse.User.become(sessionToken);

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid session token',
        });
      }

      // Attach user to request
      req.user = user;
      req.sessionToken = sessionToken;

      next();
    } catch (error) {
      logger.error('Authentication error:', error);

      if (error.code === 209) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired session token',
        });
      }

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
    }
  }

  async optionalAuth(req, res, next) {
    try {
      const sessionToken = req.headers['x-parse-session-token']
        || req.session?.sessionToken
        || req.cookies?.sessionToken;

      if (sessionToken) {
        const user = await Parse.User.become(sessionToken);
        req.user = user;
        req.sessionToken = sessionToken;
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  }

  requireRole(role) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        // Check if user has required role
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('name', role);
        roleQuery.equalTo('users', req.user);

        const hasRole = await roleQuery.first({ useMasterKey: true });

        if (!hasRole) {
          logger.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId: req.user.id,
            requiredRole: role,
            path: req.path,
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions',
          });
        }

        next();
      } catch (error) {
        logger.error('Role check error:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authorization failed',
        });
      }
    };
  }
}

module.exports = new AuthMiddleware();
