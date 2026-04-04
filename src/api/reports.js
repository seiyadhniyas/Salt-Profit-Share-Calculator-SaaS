import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export async function saveReport(payload) {
  const res = await fetch('/.netlify/functions/saveReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('saveReport failed:', res.status, text)
    throw new Error(`Save failed: ${res.status}`)
  }
  return res.json()
}

export async function getReports() {
  const res = await fetch('/.netlify/functions/getReports')
  if (!res.ok) {
    const text = await res.text()
    console.error('getReports failed:', res.status, text)
    throw new Error(`Get failed: ${res.status}`)
  }
  return res.json()
}

export async function saveReportToSupabase(payload, session) {
  if (isSupabaseConfigured && supabase && session?.user?.id) {
    const record = {
      user_id: session.user.id,
      user_email: session.user.email || null,
      payload,
    }

    const { data, error } = await supabase
      .from('reports')
      .insert(record)
      .select('*')

    if (error) {
      throw error
    }

    return { ok: true, inserted: data }
  }

  const res = await fetch('/.netlify/functions/saveReportSupabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('saveReportToSupabase failed:', res.status, text)
    throw new Error(`Supabase save failed: ${res.status}`)
  }
  return res.json()
}

export async function getReportsFromSupabase(session) {
  if (isSupabaseConfigured && supabase && session?.user?.id) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return { ok: true, reports: data || [] }
  }

  if (isSupabaseConfigured) {
    return { ok: true, reports: [] }
  }

  const res = await fetch('/.netlify/functions/getReportsSupabase')
  if (!res.ok) {
    const text = await res.text()
    console.error('getReportsFromSupabase failed:', res.status, text)
    throw new Error(`Supabase get failed: ${res.status}`)
  }
  return res.json()
}
