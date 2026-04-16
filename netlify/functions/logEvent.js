const { URL } = require('url')
const fetch = globalThis.fetch

const SENSITIVE_KEYS = ['buyerName', 'billNumber', 'fullName', 'email', 'phone', 'message']

function redact(obj) {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(redact)
  if (typeof obj === 'object') {
    const out = {}
    for (const k of Object.keys(obj)) {
      try {
        if (SENSITIVE_KEYS.includes(k)) {
          out[k] = '<<redacted>>'
        } else {
          out[k] = redact(obj[k])
        }
      } catch (e) {
        out[k] = null
      }
    }
    return out
  }
  return obj
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Supabase not configured' }) }
  }

  // Optional shared-secret protection for ingestion
  const SECRET_HEADER = 'x-ai-log-secret'
  const LOG_SECRET = process.env.AI_LOG_SECRET || process.env.LOG_EVENT_SECRET
  if (LOG_SECRET) {
    const provided = event.headers && (event.headers[SECRET_HEADER] || event.headers[SECRET_HEADER.toLowerCase()])
    if (!provided || provided !== LOG_SECRET) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) }
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const ev = (body && typeof body === 'object' && Object.keys(body).length > 0) ? body : null
    if (!ev) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Empty event payload' }) }

    const payload = redact(ev)

    const record = {
      user_id: ev.sessionUserId || ev.userId || ev.user_id || null,
      event_type: ev.type || ev.eventType || null,
      module: ev.module || null,
      action: ev.action || null,
      lang: ev.lang || null,
      payload: payload,
      created_at: new Date().toISOString()
    }

    const insertUrl = new URL('/rest/v1/ai_events', SUPABASE_URL)
    const res = await fetch(insertUrl.toString() + '?select=*&return=representation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify([record])
    })

    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, status: res.status, error: text }) }
    }

    const inserted = await res.json()
    return { statusCode: 200, body: JSON.stringify({ ok: true, inserted }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
