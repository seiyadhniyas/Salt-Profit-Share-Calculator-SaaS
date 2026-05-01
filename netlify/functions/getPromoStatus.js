const fetch = globalThis.fetch

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  const BASE_PRICE = 30000
  const DISCOUNT_PERCENT = 30

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      // If Supabase not configured, return safe defaults (no promo info)
      return { statusCode: 200, body: JSON.stringify({ ok: true, count: 0, remaining: 100, basePrice: BASE_PRICE, discountPercent: DISCOUNT_PERCENT, discountedPrice: Math.round(BASE_PRICE * (1 - DISCOUNT_PERCENT / 100)) }) }
    }

    const url = new URL('/rest/v1/billing_profiles', SUPABASE_URL)
    const params = new URLSearchParams()
    params.set('select', 'id')
    // Count profiles with full access enabled OR payment pending verification
    params.set('or', 'full_access_enabled.eq.true,payment_status.eq.payment_pending_verification')
    params.set('limit', '101')

    const res = await fetch(`${url.toString()}?${params.toString()}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, count: 0, remaining: 100, basePrice: BASE_PRICE, discountPercent: DISCOUNT_PERCENT, discountedPrice: Math.round(BASE_PRICE * (1 - DISCOUNT_PERCENT / 100)) }) }
    }

    const body = await res.json().catch(() => [])
    const count = Array.isArray(body) ? body.length : 0
    const remaining = Math.max(0, 100 - count)

    return { statusCode: 200, body: JSON.stringify({ ok: true, count, remaining, basePrice: BASE_PRICE, discountPercent: DISCOUNT_PERCENT, discountedPrice: Math.round(BASE_PRICE * (1 - DISCOUNT_PERCENT / 100)) }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
  }
}
