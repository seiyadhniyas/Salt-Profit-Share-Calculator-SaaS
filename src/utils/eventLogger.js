const STORAGE_KEY = 'salt_profit_ai_events_v1'
const MAX_EVENTS = 500

function maskSensitive(key, value) {
  const sensitive = ['buyerName', 'billNumber', 'fullName', 'email', 'phone', 'message']
  if (sensitive.includes(key)) return '<<redacted>>'
  return value
}

export function sanitizeInputs(obj = {}) {
  try {
    if (!obj || typeof obj !== 'object') return {}
    const out = {}
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (typeof v === 'number' || typeof v === 'boolean') {
        out[k] = v
      } else if (typeof v === 'string') {
        out[k] = (k && ['buyerName', 'billNumber', 'fullName', 'email', 'phone', 'message'].includes(k)) ? '<<redacted>>' : (v.length > 100 ? v.slice(0, 100) : v)
      } else if (Array.isArray(v)) {
        out[k] = v.map(item => (typeof item === 'object' ? null : item))
      } else if (v && typeof v === 'object') {
        out[k] = {}
        for (const kk of Object.keys(v)) {
          const vv = v[kk]
          if (typeof vv === 'number' || typeof vv === 'boolean') out[k][kk] = vv
          else if (typeof vv === 'string') out[k][kk] = (['buyerName', 'billNumber', 'fullName', 'email', 'phone', 'message'].includes(kk) ? '<<redacted>>' : (vv.length > 100 ? vv.slice(0, 100) : vv))
        }
      }
    }
    return out
  } catch (e) {
    return {}
  }
}

export async function logEvent(event = {}) {
  try {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const ev = { id, ts: new Date().toISOString(), ...event }

    // persist locally
    let arr = []
    try { arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch (e) { arr = [] }
    arr.push(ev)
    if (arr.length > MAX_EVENTS) arr = arr.slice(arr.length - MAX_EVENTS)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch (e) {}

    // optional remote delivery (if Vite env provided). Fallback to Netlify function path.
    try {
      const endpoint = import.meta.env.VITE_AI_LOG_ENDPOINT || '/.netlify/functions/logEvent'
      if (endpoint) {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) }).catch(() => {})
      }
    } catch (e) {}
  } catch (e) {}
}

export function getEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch (e) { return [] }
}

export function clearEvents() {
  try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
}

export default { logEvent, sanitizeInputs, getEvents, clearEvents }
