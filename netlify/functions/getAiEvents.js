const { URL } = require('url')
const fetch = globalThis.fetch

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Supabase not configured' }) }
  }

  // Optional shared-secret protection
  const SECRET_HEADER = 'x-ai-log-secret'
  const LOG_SECRET = process.env.AI_LOG_SECRET || process.env.LOG_EVENT_SECRET
  if (LOG_SECRET) {
    const provided = event.headers && (event.headers[SECRET_HEADER] || event.headers[SECRET_HEADER.toLowerCase()])
    if (!provided || provided !== LOG_SECRET) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) }
    }
  }

  try {
    const qs = event.queryStringParameters || {}
    const page = Math.max(1, Number(qs.page) || 1)
    const per_page = Math.min(200, Math.max(1, Number(qs.per_page) || 100))
    const moduleFilter = qs.module || null

    const offset = (page - 1) * per_page

    const u = new URL('/rest/v1/ai_events', SUPABASE_URL)
    u.searchParams.set('select', '*')
    u.searchParams.set('order', 'created_at.desc')
    u.searchParams.set('limit', String(per_page))
    u.searchParams.set('offset', String(offset))
    if (moduleFilter) {
      // Basic filter by module (exact match)
      u.searchParams.set('module', `eq.${moduleFilter}`)
    }

    const res = await fetch(u.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })

    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, status: res.status, error: text }) }
    }

    const events = await res.json()
    return { statusCode: 200, body: JSON.stringify({ ok: true, events, page, per_page }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
