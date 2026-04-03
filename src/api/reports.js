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

export async function saveReportToSupabase(payload) {
  const res = await fetch('/.netlify/functions/saveReportSupabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('saveReportToSupabase failed:', res.status, text)
    throw new Error(`Supabase save failed: ${res.status}`)
  }
  return res.json()
}

export async function getReportsFromSupabase() {
  const res = await fetch('/.netlify/functions/getReportsSupabase')
  if (!res.ok) {
    const text = await res.text()
    console.error('getReportsFromSupabase failed:', res.status, text)
    throw new Error(`Supabase get failed: ${res.status}`)
  }
  return res.json()
}
