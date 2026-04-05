import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export async function getBillingStatus(session) {
  if (!isSupabaseConfigured || !supabase || !session?.user?.id) {
    return {
      ok: true,
      billing: {
        trial_limit: 3,
        trial_uses: 0,
        remaining: 3,
        full_access_enabled: false,
        payment_status: 'trial',
      },
    }
  }

  const userId = session.user.id

  const { data: existing, error: readError } = await supabase
    .from('billing_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) throw readError

  if (!existing) {
    const { data: inserted, error: insertError } = await supabase
      .from('billing_profiles')
      .insert({ user_id: userId })
      .select('*')
      .single()

    if (insertError) throw insertError

    return {
      ok: true,
      billing: {
        ...inserted,
        remaining: Math.max(0, (inserted.trial_limit || 3) - (inserted.trial_uses || 0)),
      },
    }
  }

  return {
    ok: true,
    billing: {
      ...existing,
      remaining: Math.max(0, (existing.trial_limit || 3) - (existing.trial_uses || 0)),
    },
  }
}

export async function consumeTrialUse(session) {
  if (!isSupabaseConfigured || !supabase || !session?.user?.id) {
    return { ok: true, allowed: true, trial_uses: 0, trial_limit: 3, remaining: 3, full_access_enabled: false, payment_status: 'trial' }
  }

  const { data, error } = await supabase.rpc('consume_trial_use', { p_user_id: session.user.id })
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return { ok: true, ...(row || {}) }
}

export async function createStripeCheckoutSession({ session, origin, amountLkr = 30000 }) {
  if (!session?.user?.id) {
    throw new Error('Please sign in first')
  }

  const res = await fetch('/.netlify/functions/createStripeCheckoutSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: session.user.id,
      userEmail: session.user.email || null,
      origin,
      amountLkr,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || 'Unable to start Stripe checkout')
  }

  return body
}

export async function requestCashPayment({ session, amountLkr = 30000 }) {
  if (!session?.user?.id) {
    throw new Error('Please sign in first')
  }

  const res = await fetch('/.netlify/functions/requestCashPayment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: session.user.id,
      userEmail: session.user.email || null,
      amountLkr,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || 'Unable to submit cash payment request')
  }

  return body
}
