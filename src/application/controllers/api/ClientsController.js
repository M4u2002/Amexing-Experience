/**
 * ClientsController - RESTful API for Client Management.
 * Provides Ajax-ready endpoints for managing client organization users (department_manager role).
 * Restricted to SuperAdmin, Admin, and employee_amexing with specific permission.
 *
 * Features:
 * - RESTful API design (GET, POST, PUT, DELETE, PATCH)
 * - SuperAdmin/Admin/employee_amexing (with permission) access control
 * - Manages: department_manager role users only
 * - Comprehensive security, validation, and audit logging.
 * @author Amexing Development Team
 * @version 1.0.0
 * @since 0.1.0
 * @example
 * Usage example:
 * const controller = new ClientsController();
 * await controller.getClients(req, res);
 */

const UserManagementService = require('../../services/UserManagementService');
const logger = require('../../../infrastructure/logger');

/**
 * ClientsController class implementing RESTful API for client management.
 * Follows REST conventions and provides comprehensive error handling.
 */
class ClientsController {
  constructor() {
    this.userService = new UserManagementService();
    this.maxPageSize = 100;
    this.defaultPageSize = 25;
    this.clientRole = 'department_manager';
  }

  /**
   * GET /api/clients - Get client users (department_manager role) with filtering and pagination.
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 25, max: 100)
   * - active: Filter by active status (true/false)
   * - search: Search term for email, firstName, lastName
   * - sortField: Field to sort by (default: lastName)
   * - sortDirection: Sort direction (asc/desc, default: asc).
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @returns {Promise<void>}
   * @example
   * GET /api/clients?page=1&limit=10&active=true
   */
  async getClients(req, res) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return this.sendError(res, 'Authentication required', 401);
      }

      // Parse and validate query parameters
      const options = this.parseQueryParams(req.query);

      // Add role filter to specifically get department_manager users
      options.targetRole = this.clientRole;

      // Get client users from service (filters by organization 'client' and role 'department_manager')
      // Permission validation is done in middleware
      const result = await this.userService.getUsers(
        currentUser,
        options
      );

      // Add metadata for frontend consumption
      const response = {
        ...result,
        requestMetadata: {
          endpoint: 'getClients',
          requestedBy: currentUser.id,
          requestedRole: req.userRole,
          timestamp: new Date(),
          queryParams: options,
        },
      };

      this.sendSuccess(res, response, 'Clients retrieved successfully');
    } catch (error) {
      logger.error('Error in ClientsController.getClients', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        userRole: req.userRole,
        queryParams: req.query,
      });

      // Send detailed error for debugging
      this.sendError(
        res,
        process.env.NODE_ENV === 'development'
          ? `Error: ${error.message}`
          : 'Failed to retrieve clients',
        500
      );
    }
  }

  /**
   * GET /api/clients/:id - Get single client by ID.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @returns {Promise<void>}
   * @example
   * GET /api/clients/abc123
   */
  async getClientById(req, res) {
    try {
      const currentUser = req.user;
      const clientId = req.params.id;

      if (!currentUser) {
        return this.sendError(res, 'Authentication required', 401);
      }

      if (!clientId) {
        return this.sendError(res, 'Client ID is required', 400);
      }

      // Get user from service
      const user = await this.userService.getUserById(currentUser, clientId);

      if (!user) {
        return this.sendError(res, 'Client not found', 404);
      }

      // Verify user is a client (department_manager role)
      const role = user.roleId || user.role;
      const roleName = typeof role === 'string' ? role : role?.name;

      if (roleName !== this.clientRole) {
        return this.sendError(res, 'User is not a client (department_manager)', 403);
      }

      this.sendSuccess(res, { client: user }, 'Client retrieved successfully');
    } catch (error) {
      logger.error('Error in ClientsController.getClientById', {
        error: error.message,
        clientId: req.params.id,
        currentUser: req.user?.id,
      });

      this.sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/clients - Create new client user (department_manager role).
   * Only SuperAdmin and Admin can create clients.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @returns {Promise<void>}
   * @example
   * POST /api/clients
   * Body: { firstName: 'John', lastName: 'Doe', email: 'john@company.com', companyName: 'ACME Corp' }
   */
  async createClient(req, res) {
    try {
      const currentUser = req.user;
      const clientData = req.body;

      if (!currentUser) {
        return this.sendError(res, 'Authentication required', 401);
      }

      // Validate user role (only superadmin and admin can create clients)
      const currentUserRole = req.userRole || currentUser.role || currentUser.get?.('role');
      if (!['superadmin', 'admin'].includes(currentUserRole)) {
        return this.sendError(
          res,
          'Access denied. Only SuperAdmin or Admin can create clients.',
          403
        );
      }

      // Force role to be department_manager
      clientData.role = this.clientRole;

      // Create client using service
      const result = await this.userService.createUser(clientData, currentUser);

      this.sendSuccess(res, result, 'Client created successfully', 201);
    } catch (error) {
      logger.error('Error in ClientsController.createClient', {
        error: error.message,
        currentUser: req.user?.id,
        clientData: { ...req.body, password: undefined },
      });

      this.sendError(res, error.message, 500);
    }
  }

  /**
   * PUT /api/clients/:id - Update client user.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @returns {Promise<void>}
   * @example
   * PUT /api/clients/abc123
   * Body: { firstName: 'Jane', active: true, companyName: 'ACME Corporation' }
   */
  async updateClient(req, res) {
    try {
      const currentUser = req.user;
      const clientId = req.params.id;
      const updateData = req.body;

      if (!currentUser) {
        return this.sendError(res, 'Authentication required', 401);
      }

      if (!clientId) {
        return this.sendError(res, 'Client ID is required', 400);
      }

      // Prevent role change - clients must remain department_manager
      if (updateData.role && updateData.role !== this.clientRole) {
        return this.sendError(
          res,
          `Cannot change client role. Must be ${this.clientRole}`,
          400
        );
      }

      // Update user using service
      const result = await this.userService.updateUser(
        clientId,
        updateData,
        currentUser
      );

      this.sendSuccess(res, result, 'Client updated successfully');
    } catch (error) {
      logger.error('Error in ClientsController.updateClient', {
        error: error.message,
        clientId: req.params.id,
        currentUser: req.user?.id,
      });

      this.sendError(res, error.message, 500);
    }
  }

  /**
   * DELETE /api/clients/:id - Deactivate (soft delete) client user.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @returns {Promise<void>}
   * @example
   * DELETE /api/clients/abc123
   */
  async deactivateClient(req, res) {
    try {
      const currentUser = req.user;
      const clientId = req.params.id;

      if (!currentUser) {
        return this.sendError(res, 'Authentication required', 401);
      }

      if (!clientId) {
        return this.sendError(res, 'Client ID is required', 400);
      }

      // Deactivate client using service
      const result = await this.userService.deactivateUser(
        clientId,
        currentUser
      );

      this.sendSuccess(res, result, 'Client deactivated successfully');
    } catch (error) {
      logger.error('Error in ClientsController.deactivateClient', {
        error: error.message,
        clientId: req.params.id,
        currentUser: req.user?.id,
      });

      this.sendError(res, error.message, 500);
    }
  }

  /**
   * PATCH /api/clients/:id/toggle-status - Toggle active/inactive status.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @returns {Promise<void>}
   * @example
   * PATCH /api/clients/abc123/toggle-status
   * Body: { active: false }
   */
  async toggleClientStatus(req, res) {
    try {
      const currentUser = req.user;
      const clientId = req.params.id;
      const { active } = req.body;

      if (!currentUser) {
        return this.sendError(res, 'Authentication required', 401);
      }

      if (!clientId) {
        return this.sendError(res, 'Client ID is required', 400);
      }

      if (typeof active !== 'boolean') {
        return this.sendError(res, 'Active status must be a boolean', 400);
      }

      // Toggle status using service
      const result = await this.userService.toggleUserStatus(
        currentUser,
        clientId,
        active,
        'Status changed via clients dashboard'
      );

      this.sendSuccess(
        res,
        result,
        `Client ${active ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      logger.error(
        'Error in ClientsController.toggleClientStatus',
        {
          error: error.message,
          clientId: req.params.id,
          currentUser: req.user?.id,
        }
      );

      this.sendError(res, error.message, 500);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Parse and validate query parameters.
   * @param {object} query - Query parameters from request.
   * @returns {object} - Parsed options object.
   * @example
   */
  parseQueryParams(query) {
    const page = parseInt(query.page, 10) || 1;
    let limit = parseInt(query.limit, 10) || this.defaultPageSize;

    // Enforce max page size
    if (limit > this.maxPageSize) {
      limit = this.maxPageSize;
    }

    const filters = {};
    if (query.active !== undefined) {
      filters.active = query.active === 'true';
    }

    if (query.emailVerified !== undefined) {
      filters.emailVerified = query.emailVerified === 'true';
    }

    const sort = {
      field: query.sortField || 'lastName',
      direction: query.sortDirection || 'asc',
    };

    return {
      page,
      limit,
      filters,
      sort,
    };
  }

  /**
   * Send success response.
   * @param {object} res - Express response object.
   * @param {object} data - Data to send.
   * @param {string} message - Success message.
   * @param {number} statusCode - HTTP status code.
   * @example
   */
  sendSuccess(res, data, message = 'Success', statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send error response.
   * @param {object} res - Express response object.
   * @param {string} message - Error message.
   * @param {number} statusCode - HTTP status code.
   * @example
   */
  sendError(res, message, statusCode = 500) {
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = ClientsController;
