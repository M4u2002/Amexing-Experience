const Joi = require('joi');
const logger = require('../../infrastructure/logger');

class ValidationMiddleware {
  validateRequest(schema, property = 'body') {
    return (req, res, next) => {
      // Validate property name to prevent injection
      const allowedProperties = ['body', 'query', 'params'];
      if (!allowedProperties.includes(property)) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Invalid validation property',
        });
      }

      // Get data to validate based on property
      const dataToValidate = this.getRequestProperty(req, property);
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        logger.warn('Validation error:', {
          path: req.path,
          errors: error.details,
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      // Replace request property with validated value
      this.setRequestProperty(req, property, value);
      next();
    };
  }

  // Safe getter for request properties
  getRequestProperty(req, property) {
    switch (property) {
      case 'body':
        return req.body;
      case 'query':
        return req.query;
      case 'params':
        return req.params;
      default:
        return {};
    }
  }

  // Safe setter for request properties
  setRequestProperty(req, property, value) {
    switch (property) {
      case 'body':
        req.body = value;
        break;
      case 'query':
        req.query = value;
        break;
      case 'params':
        req.params = value;
        break;
      default:
        // Do nothing for invalid properties
        break;
    }
  }

  validateUpdateProfile(req, res, next) {
    const schema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30)
        .optional(),
      email: Joi.string().email().optional(),
    });

    const validationMiddleware = new ValidationMiddleware();
    return validationMiddleware.validateRequest(schema)(req, res, next);
  }

  validateRegistration(req, res, next) {
    const schema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30)
        .required(),
      email: Joi.string().email().required(),
      password: Joi.string()
        .min(parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
        .required()
        .messages({
          'string.pattern.base':
            'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
          'string.min': `Password must be at least ${process.env.PASSWORD_MIN_LENGTH || 12} characters long`,
        }),
      confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
          'any.only': 'Passwords must match',
        }),
    });

    const validationMiddleware = new ValidationMiddleware();
    return validationMiddleware.validateRequest(schema)(req, res, next);
  }

  validateLogin(req, res, next) {
    const schema = Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    });

    const validationMiddleware = new ValidationMiddleware();
    return validationMiddleware.validateRequest(schema)(req, res, next);
  }

  validatePasswordReset(req, res, next) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    const validationMiddleware = new ValidationMiddleware();
    return validationMiddleware.validateRequest(schema)(req, res, next);
  }

  validateNewPassword(req, res, next) {
    const schema = Joi.object({
      password: Joi.string()
        .min(parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
        .required()
        .messages({
          'string.pattern.base':
            'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
          'string.min': `Password must be at least ${process.env.PASSWORD_MIN_LENGTH || 12} characters long`,
        }),
      confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
          'any.only': 'Passwords must match',
        }),
      token: Joi.string().required(),
    });

    const validationMiddleware = new ValidationMiddleware();
    return validationMiddleware.validateRequest(schema)(req, res, next);
  }
}

module.exports = new ValidationMiddleware();
