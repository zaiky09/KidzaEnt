import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Tell esbuild to use the automatic JSX runtime so test files don't need
    // an explicit `import React` for JSX (matches the React plugin defaults).
    jsx: 'automatic'
  },
  server: {
    fs: {
      allow: [path.resolve(import.meta.dirname, '..')]
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost:5173/' }
    },
    setupFiles: ['./src/test/setup.js'],
    css: false,
    include: ['src/**/*.test.{js,jsx}']
  }
})
