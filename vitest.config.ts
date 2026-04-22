import { defineConfig } from 'vitest/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    root: './',
    globals: true,
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/*.e2e-spec.ts',
    ],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.github'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    environment: 'node',
  },
  plugins: [tsConfigPaths()],
});
