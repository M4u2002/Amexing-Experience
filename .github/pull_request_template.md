## 📋 Quick Summary
Brief description of changes (1-2 sentences)

## 🔒 Security Check (PCI DSS Required)
- [ ] No hardcoded secrets, passwords, or API keys
- [ ] No cardholder data (PAN) in logs or code comments
- [ ] Security middleware not bypassed or disabled
- [ ] All user inputs validated and sanitized

## ✅ Quality Checklist  
- [ ] Tests pass (`yarn test`)
- [ ] Linting passes (`yarn lint`)
- [ ] No `console.log()` statements in production code
- [ ] Documentation updated (if applicable)

## 🧪 How was this tested?
- [ ] Unit tests
- [ ] Integration tests  
- [ ] Manual testing
- [ ] Security testing (if security-related)

**Test details**: [Describe how you tested this change]

## 🔄 Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## 🚨 Breaking Changes
**Are there breaking changes?** Yes/No

If yes, describe what breaks and how to migrate:

---
**Note**: This PR will be reviewed according to our security guidelines. Security-sensitive changes require approval from `@security-team`.