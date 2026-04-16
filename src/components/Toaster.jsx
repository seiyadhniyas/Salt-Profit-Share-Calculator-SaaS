import React from 'react'

export default function Toaster({ toasts = [], onClose = () => {} }) {
  return (
    <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className={`max-w-sm w-full rounded-lg shadow-lg px-4 py-3 font-semibold text-sm ${t.type === 'error' ? 'bg-rose-600 text-white' : t.type === 'warning' ? 'bg-yellow-500 text-black' : 'bg-slate-900 text-white'}`}>
          <div className="flex items-start justify-between gap-4">
            <div style={{ flex: 1 }}>{t.message}</div>
            <button onClick={() => onClose(t.id)} className="ml-3 opacity-80 hover:opacity-100 font-bold">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
