import { defineConfig } from 'vitest/config';

// Standalone vitest config — unit tests only, so the PWA/react build plugins
// from vite.config.js are intentionally not loaded here.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
});
