/* eslint-disable no-unused-vars */
const logger = require('../infrastructure/logger');

// Import cloud functions
const helloWorldFunction = require('./functions/helloWorld');
const testFunction = require('./functions/test');

// Register Cloud Functions
Parse.Cloud.define('hello', helloWorldFunction);
Parse.Cloud.define('test', testFunction);

// Before Save Triggers
Parse.Cloud.beforeSave(Parse.User, async (request) => {
  const { object: user, master } = request;

  // Skip validation for master key requests
  if (master) {
    return;
  }

  // Log user registration/update
  if (!user.existed()) {
    logger.logSecurityEvent('USER_REGISTRATION', {
      username: user.get('username'),
      email: user.get('email')
        ? `${user.get('email').substring(0, 3)}***`
        : undefined,
    });
  } else {
    logger.logSecurityEvent('USER_UPDATE', {
      userId: user.id,
      username: user.get('username'),
    });
  }

  // Validate email format if provided
  const email = user.get('email');
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Parse.Error(
        Parse.Error.VALIDATION_ERROR,
        'Invalid email format'
      );
    }
  }

  // Ensure username is provided
  if (!user.get('username')) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Username is required');
  }
});

// After Save Triggers
Parse.Cloud.afterSave(Parse.User, async (request) => {
  const { object: user } = request;

  if (!user.existed()) {
    logger.info(`New user created: ${user.id}`);

    // Initialize user profile or perform other setup tasks
    // This is where you might create related objects, send welcome emails, etc.
  }
});

// Before Delete Triggers
Parse.Cloud.beforeDelete(Parse.User, async (request) => {
  const { object: user, master } = request;

  // Only allow user deletion with master key
  if (!master) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'Users can only be deleted with master key'
    );
  }

  logger.logSecurityEvent('USER_DELETION', {
    userId: user.id,
    username: user.get('username'),
  });
});

// After Login Trigger
Parse.Cloud.afterLogin(async (request) => {
  const { object: user } = request;

  logger.logAccessAttempt(true, user.get('username'), request.ip);

  // Update last login timestamp
  user.set('lastLoginAt', new Date());
  await user.save(null, { useMasterKey: true });
});

// After Logout Trigger
Parse.Cloud.afterLogout(async (request) => {
  const { object: session } = request;

  logger.logSecurityEvent('USER_LOGOUT', {
    sessionToken: `${session.get('sessionToken').substring(0, 8)}***`,
  });
});

// Job Functions (Scheduled Tasks)
Parse.Cloud.job('cleanupExpiredSessions', async (request) => {
  const { message } = request;
  message('Starting expired sessions cleanup...');

  try {
    const Session = Parse.Object.extend('_Session');
    const query = new Parse.Query(Session);
    query.lessThan('expiresAt', new Date());

    const expiredSessions = await query.find({ useMasterKey: true });

    if (expiredSessions.length > 0) {
      await Parse.Object.destroyAll(expiredSessions, { useMasterKey: true });
      message(`Deleted ${expiredSessions.length} expired sessions`);
      logger.info(
        `Cleanup job: Deleted ${expiredSessions.length} expired sessions`
      );
    } else {
      message('No expired sessions found');
    }

    return { success: true, deletedCount: expiredSessions.length };
  } catch (error) {
    logger.error('Error in cleanup job:', error);
    throw error;
  }
});

// Security audit job
Parse.Cloud.job('securityAudit', async (request) => {
  const { message } = request;
  message('Running security audit...');

  try {
    // Check for users with weak passwords (this is a placeholder)
    const User = Parse.Object.extend('_User');
    const query = new Parse.Query(User);
    const totalUsers = await query.count({ useMasterKey: true });

    // Check for users without email verification
    const unverifiedQuery = new Parse.Query(User);
    unverifiedQuery.equalTo('emailVerified', false);
    const unverifiedUsers = await unverifiedQuery.count({ useMasterKey: true });

    const auditResults = {
      totalUsers,
      unverifiedUsers,
      timestamp: new Date().toISOString(),
    };

    logger.logSecurityEvent('SECURITY_AUDIT', auditResults);
    message(
      `Audit complete. Total users: ${totalUsers}, Unverified: ${unverifiedUsers}`
    );

    return auditResults;
  } catch (error) {
    logger.error('Error in security audit:', error);
    throw error;
  }
});

logger.info('Cloud Code loaded successfully');
