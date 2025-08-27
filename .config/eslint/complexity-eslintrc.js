/**
 * ESLint Configuration for Complexity Analysis
 * Focus only on complexity-related rules
 */
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Complexity Rules
    'complexity': ['error', 8], // Cyclomatic complexity max 8
    'max-depth': ['error', 4], // Maximum nesting depth
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    'max-params': ['error', 4], // Maximum function parameters
    'max-statements': ['error', 20], // Maximum statements per function
    'max-nested-callbacks': ['error', 3], // Maximum nested callbacks
    'max-statements-per-line': ['error', { max: 1 }],
  },
};