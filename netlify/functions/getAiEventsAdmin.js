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

  try {
    // Expect Authorization: Bearer <user_access_token>
    const authHeader = event.headers && (event.headers.authorization || event.headers.Authorization)
    if (!authHeader) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Missing Authorization header' }) }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    // Validate token by calling Supabase auth endpoint
    const userResp = await fetch(new URL('/auth/v1/user', SUPABASE_URL).toString(), {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })

    if (!userResp.ok) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Invalid or expired session' }) }
    }

    const user = await userResp.json()
    const userId = user?.id
    if (!userId) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Invalid session user' }) }

    // Check admin flag in profiles
    const profilesUrl = new URL('/rest/v1/profiles', SUPABASE_URL)
    profilesUrl.search = `select=is_admin&id=eq.${encodeURIComponent(userId)}`
    const profResp = await fetch(profilesUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })

    if (!profResp.ok) {
      const txt = await profResp.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, status: profResp.status, error: txt }) }
    }

    const profiles = await profResp.json()
    if (!Array.isArray(profiles) || profiles.length === 0 || !profiles[0].is_admin) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Forbidden: admin only' }) }
    }

    // Authorized — return ai_events with pagination
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

  try {
    // Expect Authorization: Bearer <user_access_token>
    const authHeader = event.headers && (event.headers.authorization || event.headers.Authorization)
    if (!authHeader) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Missing Authorization header' }) }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    // Validate token by calling Supabase auth endpoint
    const userResp = await fetch(new URL('/auth/v1/user', SUPABASE_URL).toString(), {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })

    if (!userResp.ok) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Invalid or expired session' }) }
    }

    const user = await userResp.json()
    const userId = user?.id
    if (!userId) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Invalid session user' }) }

    // Check admin flag in profiles
    const profilesUrl = new URL('/rest/v1/profiles', SUPABASE_URL)
    profilesUrl.search = `select=is_admin&id=eq.${encodeURIComponent(userId)}`
    const profResp = await fetch(profilesUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })

    if (!profResp.ok) {
      const txt = await profResp.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, status: profResp.status, error: txt }) }
    }

    const profiles = await profResp.json()
    if (!Array.isArray(profiles) || profiles.length === 0 || !profiles[0].is_admin) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Forbidden: admin only' }) }
    }

    // Authorized — return ai_events with pagination
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
