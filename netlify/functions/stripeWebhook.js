const Stripe = require('stripe')
const { URL } = require('url')
const { notifyAdmin } = require('./_notifyAdmin')
const fetch = globalThis.fetch

exports.handler = async function (event) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Missing required environment configuration' }) }
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature']
    const stripeEvent = stripe.webhooks.constructEvent(event.body, signature, STRIPE_WEBHOOK_SECRET)

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object
      const userId = session?.metadata?.userId || null
      const userEmail = session?.metadata?.userEmail || session?.customer_details?.email || null
      const amountLkr = (Number(session.amount_total) || 0) / 100

      if (userId) {
        const insertUrl = new URL('/rest/v1/payment_requests', SUPABASE_URL)
        const paymentRecord = {
          user_id: userId,
          user_email: userEmail,
          amount_lkr: amountLkr,
          currency: 'lkr',
          payment_method: 'card',
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent || null,
          status: 'paid_pending_verification',
          metadata: { source: 'stripe_webhook', stripe_event_id: stripeEvent.id },
          admin_notified: true,
        }

        await fetch(`${insertUrl.toString()}?select=*`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify([paymentRecord]),
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
              last_payment_reference: session.id,
              last_payment_method: 'card',
              last_payment_amount: amountLkr,
              updated_at: new Date().toISOString(),
            },
          ]),
        })

        await notifyAdmin({
          type: 'stripe_payment_completed_pending_verification',
          stripeSessionId: session.id,
          userId,
          userEmail,
          amountLkr,
          eventId: stripeEvent.id,
          createdAt: new Date().toISOString(),
        })
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: error.message }) }
  }
}
