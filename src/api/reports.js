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

export async function savePdfFileToSupabase({ blob, session, payload, reportId = null, fileName = null }) {
  if (!isSupabaseConfigured || !supabase || !session?.user?.id) {
    throw new Error('Supabase storage is not configured or the user is not signed in')
  }

  const bucket = 'saved-files'
  const safeFileName = fileName || `salt-profit-share-${Date.now()}.pdf`
  const storagePath = `users/${session.user.id}/${safeFileName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)

  const record = {
    user_id: session.user.id,
    user_email: session.user.email || null,
    report_id: reportId,
    bucket,
    file_name: safeFileName,
    file_path: storagePath,
    mime_type: 'application/pdf',
    file_size: blob.size || null,
    storage_url: publicUrlData?.publicUrl || null,
    payload: payload || null,
  }

  const { data, error } = await supabase
    .from('saved_files')
    .insert(record)
    .select('*')

  if (error) {
    throw error
  }

  return { ok: true, inserted: data, storagePath, storageUrl: publicUrlData?.publicUrl || null }
}

export async function getSavedFilesFromSupabase(session) {
  if (isSupabaseConfigured && supabase && session?.user?.id) {
    const { data, error } = await supabase
      .from('saved_files')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return { ok: true, files: data || [] }
  }

  if (isSupabaseConfigured) {
    return { ok: true, files: [] }
  }

  return { ok: true, files: [] }
}
