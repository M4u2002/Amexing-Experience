module.exports = {
  apps: [
    {
      serverURL: process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse',
      appId: process.env.PARSE_APP_ID || 'amexing-app-id',
      masterKey: process.env.PARSE_MASTER_KEY || 'master-key-change-in-production',
      appName: 'AmexingWeb',
      production: process.env.NODE_ENV === 'production',
      primaryBackgroundColor: '#1E3A8A',
      secondaryBackgroundColor: '#3B82F6',
    },
  ],
  users: [
    {
      user: process.env.PARSE_DASHBOARD_USER || 'admin',
      pass: process.env.PARSE_DASHBOARD_PASS || 'admin-password-change-in-production',
      apps: [
        {
          appId: process.env.PARSE_APP_ID || 'amexing-app-id',
        },
      ],
    },
  ],
  useEncryptedPasswords: process.env.NODE_ENV === 'production',
  trustProxy: process.env.NODE_ENV === 'production',
  cookieSessionSecret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
  allowInsecureHTTP: process.env.NODE_ENV === 'development',
};