// e2e + axe (BUILD_SPEC 8, 10). Tests live in tests/e2e/*.spec.js.
import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: 'tests/e2e',
  // Outside the repo: synced folders (OneDrive) lock Playwright’s artefact directory.
  outputDir: join(tmpdir(), 'norms-tracker-test-results'),
  use: { baseURL: 'http://localhost:8137/' },
  webServer: { command: 'npx --yes serve . -l 8137', url: 'http://localhost:8137/', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
