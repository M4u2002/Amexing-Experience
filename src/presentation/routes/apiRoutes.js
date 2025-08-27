const express = require('express');

const router = express.Router();
const apiController = require('../../application/controllers/apiController');
const authMiddleware = require('../../application/middleware/authMiddleware');
const validationMiddleware = require('../../application/middleware/validationMiddleware');
const securityMiddleware = require('../../infrastructure/security/securityMiddleware');

// Apply API rate limiter to all API routes
router.use(securityMiddleware.getApiRateLimiter());

// Public API endpoints
router.get('/status', apiController.getStatus);
router.get('/version', apiController.getVersion);

// CSP Report endpoint
router.post(
  '/csp-report',
  express.json({ type: 'application/csp-report' }),
  (req, res) => {
    const logger = require('../../infrastructure/logger');
    logger.warn('CSP Violation:', req.body);
    res.status(204).end();
  }
);

// Protected API endpoints
router.use(authMiddleware.requireAuth);

// User endpoints
router.get('/user/profile', apiController.getUserProfile);
router.put(
  '/user/profile',
  validationMiddleware.validateUpdateProfile,
  apiController.updateUserProfile
);

// Example data endpoint
router.get('/data', apiController.getData);

module.exports = router;
