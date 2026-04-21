import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: './',
  plugins: [
    react(),
    // Dev-only: provide a simple middleware to stub Netlify function routes so the app
    // can run without a local functions runtime. This returns a JSON stub for
    // requests under /.netlify/functions/* during development.
    {
      name: 'netlify-functions-dev-stub',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/.netlify/functions/')) {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ ok: false, error: 'dev-stub: no functions runtime' }))
            return
          }
          next()
        })
      }
    }
  ],
  server: {
    port: 3000,
    open: true,
    hmr: false,
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
