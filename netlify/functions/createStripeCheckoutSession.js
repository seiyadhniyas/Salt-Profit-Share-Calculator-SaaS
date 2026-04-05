const Stripe = require('stripe')
const { URL } = require('url')

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
    const amountLkr = Number(body.amountLkr) || 30000
    const origin = body.origin || 'http://localhost:5173'

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'userId is required' }) }
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY)

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
      },
      line_items: [
        {
          price_data: {
            currency: 'lkr',
            product_data: {
              name: 'Salt Profit Share Calculator - Full Access',
              description: 'One-off lifetime activation',
            },
            unit_amount: Math.round(amountLkr * 100),
          },
          quantity: 1,
        },
      ],
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, checkoutUrl: session.url, sessionId: session.id }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    }
  }
}
