const { URL } = require('url')
const fetch = globalThis.fetch
const { requireAdmin } = require('./_requireAdmin')

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  try {
    const auth = await requireAdmin(event)
    if (!auth.ok) {
      return { statusCode: auth.statusCode, body: JSON.stringify({ ok: false, error: auth.error }) }
    }

    const listUrl = new URL('/rest/v1/payment_requests', auth.supabaseUrl)
    listUrl.search = '?select=*&status=in.(pending,paid_pending_verification)&order=created_at.desc&limit=100'

    const res = await fetch(listUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.serviceKey}`,
        apikey: auth.serviceKey,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: text }) }
    }

    const rows = await res.json()
    return { statusCode: 200, body: JSON.stringify({ ok: true, requests: rows || [] }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
  }
}
