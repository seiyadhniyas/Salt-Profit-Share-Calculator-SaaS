import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const container = document.getElementById('root')

if (!container) {
  // Fallback error UI if root element not found
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif;">
      <div style="text-align: center; padding: 2rem; max-width: 500px;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 1rem; color: #ef4444;">⚠️ App Failed to Load</h1>
        <p style="color: #64748b; margin-bottom: 1rem;">The root container not found. Please clear your browser cache and refresh.</p>
        <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #6366f1; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 14px; font-weight: 600;">Refresh Page</button>
      </div>
    </div>
  `
  throw new Error('Root container element not found')
}

try {
  const root = createRoot(container)
  console.log('index: bootstrapping app, root element found')
  root.render(<App />)
} catch (error) {
  console.error('Failed to render app:', error)
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif;">
      <div style="text-align: center; padding: 2rem; max-width: 500px;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 1rem; color: #ef4444;">⚠️ Something Went Wrong</h1>
        <p style="color: #64748b; margin-bottom: 0.5rem;">Error: ${error.message || 'Unknown error'}</p>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 1rem;">Check browser console for details</p>
        <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #6366f1; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 14px; font-weight: 600;">Refresh Page</button>
      </div>
    </div>
  `
}
