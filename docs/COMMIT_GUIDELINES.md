# Commit Message Guidelines - AmexingWeb

**Comprehensive guide for writing effective, secure, and compliant commit messages**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Conventional Commits Standard](#conventional-commits-standard)
3. [Security Classification System](#security-classification-system)
4. [PCI DSS Integration](#pci-dss-integration)
5. [Git Hooks Setup](#git-hooks-setup)
6. [Examples Library](#examples-library)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Tools Integration](#tools-integration)

---

## Introduction

AmexingWeb follows strict commit message guidelines to ensure:

- **🔒 Security Compliance**: PCI DSS 4.0 requirement tracking
- **📋 Audit Trail**: Complete change documentation for compliance
- **🤝 Team Collaboration**: Consistent communication across developers
- **🚀 Automation**: Automated changelog and release note generation
- **📊 Quality Assurance**: Enforceable standards through Git hooks

### Why This Matters for PCI DSS

Payment Card Industry compliance requires comprehensive audit trails of all system changes, especially those affecting:

- Cardholder data processing
- Security controls
- Access management
- Network configurations
- Encryption implementations

Our commit message standards ensure every change is properly documented and traceable for compliance audits.

---

## Conventional Commits Standard

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification with PCI DSS security extensions.

### Basic Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Components Explained

#### Type (Required)
Describes the kind of change being made:

| Type | Purpose | When to Use | Changelog Section |
|------|---------|-------------|-------------------|
| `feat` | New features | Adding functionality | Added |
| `fix` | Bug fixes | Resolving defects | Fixed |
| `security` | Security changes | Any security improvement | Security |
| `hotfix` | Critical fixes | Emergency patches | Security/Fixed |
| `docs` | Documentation | README, guides, comments | Changed |
| `style` | Code formatting | Prettier, ESLint fixes | - |
| `refactor` | Code refactoring | Restructuring without new features | Changed |
| `perf` | Performance improvements | Optimizations | Changed |
| `test` | Tests | Adding or modifying tests | - |
| `build` | Build system | Webpack, package.json changes | Changed |
| `ci` | CI configuration | GitHub Actions, hooks | - |
| `chore` | Maintenance | Dependency updates, cleanup | - |
| `revert` | Reverting commits | Undoing previous changes | Changed |

#### Scope (Optional)
The area of the codebase being changed:

**Common Scopes:**
- `auth` - Authentication and authorization
- `api` - API endpoints and routes
- `db` - Database operations
- `encryption` - Cryptographic operations
- `logging` - Audit and application logging
- `middleware` - Express middleware
- `validation` - Input validation
- `security` - Security controls
- `compliance` - PCI DSS compliance
- `config` - Configuration management

#### Description (Required)
A concise summary of the change:

- Use **imperative mood** ("add", "fix", "implement")
- **Lowercase** first letter
- **No period** at the end
- **Maximum 50 characters**
- Be **specific** and **clear**

❌ **Bad examples:**
```
Added new feature
Fixed bug
Updated files
Security stuff
```

✅ **Good examples:**
```
feat(auth): implement TOTP-based multi-factor authentication
fix(api): resolve SQL injection in user search endpoint
security(encryption): upgrade AES-256-CBC to AES-256-GCM
docs(readme): add PCI DSS compliance documentation
```

---

## Security Classification System

All security-related commits (`security`, `hotfix`) **MUST** include security classification in the commit body.

### Classification Levels

#### 🔴 Critical
**Response Time**: Immediate (0-4 hours)  
**Approval**: CISO + Compliance Officer  
**Examples**:
- Authentication bypass vulnerabilities
- Remote code execution fixes
- Data breach prevention
- Cryptographic failures

```
security(auth): patch authentication bypass vulnerability

SECURITY: Critical
PCI-DSS: Req 8.2.1
IMPACT: Prevents unauthorized administrative access
CVE: CVE-2025-12345

Fixed logic flaw allowing authentication bypass through
malformed session tokens. Immediate deployment required.
```

#### 🟡 High
**Response Time**: 24 hours  
**Approval**: Security Team Lead  
**Examples**:
- Cross-site scripting fixes
- SQL injection patches
- Privilege escalation prevention
- MFA implementation

```
feat(auth): implement multi-factor authentication

SECURITY: High
PCI-DSS: Req 8.4.1
IMPACT: Significantly reduces account compromise risk

Added TOTP-based MFA for all administrative accounts.
Includes backup codes and account recovery procedures.
```

#### 🟢 Medium
**Response Time**: 48-72 hours  
**Approval**: Development Lead  
**Examples**:
- Session management improvements
- Input validation enhancements
- Security header implementations
- Access control refinements

```
security(session): implement 15-minute session timeout

SECURITY: Medium
PCI-DSS: Req 8.2.8
IMPACT: Reduces session hijacking risk

Configured automatic logout after 15 minutes of inactivity.
Added session renewal prompts for active users.
```

#### 🔵 Low
**Response Time**: Next release cycle  
**Approval**: Code review  
**Examples**:
- Security best practices
- Configuration hardening
- Dependency updates
- Documentation improvements

```
chore(deps): update helmet.js security headers

SECURITY: Low
IMPACT: Strengthens browser-based attack prevention

Updated to latest version with enhanced CSP support.
```

---

## PCI DSS Integration

### Requirement Mapping

When making changes that affect PCI DSS compliance, reference the specific requirement:

#### Requirement Categories

| Req | Category | Common Changes |
|-----|----------|----------------|
| **Req 1** | Network Security | Firewall rules, network segmentation |
| **Req 2** | Secure Configuration | System hardening, default settings |
| **Req 3** | Data Protection | Encryption, key management, data storage |
| **Req 4** | Transmission Security | TLS configuration, secure protocols |
| **Req 5** | Malware Protection | Anti-malware, system monitoring |
| **Req 6** | Secure Development | Code review, vulnerability management |
| **Req 7** | Access Control | User permissions, role-based access |
| **Req 8** | Authentication | Password policies, MFA, account management |
| **Req 9** | Physical Access | Data center security, device controls |
| **Req 10** | Logging & Monitoring | Audit logs, monitoring systems |
| **Req 11** | Security Testing | Vulnerability scans, penetration testing |
| **Req 12** | Security Policies | Policies, procedures, training |

### PCI DSS Commit Examples

```bash
# Data protection requirement
security(encryption): implement field-level encryption for CHD

SECURITY: High
PCI-DSS: Req 3.5.1
IMPACT: Ensures cardholder data encryption at rest

Implemented AES-256-GCM encryption for all stored CHD.
Added secure key management with HSM integration.

# Network security requirement
feat(firewall): implement UFW firewall rules

PCI-DSS: Req 1.2.1
IMPACT: Establishes network access controls

Configured firewall rules restricting access to CDE.
Documented all allowed ports and protocols.

# Logging requirement
feat(audit): enhance audit logging for CHD access

PCI-DSS: Req 10.2.1
IMPACT: Provides comprehensive audit trail

Added detailed logging for all cardholder data operations.
Includes user ID, timestamp, and action performed.
```

---

## Git Hooks Setup

### Installation

1. **Install hooks** (required for all developers):
   ```bash
   yarn hooks:install
   ```

2. **Verify installation**:
   ```bash
   yarn hooks:validate
   ```

3. **Test without committing**:
   ```bash
   yarn hooks:test
   ```

### Hook Validation

Our Git hooks automatically validate:

#### Pre-Commit Hook
- ✅ **ESLint security analysis** - Static code analysis
- ✅ **Semgrep security scan** - Vulnerability detection
- ✅ **Secret detection** - Prevents credential commits
- ✅ **Documentation coverage** - Ensures docs are updated
- ✅ **Changelog validation** - Proper format enforcement

#### Commit-Msg Hook
- ✅ **Conventional commit format** - Enforces standard structure
- ✅ **Security classification** - Requires security levels
- ✅ **PCI DSS references** - Compliance requirement mapping
- ✅ **Sensitive data check** - Prevents secrets in messages

#### Pre-Push Hook
- ✅ **Version consistency** - Changelog matches package.json
- ✅ **Security audit** - Dependency vulnerability check
- ✅ **Test execution** - Full test suite validation
- ✅ **Documentation sync** - Code changes with doc updates

### Troubleshooting Hooks

**Hook not executing?**
```bash
# Check if hooks are installed
yarn hooks:validate

# Reinstall if needed
yarn hooks:repair

# Verify permissions
ls -la .git/hooks/
```

**Commit rejected by hooks?**
```bash
# Test specific commit message
echo "your commit message" | yarn commit:validate

# Run pre-commit checks manually
yarn lint && yarn security:all

# Check for secrets
git diff --cached --name-only | xargs grep -l "password\|secret\|key"
```

---

## Examples Library

### Standard Development Commits

#### New Features
```bash
feat(auth): add password reset functionality

Implemented secure password reset flow with:
- Email verification tokens
- Rate limiting protection
- Audit logging for security events

Closes #123
```

#### Bug Fixes
```bash
fix(api): resolve null pointer in user search

Fixed NPE occurring when search query is empty.
Added input validation and proper error handling.

Resolves issue reported in production monitoring.
```

#### Documentation
```bash
docs(api): add authentication endpoint documentation

Added comprehensive API documentation for:
- Login/logout endpoints
- Token refresh mechanism
- Error response formats

Includes Postman collection examples.
```

### Security-Related Commits

#### Critical Security Fix
```bash
hotfix(auth): patch SQL injection in login endpoint

SECURITY: Critical
PCI-DSS: Req 6.2.4
IMPACT: Prevents unauthorized database access
CVE: CVE-2025-54321

Fixed SQL injection vulnerability in authentication.
Implemented parameterized queries and input sanitization.
Immediate deployment required.
```

#### Security Enhancement
```bash
security(headers): implement comprehensive security headers

SECURITY: Medium
PCI-DSS: Req 6.2.4
IMPACT: Strengthens browser-based attack prevention

Added Helmet.js configuration with:
- Content Security Policy
- X-Frame-Options protection
- X-XSS-Protection enabled
- HSTS implementation
```

#### Compliance Implementation
```bash
feat(logging): implement comprehensive audit logging

PCI-DSS: Req 10.2.1, 10.3.1
IMPACT: Provides complete audit trail for compliance

Added structured logging for:
- All cardholder data access
- Authentication events
- Administrative actions
- System configuration changes

Winston logger with daily rotation configured.
```

### Infrastructure and Configuration

#### Dependency Updates
```bash
chore(deps): update Parse Server to v7.0.0

SECURITY: Medium
IMPACT: Addresses security vulnerabilities in dependencies

Updated Parse Server with security patches:
- Authentication bypass fix
- Enhanced session management
- Improved input validation

Tested with existing cloud functions.
```

#### Build System Changes
```bash
build(webpack): optimize production bundle size

Implemented code splitting and tree shaking:
- Reduced bundle size by 35%
- Improved first load performance
- Added source map generation for debugging

Build time reduced from 45s to 28s.
```

### Release and Versioning

#### Version Bumps
```bash
chore(release): prepare version 1.2.0

Updated version across:
- package.json
- CHANGELOG.md
- Release documentation

Includes security improvements and new features.
```

#### Hotfix Releases
```bash
chore(release): emergency hotfix v1.1.1

SECURITY: Critical
IMPACT: Addresses authentication bypass vulnerability

Fast-track release for critical security patch.
Bypassed standard release process with CISO approval.
```

---

## Best Practices

### Writing Effective Commit Messages

#### 1. Be Atomic
**One logical change per commit**

❌ Bad:
```bash
feat(auth): add MFA and fix login bug and update docs

Added multi-factor authentication, fixed null pointer
in login, updated README with new features.
```

✅ Good:
```bash
feat(auth): implement TOTP-based multi-factor authentication

Added MFA support with backup codes and recovery options.
Integrates with existing authentication flow.

fix(auth): resolve null pointer exception in login

Fixed NPE when username is empty.
Added proper input validation.

docs(readme): document MFA setup process

Added step-by-step MFA configuration guide.
```

#### 2. Use Imperative Mood
Write as if giving a command:

❌ Bad: "Added", "Fixed", "Updated"  
✅ Good: "Add", "Fix", "Update"

#### 3. Explain Why, Not Just What

❌ Bad:
```bash
fix(api): change timeout value

Changed timeout from 30s to 60s.
```

✅ Good:
```bash
fix(api): increase timeout for large file uploads

Increased timeout from 30s to 60s to accommodate
large file uploads that were timing out in production.
Addresses customer complaints about upload failures.
```

#### 4. Include Breaking Changes

```bash
feat(api): redesign authentication endpoints

BREAKING CHANGE: Authentication endpoints now return
JWT tokens instead of session cookies. Client applications
must be updated to use Authorization header.

Migration guide available in docs/MIGRATION.md
```

#### 5. Reference Issues and Requirements

```bash
feat(payment): integrate with new payment processor

Implements support for ACH payments and bank transfers.
Addresses business requirement for expanded payment options.

Closes #456
Refs: PCI-DSS Req 3.4.1
See: docs/payment-integration.md
```

### Security-Specific Best Practices

#### 1. Always Classify Security Changes
Every `security` or `hotfix` commit MUST include classification:

```bash
security(auth): implement account lockout policy

SECURITY: Medium
PCI-DSS: Req 8.3.4
IMPACT: Prevents brute force attacks

Locks accounts after 10 failed login attempts.
30-minute lockout duration with admin override.
```

#### 2. Include Impact Assessment
Explain the security improvement:

```bash
IMPACT: Reduces risk of credential compromise by 75%
IMPACT: Ensures compliance with updated PCI DSS requirements
IMPACT: Prevents data exfiltration through API endpoints
```

#### 3. Reference CVEs When Applicable
```bash
fix(deps): update lodash to resolve security vulnerability

SECURITY: High
CVE: CVE-2025-12345
IMPACT: Prevents prototype pollution attacks

Updated lodash from 4.17.20 to 4.17.21.
Addresses critical security vulnerability.
```

#### 4. Document Rollback Procedures
For critical changes:

```bash
security(auth): implement new session management

SECURITY: High
PCI-DSS: Req 8.2.8
IMPACT: Enhanced session security

ROLLBACK: Set LEGACY_SESSION_MODE=true in environment
Previous session handling available for 30 days.
```

### Collaboration Best Practices

#### 1. Co-Author Attribution
```bash
feat(api): implement GraphQL endpoint

Co-authored-by: Jane Developer <jane@example.com>
Co-authored-by: Bob Security <bob@example.com>
```

#### 2. Review References
```bash
feat(payment): add stripe integration

Reviewed-by: Security Team
Approved-by: Lead Developer
PR: #789
```

#### 3. Testing Notes
```bash
fix(auth): resolve session timeout issue

Testing:
- Manual testing with 15-minute timeout
- Automated tests for edge cases
- Security team penetration testing completed

All tests passing in staging environment.
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Commit Message Rejected

**Error**: "Commit message does not follow conventional commit format"

**Solution**:
```bash
# Check format
echo "your message" | yarn commit:validate

# Correct format example
git commit -m "feat(auth): implement password reset functionality"
```

#### 2. Security Classification Missing

**Error**: "Security commits must include security classification"

**Solution**:
```bash
# Add security classification to commit body
git commit -m "security(auth): implement rate limiting

SECURITY: Medium
PCI-DSS: Req 8.2.8
IMPACT: Prevents brute force attacks"
```

#### 3. Pre-commit Hook Failures

**Error**: "ESLint checks failed"

**Solution**:
```bash
# Fix linting issues
yarn lint:fix

# Or check specific files
yarn lint src/path/to/file.js
```

**Error**: "Semgrep security analysis failed"

**Solution**:
```bash
# Run Semgrep manually
yarn security:semgrep

# Fix identified security issues
# Then commit again
```

#### 4. Secret Detection Alerts

**Error**: "Potential secrets detected in staged files"

**Solution**:
```bash
# Check what was detected
git diff --cached | grep -E "(password|secret|key|token)"

# Remove secrets and use environment variables
# Update .env.example with placeholder values
```

#### 5. Hook Installation Issues

**Error**: "Git hooks not found"

**Solution**:
```bash
# Reinstall hooks
yarn hooks:repair

# Verify installation
yarn hooks:validate

# Check permissions
ls -la .git/hooks/
chmod +x .git/hooks/*
```

### IDE-Specific Issues

#### VSCode
- Install "Conventional Commits" extension
- Configure commit message template
- Set up ESLint integration

#### IntelliJ/WebStorm
- Enable Git commit message template
- Configure ESLint plugin
- Set up pre-commit checks

#### Command Line
```bash
# Set up global commit template
git config --global commit.template ~/.gitmessage

# Create template file
cat > ~/.gitmessage << 'EOF'
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>
EOF
```

---

## Tools Integration

### IDE Extensions and Plugins

#### Visual Studio Code
**Recommended Extensions**:

1. **Conventional Commits** by `vivaxy`
   - Auto-completion for commit types
   - Template generation
   - Format validation

2. **GitLens** by `Eric Amodio`
   - Enhanced git integration
   - Commit history visualization
   - Blame annotations

3. **ESLint** by `Microsoft`
   - Real-time linting
   - Auto-fix on save
   - Security rule highlighting

**Configuration**:
```json
// .vscode/settings.json
{
  "conventionalCommits.scopes": [
    "auth",
    "api",
    "db",
    "encryption",
    "logging",
    "security",
    "compliance"
  ],
  "git.inputValidation": "always",
  "git.inputValidationLength": 50,
  "git.inputValidationSubjectLength": 50
}
```

#### IntelliJ IDEA / WebStorm
**Plugins**:

1. **Git Commit Template**
   - Structured commit messages
   - Custom templates
   - Validation rules

2. **ESLint Integration**
   - Built-in support
   - Real-time feedback
   - Auto-fix capabilities

**Configuration**:
```xml
<!-- .idea/vcs.xml -->
<component name="VcsConfiguration">
  <option name="COMMIT_MESSAGE_MARGIN_COLUMNS" value="50" />
  <option name="WRAP_WHEN_TYPING_REACHES_RIGHT_MARGIN" value="true" />
</component>
```

### Git Configuration

#### Global Settings
```bash
# Set up commit message template
git config --global commit.template ~/.gitmessage

# Enable commit message editor
git config --global core.editor "code --wait"

# Set up aliases
git config --global alias.cz "!yarn cz"
git config --global alias.hooks "!yarn hooks:validate"
```

#### Repository Settings
```bash
# Set up local hooks path
git config core.hooksPath .githooks

# Enable commit message validation
git config commit.template .gitmessage
```

### Automation Tools

#### Commitizen
**Installation**:
```bash
# Global installation
npm install -g commitizen cz-conventional-changelog

# Local configuration
yarn add -D commitizen cz-conventional-changelog
```

**Configuration** (`package.json`):
```json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

**Usage**:
```bash
# Interactive commit
yarn cz
# or
git cz
```

#### Husky + lint-staged
**Configuration** (`.lintstagedrc.js`):
```javascript
module.exports = {
  '*.js': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.md': [
    'prettier --write'
  ],
  'CHANGELOG.md': [
    'yarn changelog:validate'
  ]
}
```

### CI/CD Integration

#### GitHub Actions
Our workflow automatically:
- ✅ Validates all commit messages in PRs
- ✅ Runs security scans on code changes
- ✅ Generates changelogs from commits
- ✅ Creates releases with proper notes

#### Local Development
```bash
# Pre-push validation
yarn prepush

# Manual changelog generation
yarn changelog:generate

# Release preparation
yarn release:prepare
```

---

## FAQ

### General Questions

**Q: Do I need to follow this for every commit?**  
A: Yes, all commits must follow conventional format. Git hooks enforce this automatically.

**Q: What if I make a mistake in my commit message?**  
A: Use `git commit --amend` to fix the last commit, or `git rebase -i` for older commits.

**Q: Can I use emojis in commit messages?**  
A: We discourage emojis to maintain professional audit trails for PCI DSS compliance.

### Security Questions

**Q: When do I need security classification?**  
A: Always for `security` and `hotfix` commit types. Optional but recommended for security-impacting `feat` or `fix` commits.

**Q: What if I'm not sure about the security level?**  
A: Consult with the security team. When in doubt, classify as "Medium" and add "REVIEW: Security team input needed".

**Q: Do dependency updates need security classification?**  
A: Only if they address security vulnerabilities. Regular dependency updates use `chore` type.

### PCI DSS Questions

**Q: Which changes require PCI DSS references?**  
A: Any changes affecting data protection, access control, network security, logging, or authentication systems.

**Q: How do I find the right PCI DSS requirement?**  
A: Check our [PCI DSS compliance documentation](../planning/pci_dss_4.0/) or consult the compliance officer.

**Q: What if a change affects multiple requirements?**  
A: List the primary requirement and note others: `PCI-DSS: Req 8.2.1 (also affects Req 7.1.1, 10.2.1)`.

### Technical Questions

**Q: My git hooks aren't working. What should I do?**  
A: Run `yarn hooks:validate` to check status, then `yarn hooks:repair` to fix installation.

**Q: Can I bypass the hooks for urgent fixes?**  
A: Use `git commit --no-verify` only for true emergencies. Follow up with proper commit message ASAP.

**Q: How do I test my commit message format?**  
A: Use `echo "your message" | yarn commit:validate` before committing.

---

## Support and Resources

### Documentation
- [README.md](../README.md) - Quick reference
- [CLAUDE.md](../CLAUDE.md) - Development guidelines
- [SECURE_DEVELOPMENT_GUIDE.md](SECURE_DEVELOPMENT_GUIDE.md) - Security practices
- [CHANGELOG.md](../CHANGELOG.md) - Project changelog

### Tools and Scripts
- `yarn hooks:install` - Install git hooks
- `yarn hooks:validate` - Check hook status
- `yarn commit:validate` - Test commit messages
- `yarn changelog:generate` - Generate changelog
- `yarn security:all` - Run security checks

### External Resources
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Semantic Versioning](https://semver.org/)

### Contact
- **Development Team**: dev@meeplab.com
- **Security Team**: security@meeplab.com
- **Compliance Officer**: compliance@meeplab.com

---

**Document Version**: 1.0  
**Last Updated**: August 19, 2025  
**Next Review**: September 19, 2025  
**Maintained by**: Development & Security Teams