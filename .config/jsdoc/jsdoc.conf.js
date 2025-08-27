/**
 * JSDoc Configuration
 * Generates API documentation from JSDoc comments
 */
module.exports = {
  source: {
    include: ['./src/', './README.md'],
    includePattern: '\\.(js|md)$',
    exclude: [
      './node_modules/',
      './tests/',
      './coverage/',
      './.runtime/logs/',
      './src/**/*.test.js',
    ],
  },
  opts: {
    destination: './docs/api-reference/',
    recurse: true,
  },
  plugins: [
    'plugins/markdown',
    'plugins/summarize',
  ],
  templates: {
    cleverLinks: false,
    monospaceLinks: false,
    default: {
      outputSourceFiles: true,
    },
  },
  markdown: {
    parser: 'gfm',
    hardwrap: false,
  },
  tags: {
    allowUnknownTags: true,
    dictionaries: ['jsdoc', 'closure'],
  },
};