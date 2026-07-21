import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'EviroSafe HSE Command Center',
        short_name: 'EviroSafe',
        description: 'Next-Gen HSE Management System',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/evirosafe-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/evirosafe-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/evirosafe-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: true }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          'react-core':    ['react', 'react-dom'],

          // Charts — largest single dependency, split out
          'recharts':      ['recharts'],

          // PDF / spreadsheet exports — rarely loaded
          'export-libs':   ['jspdf', 'jspdf-autotable', 'xlsx'],

          // Firebase — auth only, split from data
          'firebase-app':  ['firebase/app', 'firebase/auth'],
          'firebase-db':   ['firebase/firestore', 'firebase/storage'],

          // Google AI
          'google-ai':     ['@google/generative-ai'],

          // Icons
          'lucide':        ['lucide-react'],
        }
      }
    }
  }
});