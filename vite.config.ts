// Deviation (1): import defineConfig from 'vitest/config' (not 'vite') so the
// `test` block below type-checks under strict mode — vitest/config re-exports
// Vite's defineConfig with the Vitest `test` option merged in.
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
// Deviation (2): svelteTesting() from '@testing-library/svelte/vite' adds the
// `browser` resolve condition (+ auto-cleanup) under VITEST so Svelte 5
// components render their client build in jsdom for @testing-library/svelte v5.
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  base: '/gemsweeper/',
  // vite-plugin-svelte v5 (required for Vite 6) integrates HMR into Svelte 5
  // core and deprecates the `hot` option; HMR is inert under Vitest anyway, so
  // the brief's `svelte({ hot: !process.env.VITEST })` is just `svelte()` here.
  plugins: [svelte(), svelteTesting()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
