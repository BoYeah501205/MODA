import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // Add any babel plugins here if needed
        ]
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdnjs-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          }
        ]
      },
      manifest: {
        name: 'MODA - Modular Operations Dashboard',
        short_name: 'MODA',
        description: 'Optimized modular operations dashboard application',
        theme_color: '#1E3A5F',
        background_color: '#F0F2F5',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './js'),
      '@/components': path.resolve(__dirname, './js/components'),
      '@/hooks': path.resolve(__dirname, './js/hooks'),
      '@/utils': path.resolve(__dirname, './js/utils'),
      '@/types': path.resolve(__dirname, './js/types')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['./js/utils.js', './js/constants.js'],
          storage: ['./js/storage.js', './js/stateManager.js', './js/dataLayer.js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 8000,
    host: true,
    open: true
  },
  preview: {
    port: 8000,
    host: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
