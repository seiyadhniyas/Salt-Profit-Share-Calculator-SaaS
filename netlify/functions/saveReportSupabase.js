const { URL } = require('url')
const fetch = global.fetch || require('node-fetch')

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Supabase not configured' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    // expect payload: { inputs, results }
    const record = {
      payload: body,
      created_at: new Date().toISOString()
    }

    // Supabase REST insert expects an array of objects
    const insertUrl = new URL('/rest/v1/reports', SUPABASE_URL)
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
