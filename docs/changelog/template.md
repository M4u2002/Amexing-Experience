# Changelog Template for AmexingWeb

This template ensures consistent changelog entries that comply with PCI DSS documentation requirements.

## Version Release Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features and capabilities
- New security controls
- New compliance measures

### Changed
- Modifications to existing functionality
- Updated dependencies
- Configuration changes

### Fixed
- Bug fixes
- Security vulnerability patches
- Performance improvements

### Security
- **[CRITICAL]** Critical security fixes requiring immediate attention
- **[HIGH]** Important security improvements (PCI-DSS: Req X.X.X)
- **[MEDIUM]** Security enhancements and best practices
- **[LOW]** Minor security improvements

### Deprecated
- Features marked for removal
- Legacy security controls being phased out

### Removed
- Removed features
- Discontinued security controls
```

## Security Classification Guidelines

### Critical [CRITICAL]
- Vulnerabilities with CVSS 9.0-10.0
- Authentication bypass
- Data breach potential
- System compromise risks

### High [HIGH]
- Vulnerabilities with CVSS 7.0-8.9
- Privilege escalation
- Cross-site scripting (XSS)
- SQL injection vulnerabilities

### Medium [MEDIUM]  
- Vulnerabilities with CVSS 4.0-6.9
- Information disclosure
- Session management issues
- Input validation problems

### Low [LOW]
- Vulnerabilities with CVSS 0.1-3.9
- Security hardening
- Best practice implementations
- Minor configuration improvements

## PCI DSS Requirement Mapping

Include PCI DSS requirement references for security-related changes:

- **Req 1**: Network Security Controls
- **Req 2**: Secure Configuration
- **Req 3**: Data Protection  
- **Req 4**: Encryption
- **Req 5**: Malware Protection
- **Req 6**: Secure Development
- **Req 7**: Access Control
- **Req 8**: Authentication
- **Req 9**: Physical Access
- **Req 10**: Logging & Monitoring
- **Req 11**: Security Testing
- **Req 12**: Security Policies

## Example Entries

```markdown
### Security
- **[CRITICAL]** Fixed authentication bypass vulnerability in Parse Server (PCI-DSS: Req 8.2.1)
- **[HIGH]** Implemented MFA for administrative access (PCI-DSS: Req 8.4.1)
- **[MEDIUM]** Enhanced session timeout controls to 15 minutes (PCI-DSS: Req 8.2.8)
- **[LOW]** Added security headers for XSS protection (PCI-DSS: Req 6.2.4)

### Added
- Comprehensive audit logging for all CHD access (PCI-DSS: Req 10.2.1)
- Network segmentation between CDE and non-CDE systems (PCI-DSS: Req 1.2.3)
- Encrypted database connections using TLS 1.3 (PCI-DSS: Req 4.2.1)

### Fixed
- **[HIGH]** Resolved SQL injection vulnerability in user search (CVE-2025-XXXX)
- **[MEDIUM]** Fixed session fixation issue in authentication flow
- Memory leak in payment processing module
```

## Automation Notes

- Changelog entries are automatically generated from conventional commits
- Security classifications are extracted from commit body `SECURITY: [Level]`
- PCI DSS references are extracted from commit body `PCI-DSS: Req X.X.X`
- Manual review required for HIGH and CRITICAL security changes
- Compliance officer approval needed for PCI DSS requirement modifications