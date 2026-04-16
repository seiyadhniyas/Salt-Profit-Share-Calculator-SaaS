import React, { useEffect, useState } from 'react'
import { getEvents, clearEvents } from '../utils/eventLogger.js'

export default function AiEventsViewer({ isOpen = false, onClose = () => {}, isAdmin = false, session = null }) {
  const [view, setView] = useState('local') // 'local' | 'remote'
  const [events, setEvents] = useState([])
  const [remoteEvents, setRemoteEvents] = useState([])
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [remoteError, setRemoteError] = useState(null)
  const [page, setPage] = useState(1)
  const perPage = 100

  useEffect(() => {
    if (isOpen) {
      setView('local')
      setEvents(getEvents())
      setRemoteEvents([])
      setRemoteError(null)
      setPage(1)
    }
  }, [isOpen])

  const downloadJson = (data, name = 'ai_events.json') => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (!window.confirm('Clear local AI events? This cannot be undone.')) return
    clearEvents()
    setEvents([])
  }

  const fetchRemote = async (pageToFetch = 1, secret = null, sessionToken = null) => {
    setLoadingRemote(true)
    setRemoteError(null)
    try {
      const qs = `?page=${pageToFetch}&per_page=${perPage}`
      const headers = { 'Content-Type': 'application/json' }
      let url = '/.netlify/functions/getAiEvents'
      if (sessionToken) {
        url = '/.netlify/functions/getAiEventsAdmin'
        headers['Authorization'] = `Bearer ${sessionToken}`
      } else if (secret) {
        headers['x-ai-log-secret'] = secret
      }
      const resp = await fetch(`${url}${qs}`, { method: 'GET', headers })
      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(txt || `Status ${resp.status}`)
      }
      const data = await resp.json()
      setRemoteEvents(data.events || [])
      setPage(data.page || pageToFetch)
    } catch (err) {
      setRemoteError(String(err?.message || err))
    } finally {
      setLoadingRemote(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">AI Events</h3>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button onClick={() => setView('local')} className={`px-3 py-1 ${view === 'local' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Local</button>
              <button onClick={() => setView('remote')} className={`px-3 py-1 ${view === 'remote' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Remote</button>
            </div>
            {view === 'local' && (
              <>
                <button onClick={() => downloadJson(events, 'ai_events_local.json')} className="px-3 py-1 bg-slate-900 text-white rounded">Export</button>
                <button onClick={handleClear} className="px-3 py-1 bg-rose-500 text-white rounded">Clear</button>
              </>
            )}
            {view === 'remote' && (
              <>
                <button onClick={async () => {
                  if (!isAdmin) return alert('Admin only')
                  // Prefer session-based admin endpoint if available
                  if (session && session.access_token) {
                    await fetchRemote(1, null, session.access_token)
                    return
                  }
                  const secret = window.prompt('Enter ingestion secret (leave empty if none):')
                  await fetchRemote(1, secret)
                }} className="px-3 py-1 bg-slate-900 text-white rounded">Fetch Remote</button>
                <button onClick={() => downloadJson(remoteEvents, 'ai_events_remote.json')} className="px-3 py-1 bg-slate-900 text-white rounded">Export Remote</button>
              </>
            )}
            <button onClick={onClose} className="px-3 py-1 bg-slate-100 rounded">Close</button>
          </div>
        </div>

        <div className="h-[60vh] overflow-auto bg-slate-50 p-3 rounded">
          {view === 'local' && (
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(events, null, 2)}</pre>
          )}

          {view === 'remote' && (
            <div>
              {loadingRemote && <div className="p-4">Loading remote events...</div>}
              {remoteError && <div className="p-4 text-rose-600">Error: {remoteError}</div>}
              {!loadingRemote && !remoteError && <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(remoteEvents, null, 2)}</pre>}
              <div className="flex items-center gap-2 mt-3">
                <button disabled={page <= 1} onClick={async () => {
                  if (session && session.access_token) {
                    await fetchRemote(Math.max(1, page - 1), null, session.access_token)
                    return
                  }
                  const secret = window.prompt('Enter ingestion secret (leave empty if none):')
                  await fetchRemote(Math.max(1, page - 1), secret)
                }} className="px-3 py-1 bg-slate-100 rounded">Prev</button>
                <button onClick={async () => {
                  if (session && session.access_token) {
                    await fetchRemote(page + 1, null, session.access_token)
                    return
                  }
                  const secret = window.prompt('Enter ingestion secret (leave empty if none):')
                  await fetchRemote(page + 1, secret)
                }} className="px-3 py-1 bg-slate-100 rounded">Next</button>
                <div className="text-sm text-slate-500">Page: {page}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
