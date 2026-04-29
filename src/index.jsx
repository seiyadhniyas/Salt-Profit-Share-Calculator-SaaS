import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const container = document.getElementById('root')
if (!container) {
  console.error('Fatal error: root container not found')
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: monospace;">Error: Root container not found</div>'
} else {
  try {
    const root = createRoot(container)
    console.log('index: bootstrapping app, root element:', !!container)
    root.render(<App />)
  } catch (error) {
    console.error('Fatal error rendering app:', error)
    container.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">Error: ${error.message}</div>`
  }
}

// Unregister all service workers to clear cached broken versions
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().catch((error) => {
        console.warn('[SW] Error unregistering service worker:', error)
      })
    })
  })
}
