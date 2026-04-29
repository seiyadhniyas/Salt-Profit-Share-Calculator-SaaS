import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: './',
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    host: '0.0.0.0',
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 3000
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['html2canvas', 'jspdf']
        }
      }
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
    }
  }
})
