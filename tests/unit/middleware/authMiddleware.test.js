/**
 * Authentication Middleware Unit Tests
 */

const authMiddleware = require('../../../src/application/middleware/authMiddleware');
const { createMockRequest, createMockResponse, createMockNext } = require('../../helpers/testUtils');

describe('Authentication Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  describe('requireAuth', () => {
    it('should call next() if user is authenticated', () => {
      mockReq.user = { id: 'test-user-id', username: 'testuser' };

      authMiddleware.requireAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      mockReq.user = null;

      authMiddleware.requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should redirect to login for HTML requests when not authenticated', () => {
      mockReq.user = null;
      mockReq.accepts = jest.fn().mockReturnValue('html');

      authMiddleware.requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should call next() if user has required role', () => {
      mockReq.user = { 
        id: 'test-user-id', 
        username: 'testuser',
        get: jest.fn().mockReturnValue(['admin', 'user'])
      };

      const middleware = authMiddleware.requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 if user does not have required role', () => {
      mockReq.user = { 
        id: 'test-user-id', 
        username: 'testuser',
        get: jest.fn().mockReturnValue(['user'])
      };

      const middleware = authMiddleware.requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'You do not have permission to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      mockReq.user = null;

      const middleware = authMiddleware.requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});