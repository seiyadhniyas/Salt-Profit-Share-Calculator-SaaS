import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: './',
  plugins: [react()],
  css: {
    postcss: null
  },
  server: {
    port: 3000,
    open: true,
    middleware: true
  }
})
