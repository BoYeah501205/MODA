import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  root: '.',
  
  // Tell Vite to treat these as static assets to copy
  publicDir: false, // Disable default public dir handling
  
  plugins: [
    // React plugin DISABLED - using Babel Standalone for JSX compilation
    // The index.html uses <script type="text/babel"> which requires babel-standalone
    // Vite's React plugin conflicts with this approach
    // react({
    //   include: '**/*.{jsx,tsx,js,ts}'
    // }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // CDN libraries - cache for 1 year (they're versioned)
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdnjs-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unpkg-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Google Fonts - stale while revalidate for fresh fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Supabase API - network first with cache fallback for offline support
          {
            urlPattern: /^https:\/\/syreuphexagezawjyjgt\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes - data can change
              },
              networkTimeoutSeconds: 10 // Fall back to cache if network slow
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
            src: '/public/autovol-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/public/autovol-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/styles': path.resolve(__dirname, './src/styles')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        popout: path.resolve(__dirname, 'weekly-board-popout.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
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
