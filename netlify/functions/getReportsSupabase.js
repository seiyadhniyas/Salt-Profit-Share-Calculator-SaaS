const { URL } = require('url')
const fetch = global.fetch || require('node-fetch')

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Supabase not configured' }) }
  }

  try {
    const selectUrl = new URL('/rest/v1/reports', SUPABASE_URL)
    const res = await fetch(selectUrl.toString() + '?select=*', {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, status: res.status, error: text }) }
    }
    const rows = await res.json()
    return { statusCode: 200, body: JSON.stringify({ ok: true, reports: rows }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
