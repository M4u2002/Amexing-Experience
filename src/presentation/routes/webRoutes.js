const express = require('express');

const router = express.Router();
const homeController = require('../../application/controllers/homeController');
const authController = require('../../application/controllers/authController');

// Home page
router.get('/', homeController.index);

// About page
router.get('/about', homeController.about);

// Auth pages
router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);
router.get('/logout', authController.logout);
router.get('/auth/forgot-password', authController.showForgotPassword);
router.get('/auth/reset-password', authController.showResetPassword);

// Email verification pages
router.get('/verify-email-success', (req, res) => {
  res.render('auth/verify-success', {
    title: 'Email Verified',
    message: 'Your email has been successfully verified!',
  });
});

// Password reset pages
router.get('/choose-password', (req, res) => {
  res.render('auth/choose-password', {
    title: 'Choose New Password',
  });
});

router.get('/password-reset-success', (req, res) => {
  res.render('auth/reset-success', {
    title: 'Password Reset Successful',
    message: 'Your password has been successfully reset!',
  });
});

// Invalid link page
router.get('/invalid-link', (req, res) => {
  res.render('errors/invalid-link', {
    title: 'Invalid Link',
    message: 'This link is invalid or has expired.',
  });
});

module.exports = router;
