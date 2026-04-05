const { URL } = require('url')
const fetch = globalThis.fetch

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  const ADMIN_VERIFICATION_KEY = process.env.ADMIN_VERIFICATION_KEY
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  if (!ADMIN_VERIFICATION_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Server configuration incomplete' }) }
  }

  const providedKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
  if (!providedKey || providedKey !== ADMIN_VERIFICATION_KEY) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const paymentRequestId = body.paymentRequestId
    const userId = body.userId

    if (!paymentRequestId || !userId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'paymentRequestId and userId are required' }) }
    }

    const updatePaymentUrl = new URL('/rest/v1/payment_requests', SUPABASE_URL)
    const paymentRes = await fetch(`${updatePaymentUrl.toString()}?id=eq.${encodeURIComponent(paymentRequestId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        status: 'verified_active',
        updated_at: new Date().toISOString(),
      }),
    })

    if (!paymentRes.ok) {
      const text = await paymentRes.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: text }) }
    }

    const updateBillingUrl = new URL('/rest/v1/billing_profiles', SUPABASE_URL)
    const billingRes = await fetch(`${updateBillingUrl.toString()}?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify([
        {
          user_id: userId,
          full_access_enabled: true,
          payment_status: 'active',
          updated_at: new Date().toISOString(),
        },
      ]),
    })

    if (!billingRes.ok) {
      const text = await billingRes.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: text }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
  }
}
