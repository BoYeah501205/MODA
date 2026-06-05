import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// VitePWA disabled — was overwriting dist/sw.js with a Workbox SW that conflicted
// with the manual kill-switch sw.js. Re-enable only with a proper cache strategy.
// import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  root: '.',
  
  // Tell Vite to treat these as static assets to copy
  publicDir: false, // Disable default public dir handling
  
  // VitePWA DISABLED — was generating dist/sw.js which copy-assets overwrote with
  // our naive caching SW, causing stale index.html with broken CSS hashes each deploy.
  // Re-enable only after implementing a proper network-first navigation strategy.
  // To restore: re-add `import { VitePWA } from "vite-plugin-pwa"` and the plugin call.
  plugins: [],
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
