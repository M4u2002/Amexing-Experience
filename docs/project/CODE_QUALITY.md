# AmexingWeb - Code Quality & Analysis Tools

## Overview
This project uses a comprehensive code analysis toolchain to ensure code quality, security, and maintainability. All tools are configured to work with yarn and follow best practices for the Parse Server stack.

## Quick Commands

### Quality & Security Analysis
```bash
# Run all quality checks (recommended before push)
yarn quality:all

# Individual checks
yarn lint                    # ESLint code analysis
yarn security:audit         # Yarn security audit
yarn security:semgrep      # Semgrep security analysis
yarn docs:coverage         # JSDoc documentation coverage
yarn deps:check            # Check for unused dependencies

# Code complexity analysis
yarn quality:complexity    # Cyclomatic complexity check

# SonarQube analysis
yarn sonar:local           # Run against local SonarQube server
yarn sonar:coverage        # Run tests with coverage + SonarQube analysis
yarn sonar:scan            # Generic SonarQube scan
```

### Documentation
```bash
yarn docs                  # Generate JSDoc documentation
yarn docs:coverage         # Check documentation coverage (80% threshold)
```

### Git Hooks
- **Pre-commit**: Runs linting, formatting, documentation coverage, and basic security checks
- **Pre-push**: Runs comprehensive quality analysis including security scans

## Tool Configuration

### SonarQube Community Edition
- **Config**: `sonar-project.properties`
- **Scanner**: `sonarqube-scanner` (npm package)
- **Local Server**: `http://localhost:9000` (default)
- **Coverage Integration**: Jest LCOV reports
- **File Size Limit**: 2000 KB (increased for Parse Server)
- **Setup**: Download and run SonarQube Community Edition locally (no account required)

### ESLint
- **Config**: `.eslintrc.js`
- **Complexity Config**: `.complexity-eslintrc.js`
- **Rules**: Airbnb base + JSDoc enforcement + security + complexity limits
- **Max Complexity**: 8 (configurable)
- **Max Function Lines**: 50
- **Max File Lines**: 300

### JSDoc Documentation
- **Config**: `jsdoc.conf.js`
- **Coverage Script**: `scripts/doc-coverage.js`
- **Minimum Coverage**: 80%
- **Output**: `./docs/` directory

### Semgrep Security Analysis
- **Config**: `.semgrep.yml`
- **Ignore**: `.semgrepignore`
- **Rules**: security-audit, nodejs, javascript, express, secrets
- **Installation**: Uses pipx (Python package manager)

### Dependency Analysis
- **depcheck**: Finds unused dependencies
- **license-checker**: Analyzes dependency licenses
- **yarn audit**: Security vulnerability scanning

## SonarQube Setup Guide

### Local Installation (No Account Required)

1. **Prerequisites**: Java 17 or Java 21

2. **Download & Install**:
   ```bash
   # Download SonarQube Community Edition ZIP from https://www.sonarsource.com/products/sonarqube/downloads/
   # Extract to /opt/sonarqube (Linux/Mac) or C:\sonarqube (Windows)
   ```

3. **Start Server**:
   ```bash
   # Linux/Mac
   /opt/sonarqube/bin/linux-x86-64/sonar.sh console
   
   # Windows
   C:\sonarqube\bin\windows-x86-64\StartSonar.bat
   
   # Docker (Alternative)
   docker run -d --name sonarqube -p 9000:9000 sonarqube:latest
   ```

4. **Access Dashboard**:
   - Open `http://localhost:9000`
   - Default login: `admin/admin` (change on first login)

5. **Run Analysis**:
   ```bash
   yarn sonar:local
   ```

## Native Git Hooks

### Pre-commit Hook (`.git/hooks/pre-commit`)
Runs automatically on `git commit`:
- ESLint validation
- Code formatting check
- Documentation coverage check (warning only)
- Large file detection
- Basic secret pattern detection (interactive)

### Pre-push Hook (`.git/hooks/pre-push`)
Runs automatically on `git push`:
- Full quality analysis (`yarn quality:all`)
- Code complexity analysis (warning only)
- Dependency health checks (warning only)
- Outdated package detection (informational)

## Package.json Scripts Reference

