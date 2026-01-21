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
        theme_color: '#0f172a', // Matches your dark theme background
        background_color: '#0f172a',
        display: 'standalone', // Hides the browser URL bar
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/evirosafe-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/evirosafe-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/evirosafe-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Ensures it looks good on Android round icons
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});