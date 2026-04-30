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
// runtime env values (inlined at build time)
const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function showEnvError(message, details = {}) {
  console.error('Runtime environment error:', message, details)
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#fff7ed;font-family:system-ui,-apple-system,sans-serif;">
      <div style="text-align:center;padding:2rem;max-width:640px;">
        <h1 style="font-size:22px;font-weight:700;margin-bottom:0.75rem;color:#b45309;">⚠️ Configuration Issue</h1>
        <p style="color:#92400e;margin-bottom:1rem;">${message}</p>
        <p style="color:#7c2d12;font-size:13px;margin-bottom:1rem;">If you manage this site, ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in the build environment.</p>
        <button onclick="location.reload()" style="padding:0.6rem 1.2rem;background:#92400e;color:white;border:none;border-radius:0.375rem;cursor:pointer;font-size:13px;font-weight:600;">Reload</button>
      </div>
    </div>
  `
}

// If deployed (not localdev), attempt to unregister service workers and clear related caches.
// This helps when a previous service worker served stale/broken app shell.
if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname) && !window.location.hostname.startsWith('192.168.')) {
  (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations().catch(() => [])
        for (const r of regs) {
          try { await r.unregister() } catch(e) {}
        }
      }
    } catch (e) {}
    try {
      if (window.caches && window.caches.keys) {
        const keys = await caches.keys()
        for (const k of keys) {
          try {
            if (k && k.includes('salt-calculator')) await caches.delete(k)
          } catch(e) {}
        }
      }
    } catch (e) {}
  })()
}

// If essential env vars missing, show friendly error and stop bootstrapping.
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  showEnvError('Supabase credentials missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are not defined', {
    VITE_SUPABASE_URL: !!VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!VITE_SUPABASE_ANON_KEY
  })
  // do not proceed to mount the app so user sees the error UI
} else {
  try {
    const root = createRoot(container)
    console.log('index: bootstrapping app, root element found')
    root.render(<App />)
  } catch (error) {
    console.error('Failed to render app:', error)
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
        <div style="text-align:center;padding:2rem;max-width:500px;">
          <h1 style="font-size:24px;font-weight:700;margin-bottom:1rem;color:#ef4444;">⚠️ Something Went Wrong</h1>
          <p style="color:#64748b;margin-bottom:0.5rem;">Error: ${error.message || 'Unknown error'}</p>
          <p style="color:#94a3b8;font-size:12px;margin-bottom:1rem;">Check browser console for details</p>
          <button onclick="location.reload()" style="padding:0.75rem 1.5rem;background:#6366f1;color:white;border:none;border-radius:0.5rem;cursor:pointer;font-size:14px;font-weight:600;">Refresh Page</button>
        </div>
      </div>
    `
  }
}
