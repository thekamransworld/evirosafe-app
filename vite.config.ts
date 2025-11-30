import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EviroSafe HSE Manager',
        short_name: 'EviroSafe',
        description: 'Next-Gen HSE Command Center',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
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
          }
        ]
      },
      // 👇 Add this block to make dev manifest work correctly
      devOptions: {
        enabled: true
      }
    })
  ]
});
