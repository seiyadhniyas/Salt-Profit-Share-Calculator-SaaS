const { URL } = require('url')
const fetch = globalThis.fetch
const { requireAdmin } = require('./_requireAdmin')

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  try {
    const auth = await requireAdmin(event)
    if (!auth.ok) {
      return { statusCode: auth.statusCode, body: JSON.stringify({ ok: false, error: auth.error }) }
    }

    const body = JSON.parse(event.body || '{}')
    const paymentRequestId = body.paymentRequestId

    if (!paymentRequestId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'paymentRequestId is required' }) }
    }

    const getUrl = new URL('/rest/v1/payment_requests', auth.supabaseUrl)
    getUrl.search = `?select=*&id=eq.${encodeURIComponent(paymentRequestId)}&limit=1`
    const getRes = await fetch(getUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.serviceKey}`,
        apikey: auth.serviceKey,
      },
    })

    if (!getRes.ok) {
      const text = await getRes.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: text }) }
    }

    const rows = await getRes.json()
    const requestRow = Array.isArray(rows) ? rows[0] : null

    if (!requestRow) {
      return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'Payment request not found' }) }
    }

    if (!['pending', 'paid_pending_verification'].includes(requestRow.status)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Payment request is not pending verification' }) }
    }

    const updatePaymentUrl = new URL('/rest/v1/payment_requests', auth.supabaseUrl)
    const paymentRes = await fetch(`${updatePaymentUrl.toString()}?id=eq.${encodeURIComponent(paymentRequestId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.serviceKey}`,
        apikey: auth.serviceKey,
      },
      body: JSON.stringify({
        status: 'verified_active',
        verified_by_admin: auth.user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    })

    if (!paymentRes.ok) {
      const text = await paymentRes.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: text }) }
    }

    const userId = requestRow.user_id
    const amountLkr = Number(requestRow.amount_lkr) || 30000

    const billingUpdateUrl = new URL('/rest/v1/billing_profiles', auth.supabaseUrl)
    const billingRes = await fetch(`${billingUpdateUrl.toString()}?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
        Authorization: `Bearer ${auth.serviceKey}`,
        apikey: auth.serviceKey,
      },
      body: JSON.stringify([
        {
          user_id: userId,
          full_access_enabled: true,
          payment_status: 'active',
          last_payment_reference: requestRow.stripe_session_id || requestRow.id?.toString() || null,
          last_payment_method: requestRow.payment_method || 'card',
          last_payment_amount: amountLkr,
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
