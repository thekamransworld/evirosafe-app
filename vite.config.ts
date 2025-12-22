import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/evirosafe-192.png', 'icons/evirosafe-512.png'],
      manifest: {
        name: 'EviroSafe HSE Manager',
        short_name: 'EviroSafe',
        description: 'Next-Gen HSE Command Center',
        theme_color: '#020617',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icons/evirosafe-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/evirosafe-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      // ✅ FIX: allow precaching files bigger than 2MiB
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024 // 8 MiB
      },

      devOptions: {
        enabled: true
      }
    })
  ]
});
