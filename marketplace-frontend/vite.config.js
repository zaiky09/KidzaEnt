import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow Vite to serve files from the monorepo root so the frontend can
      // import the shared/categories.json file that the backend also uses.
      allow: [path.resolve(__dirname, '..')]
    }
  }
})
