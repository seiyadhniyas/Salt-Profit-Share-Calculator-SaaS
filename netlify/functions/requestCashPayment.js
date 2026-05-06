const { URL } = require('url')
const fetch = globalThis.fetch
const { notifyAdmin } = require('./_notifyAdmin')

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Supabase is not configured' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const userId = body.userId
    const userEmail = body.userEmail || null
    const amountLkr = Number(body.amountLkr) || 30000
    const buyerNote = body.buyerNote || ''

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'userId is required' }) }
    }

    const insertUrl = new URL('/rest/v1/payment_requests', SUPABASE_URL)
    const requestRecord = {
      user_id: userId,
      user_email: userEmail,
      amount_lkr: amountLkr,
      currency: 'lkr',
      payment_method: 'cash',
      status: 'pending',
      metadata: { source: 'cash_request', buyerNote },
      admin_notified: false,
    }

    const insertResponse = await fetch(`${insertUrl.toString()}?select=*`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify([requestRecord]),
    })

    if (!insertResponse.ok) {
      const text = await insertResponse.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: text }) }
    }

    const inserted = await insertResponse.json()
    const paymentRequest = inserted?.[0]

    await notifyAdmin({
      type: 'cash_payment_requested',
      paymentRequest,
      userId,
      userEmail,
      amountLkr,
      createdAt: new Date().toISOString(),
    })

    const billingUpdateUrl = new URL('/rest/v1/billing_profiles', SUPABASE_URL)
    await fetch(`${billingUpdateUrl.toString()}?on_conflict=user_id`, {
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
          payment_status: 'payment_pending_verification',
          last_payment_method: 'cash',
          last_payment_amount: amountLkr,
          updated_at: new Date().toISOString(),
        },
      ]),
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, paymentRequest }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    }
  }
}
