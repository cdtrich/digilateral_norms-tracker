// e2e + axe (BUILD_SPEC 8, 10). Tests go in tests/e2e/*.spec.js once the UI exists.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:8137/' },
  webServer: { command: 'npx --yes serve . -l 8137', url: 'http://localhost:8137/', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
