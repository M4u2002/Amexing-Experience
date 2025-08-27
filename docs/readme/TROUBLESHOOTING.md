# Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE :::1337`

**Solution**:
```bash
# Option 1: Change port in .env
PORT=3000

# Option 2: Kill process using port 1337
lsof -ti:1337 | xargs kill -9
```

### MongoDB Connection Failed

**Problem**: `MongoNetworkError: failed to connect to server`

**Solutions**:
```bash
# Check MongoDB is running
brew services start mongodb-community

# Verify connection string in .env
DATABASE_URI=mongodb://localhost:27017/amexingdb

# Test connection directly
mongosh mongodb://localhost:27017/amexingdb
```

### Parse Server Not Starting

**Problem**: Parse Server fails to initialize

**Solutions**:
```bash
# Check Parse Server configuration
cat config/parse-server.js

# Verify app credentials in .env
PARSE_APP_ID=your-app-id
PARSE_MASTER_KEY=your-master-key

# Check Parse Server logs
tail -f logs/parse-server.info.*
```

### Tests Failing

**Problem**: Jest tests not passing

**Solutions**:
```bash
# Run specific test file
yarn test tests/unit/controllers/authController.test.js

# Clear Jest cache
yarn test --clearCache

# Run with verbose output
yarn test --verbose

# Check test database connection
TEST_DATABASE_URI=mongodb://localhost:27017/AmexingTEST
```

### Authentication Issues

**Problem**: Users cannot log in

**Solutions**:
```bash
# Check session configuration
cat src/index.js | grep session

# Verify session secret is set
echo $SESSION_SECRET

# Check authentication middleware
cat src/application/middleware/authMiddleware.js
```

### Security Scan Failures

**Problem**: `yarn security:all` failing

**Solutions**:
```bash
# Check individual security tools
yarn security:audit
yarn security:semgrep

# Fix critical vulnerabilities
yarn audit fix

# Update dependencies
yarn upgrade
```

## 🔍 Debugging Tools

### Application Logs
```bash
# Today's application log
tail -f logs/application-$(date +%Y-%m-%d).log

# Today's error log
tail -f logs/error-$(date +%Y-%m-%d).log

# Parse Server logs
tail -f logs/parse-server.info.$(date +%Y-%m-%d)
```

### Database Debugging
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/amexingdb

# List collections
show collections

# Query users (for debugging only)
db._User.find().limit(5)
```

### Network Debugging
```bash
# Check if ports are open
netstat -tulpn | grep :1337
netstat -tulpn | grep :27017

# Test HTTP endpoints
curl -i http://localhost:1337/health
curl -i http://localhost:1337/api/status
```

## 🔒 Security Issues

### Audit Failures

**Problem**: High/Critical vulnerabilities found

**Solution**:
```bash
# View detailed audit report
yarn audit --json

# Fix automatically where possible
yarn audit fix

# Manual update for critical issues
yarn add package-name@latest
```

### Secret Detection Alerts

**Problem**: Hardcoded secrets detected

**Solution**:
1. Remove hardcoded values from code
2. Move to environment variables
3. Add to `.env.example` with placeholder values
4. Update `.gitignore` to exclude `.env`

### Permission Denied Errors

**Problem**: File permission issues

**Solution**:
```bash
# Fix Node.js permissions
sudo chown -R $(whoami) ~/.npm

# Fix project permissions  
sudo chown -R $(whoami) /path/to/amexing-web
```

## 🆘 Emergency Procedures

### Application Down

1. **Check process status**:
```bash
pm2 status
```

2. **Restart services**:
```bash
yarn pm2:restart
```

3. **Check logs immediately**:
```bash
yarn pm2:logs --lines 50
```

### Database Issues

1. **Check MongoDB status**:
```bash
brew services list | grep mongodb
```

2. **Restart MongoDB**:
```bash
brew services restart mongodb-community
```

3. **Verify connection**:
```bash
mongosh --eval "db.adminCommand('ping')"
```

## 📞 Getting Help

1. **Check logs first** - Most issues show up in application logs
2. **Search existing issues** - Check project documentation
3. **Run diagnostics**:
   ```bash
   yarn test:startup  # Validates entire application startup
   ```
4. **Create minimal reproduction** - Isolate the specific problem

For security-related issues, see: [SECURITY.md](../SECURITY.md)