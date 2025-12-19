# Release Notes - Version 0.4.0

**Release Date:** December 19, 2025
**Branch:** release-0.4.0
**Previous Version:** 0.2.0

## 🎉 Highlights

Version 0.4.0 introduces a complete **email system with MailerSend integration**, a **dynamic pricing system** for client-specific rates, and comprehensive **tours data management**. This release also includes significant dependency updates and email template improvements.

## 🚀 New Features

### Email System with MailerSend Integration

The platform now includes a complete transactional email system powered by MailerSend:

- **Email Service Integration**: Full MailerSend API integration with PCI DSS compliant logging
- **Template System**: Professional HTML email templates with variable substitution
  - Welcome email for new user registrations
  - Booking confirmation for reservations
  - Password reset with security warnings
- **SuperAdmin Dashboard**: `/dashboard/superadmin/emails` for email management
  - Test email functionality with template selection
  - Real-time usage statistics (daily/monthly limits)
  - Success rate monitoring
- **Email Logging**: Complete audit trail with EmailLog model
- **Spanish Character Support**: Full support for Ñ, Á, É, Í, Ó, Ú in template variables
- **Environment Configuration**: EMAIL_BASE_URL for production domain logos

### Dynamic Pricing System

Comprehensive pricing system for client-specific rates and adjustments:

- **Client-Specific Rates**: AgencyRate and TransferRate models
- **Rate Prices Table**: Multi-currency support with comprehensive pricing structure
- **Tour Prices**: Dynamic catalog with rate class support (First Class, Green Class, Premium)
- **Price Adjustments**: Inflation and exchange rate tracking
- **Client Exceptions**: Custom pricing rules per client
- **Automated Sync**: Price synchronization from service catalog

### Tours Data Management

Complete tour catalog system:

- **837 Services**: Imported from CSV with full categorization
- **Service Types**: Aeropuerto, Punto a Punto, Local, Tours
- **Tour Prices**: Seeding for all rate classes
- **Validation Scripts**: Automated tour data validation
- **Price Updates**: Batch update capabilities

### Database Improvements

- Services table refactoring for better organization
- Rate prices table with comprehensive structure
- Migration scripts for price synchronization
- Client prices tracking
- Enhanced service catalog

## 🎨 Design & UX Improvements

### Email Template Styling

Professional, brand-consistent email templates:

- **Brand Colors**: #f45355 (Amexing red) for headers, buttons, and links
- **Visual Hierarchy**: Black decorative line (#1a1a1a) for contrast
- **Social Icons**: Table-based TripAdvisor icon for email client compatibility
- **Responsive Design**: Mobile-optimized layouts
- **Accessibility**: Proper semantic HTML and ARIA attributes

## 🔧 Technical Improvements

### Dependency Updates

Major version updates for improved security and performance:

- **body-parser**: 2.2.0 → 2.2.1
- **uuid**: 9.0.1 → 13.0.0 (major update)
- **husky**: 8.0.3 → 9.1.7 (major update)
- **mongodb-memory-server**: 9.5.0 → 10.3.0 (major update)
- **@commitlint packages**: Upgraded to v20.x
- **@emnapi/core**: 1.5.0 → 1.7.1

### Bug Fixes

- **Email Template Variables**: Fixed {{AÑO}} not substituting due to regex limitations
- **Logo URLs**: Now use production domain via EMAIL_BASE_URL
- **Merge Conflicts**: Resolved yarn.lock conflicts across multiple dependency updates
- **Quote Management**: Enhanced cancellation and client access features

## 🔒 Security

- Comprehensive dependency security updates via Dependabot
- PCI DSS compliant email system with complete audit logging
- Secure email template rendering with XSS prevention
- Updated security dependencies for vulnerability patching

## 📊 Statistics

- **New Files**: 40+ (email templates, models, controllers, seeds, migrations)
- **Modified Files**: 20+ (dependency updates, configurations)
- **Lines of Code Added**: ~5,000+
- **Services Seeded**: 837 tour services
- **Email Templates**: 3 professional HTML templates
- **Dependency Updates**: 10+ security and feature updates

## 🚦 Testing

All features have been tested and validated:

- ✅ Email system functional tests
- ✅ Template rendering with variable substitution
- ✅ MailerSend API integration
- ✅ Database migrations successful
- ✅ Service catalog seeding verified
- ✅ Dependency updates validated

## 📝 Breaking Changes

**None** - This is a minor version update with backward compatibility maintained.

## 🔄 Migration Guide

### For Developers

1. **Install Dependencies**:
   ```bash
   yarn install
   ```

2. **Environment Configuration**:
   Add to `.env.development`:
   ```bash
   EMAIL_BASE_URL=https://quotes.amexingexperience.com
   MAILERSEND_API_KEY=your_api_key_here
   ```

3. **Run Database Seeds**:
   ```bash
   yarn seed
   ```

4. **Test Email System**:
   - Login as SuperAdmin
   - Navigate to `/dashboard/superadmin/emails`
   - Send test email

### For Production

1. **Update Environment Variables**:
   ```bash
   EMAIL_BASE_URL=https://amexingexperience.com
   MAILERSEND_API_KEY=production_api_key
   ```

2. **Run Migrations**:
   ```bash
   NODE_ENV=production yarn seed
   ```

3. **Verify Email Service**:
   - Check MailerSend dashboard
   - Test email sending functionality
   - Monitor usage statistics

## 🎯 Next Steps (Version 0.5.0)

- Email template management UI
- Bulk email sending capabilities
- Email analytics and reporting
- Advanced pricing rule engine
- Quote automation workflows

## 📚 Documentation

- [Email Setup Guide](docs/EMAIL_SETUP.md)
- [Changelog](CHANGELOG.md)
- [README](README.md)

## 🙏 Acknowledgments

- Dependabot for automated security updates
- MailerSend for email infrastructure
- Development team for comprehensive testing

---

**Full Changelog**: [v0.2.0...v0.4.0](https://github.com/AmexingExperience/amexing-web/compare/v0.2.0...v0.4.0)
