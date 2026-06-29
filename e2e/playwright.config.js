const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  // Lance automatiquement le serveur statique avant les tests.
  // reuseExistingServer : réutilise un serveur déjà lancé sur le port (ex. dev).
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:8080/',
    reuseExistingServer: true,
    timeout: 10000,
  },
});
