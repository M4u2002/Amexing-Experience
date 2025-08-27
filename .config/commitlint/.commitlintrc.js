module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Basic rules
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Code style changes
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Tests
        'build',    // Build system changes
        'ci',       // CI configuration
        'chore',    // Maintenance tasks
        'revert',   // Revert previous commit
        'security', // Security-related changes (PCI DSS)
        'hotfix',   // Critical security/bug fixes
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
  // Custom parser for PCI DSS compliance
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\(([^\)]*)\))?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  // Custom plugins for security validation
  plugins: [
    {
      rules: {
        'security-classification': (parsed) => {
          const { type, body } = parsed;
          
          // Security and hotfix commits must include security classification
          if (['security', 'hotfix'].includes(type)) {
            if (!body || !body.includes('SECURITY:')) {
              return [
                false,
                'Security commits must include "SECURITY: [Critical|High|Medium|Low]" in body',
              ];
            }
            
            const securityMatch = body.match(/SECURITY:\s*(Critical|High|Medium|Low)/i);
            if (!securityMatch) {
              return [
                false,
                'Security classification must be: Critical, High, Medium, or Low',
              ];
            }
          }
          
          return [true, ''];
        },
        'pci-dss-reference': (parsed) => {
          const { type, body } = parsed;
          
          // Security commits should reference PCI DSS requirements
          if (['security', 'hotfix'].includes(type)) {
            if (!body || !body.includes('PCI-DSS:')) {
              return [
                false,
                'Security commits should include "PCI-DSS: Req X.X.X" reference',
              ];
            }
          }
          
          return [true, ''];
        },
        'no-sensitive-data': (parsed) => {
          const { raw } = parsed;
          
          // Check for potential sensitive data in commit messages
          const sensitivePatterns = [
            /password/i,
            /secret/i,
            /token/i,
            /key(?!word)/i,
            /api[_-]?key/i,
            /private[_-]?key/i,
            /credential/i,
            /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card pattern
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
          ];
          
          for (const pattern of sensitivePatterns) {
            if (pattern.test(raw)) {
              return [
                false,
                'Commit message contains potentially sensitive data. Use generic terms instead.',
              ];
            }
          }
          
          return [true, ''];
        },
      },
    },
  ],
};