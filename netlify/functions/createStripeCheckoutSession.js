const Stripe = require('stripe')
const { URL } = require('url')
const fetch = globalThis.fetch

const BASE_PRICE = 30000
const DISCOUNT_PERCENT = 30

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  if (!STRIPE_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Stripe is not configured' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const userId = body.userId
    const userEmail = body.userEmail || null
    const requestedAmountLkr = Number(body.amountLkr) || BASE_PRICE
    const origin = body.origin || 'http://localhost:5173'

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'userId is required' }) }
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY)

    // Compute promo eligibility (server-side) by checking billing_profiles
    let promoApplied = false
    let promoRemaining = 0
    let amountToCharge = requestedAmountLkr

    try {
      const SUPABASE_URL = process.env.SUPABASE_URL
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const url = new URL('/rest/v1/billing_profiles', SUPABASE_URL)
        const params = new URLSearchParams()
        params.set('select', 'id')
        params.set('or', 'full_access_enabled.eq.true,payment_status.eq.payment_pending_verification')
        params.set('limit', '101')

        const r = await fetch(`${url.toString()}?${params.toString()}`, {
          method: 'GET',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })
        if (r.ok) {
          const arr = await r.json().catch(() => [])
          const count = Array.isArray(arr) ? arr.length : 0
          promoRemaining = Math.max(0, 100 - count)
          if (promoRemaining > 0) {
            promoApplied = true
            amountToCharge = Math.round(requestedAmountLkr * (1 - DISCOUNT_PERCENT / 100))
          }
        }
      }
    } catch (err) {
      // server-side promo check failed — fall back to full price
      promoApplied = false
      promoRemaining = 0
      amountToCharge = requestedAmountLkr
    }

    const successUrl = new URL(origin)
    successUrl.searchParams.set('payment', 'success')
    successUrl.searchParams.set('activation', 'pending')

    const cancelUrl = new URL(origin)
    cancelUrl.searchParams.set('payment', 'cancelled')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: userEmail || undefined,
      payment_method_types: ['card'],
      metadata: {
        userId,
        userEmail: userEmail || '',
        promoApplied: promoApplied ? 'true' : 'false',
        promoRemaining: String(promoRemaining || 0),
      },
      line_items: [
        {
          price_data: {
            currency: 'lkr',
            product_data: {
              name: promoApplied ? `Salt Profit Share Calculator - Full Access (Promo ${DISCOUNT_PERCENT}% off)` : 'Salt Profit Share Calculator - Full Access',
              description: 'One-off lifetime activation',
            },
            unit_amount: Math.round(amountToCharge * 100),
          },
          quantity: 1,
        },
      ],
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, checkoutUrl: session.url, sessionId: session.id, amountCharged: amountToCharge, promoApplied, promoRemaining }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    }
  }
}
