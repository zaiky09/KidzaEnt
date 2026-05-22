/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-update the service worker whenever a new build hits the server.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kidza Marketplace',
        short_name: 'Kidza',
        description: 'Kidza Enterprise marketplace — products, services, and AI-powered shopping.',
        theme_color: '#000000',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'en',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Don't precache the giant catalog images or any of our backend API
        // responses — those should always go to the network when online.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // OpenStreetMap tiles: cache aggressively, fall back to cached on network failure.
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // Avatars and placeholders.
            urlPattern: ({ url }) => /^(placehold\.co|ui-avatars\.com)$/.test(url.hostname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'avatars-and-placeholders' }
          }
        ]
      },
      devOptions: {
        // Enable the SW in `npm run dev` so we can test install prompts locally.
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    fs: {
      allow: [path.resolve(import.meta.dirname, '..')]
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false
  }
})