```json
{
  "scripts": {
    // Quality & Analysis
    "quality:all": "yarn lint && yarn security:all && yarn deps:check && yarn docs:coverage",
    "quality:complexity": "eslint src/ --ext .js --no-eslintrc --config .complexity-eslintrc.js",
    
    // Security
    "security:audit": "yarn audit",
    "security:semgrep": "export PATH=\"$PATH:/Users/black4ninja/.local/bin\" && semgrep --config=auto --error src/",
    "security:all": "yarn security:audit && yarn security:semgrep",
    
    // Documentation
    "docs": "jsdoc -c jsdoc.conf.js",
    "docs:coverage": "node scripts/doc-coverage.js",
    
    // SonarQube
    "sonar:scan": "sonar-scanner",
    "sonar:local": "sonar-scanner -Dsonar.host.url=http://localhost:9000",
    "sonar:coverage": "yarn test:coverage && yarn sonar:local",
    
    // Dependencies
    "deps:check": "depcheck",
    "deps:outdated": "yarn outdated",
    "deps:licenses": "license-checker --summary"
  }
}
```

## Installation Notes

### SonarQube Scanner
```bash
# Already included as dev dependency
yarn add -D sonarqube-scanner

# Verify installation
npx sonar-scanner --version
```

### Semgrep Setup
```bash
# Install via pipx (Python package manager)
pipx install semgrep
pipx ensurepath  # Add to PATH

# Verify installation
semgrep --version
```

### Yarn Audit Tools
```bash
# Install yarn-audit-fix for automatic fixes
yarn add -D yarn-audit-fix

# Usage
yarn security:audit        # Check for vulnerabilities
yarn security:audit:fix    # Attempt automatic fixes
```

## Troubleshooting

### Common Issues

1. **SonarQube connection errors**
   ```bash
   # Ensure SonarQube server is running
   curl http://localhost:9000/api/system/status
   
   # Check sonar-project.properties configuration
   # Verify sonar.host.url setting
   ```

2. **Semgrep not found in PATH**
   ```bash
   export PATH="$PATH:/Users/$(whoami)/.local/bin"
   pipx ensurepath
   ```

3. **Git hooks not executing**
   ```bash
   chmod +x .git/hooks/pre-commit
   chmod +x .git/hooks/pre-push
   ```

4. **Documentation coverage failures**
   - Add JSDoc comments to functions and classes
   - Minimum threshold is 80% (configurable in `scripts/doc-coverage.js`)

5. **SonarQube Java version issues**
   - Ensure Java 17 or Java 21 is installed
   - Check `java --version`

## Best Practices

1. **Before Committing**: Run `yarn quality:all` to catch issues early
2. **Documentation**: Add JSDoc comments to all public functions and classes
3. **Complexity**: Keep functions under 8 cyclomatic complexity
4. **Security**: Review Semgrep and SonarQube findings, fix high-severity issues
5. **Dependencies**: Regularly check for outdated packages with `yarn deps:outdated`
6. **SonarQube**: Review quality gates and technical debt regularly

## Development Workflow

1. Write code following existing patterns
2. Add JSDoc documentation for new functions/classes
3. Run `yarn quality:all` before committing
4. Commit changes (pre-commit hook runs automatically)
5. Review SonarQube analysis results at `http://localhost:9000`
6. Push to remote (pre-push hook runs comprehensive checks)

## SonarQube Metrics & Quality Gates

### Default Quality Gate Conditions
- **Coverage**: > 80% (when available)
- **Duplicated Lines**: < 3%
- **Maintainability Rating**: A
- **Reliability Rating**: A
- **Security Rating**: A
- **Security Hotspots**: Reviewed

### Key Metrics Tracked
- **Technical Debt**: Time to fix maintainability issues
- **Code Smells**: Maintainability issues
- **Bugs**: Reliability issues
- **Vulnerabilities**: Security issues
- **Security Hotspots**: Security-sensitive code requiring review
- **Duplications**: Code duplication percentage
- **Coverage**: Test coverage percentage

## Tool Versions
- **SonarQube Scanner**: ^4.3.0
- **ESLint**: ^8.56.0
- **Semgrep**: Latest (installed via pipx)
- **JSDoc**: ^4.0.4
- **Yarn**: >=1.22.0
- **Node.js**: >=18.0.0
- **SonarQube Community Edition**: Latest (local installation)