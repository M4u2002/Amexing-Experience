const logger = require('../../infrastructure/logger');

class HomeController {
  async index(req, res, next) {
    try {
      const data = {
        title: 'AmexingWeb - Secure E-Commerce Platform',
        message: 'Welcome to AmexingWeb',
        user: req.session?.user || null,
        features: [
          'PCI DSS 4.0 Compliant',
          'Secure Payment Processing',
          'Parse Server Backend',
          'MongoDB Database',
          'Enhanced Security with Helmet',
        ],
      };

      res.render('index', data);
    } catch (error) {
      logger.error('Error rendering home page:', error);
      next(error);
    }
  }

  async about(req, res, next) {
    try {
      const data = {
        title: 'About AmexingWeb',
        user: req.session?.user || null,
        description:
          'AmexingWeb is a secure e-commerce platform built with Parse Server and designed for PCI DSS compliance.',
      };

      res.render('about', data);
    } catch (error) {
      logger.error('Error rendering about page:', error);
      next(error);
    }
  }
}

module.exports = new HomeController();
