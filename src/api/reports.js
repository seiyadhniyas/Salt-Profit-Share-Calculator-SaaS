export async function saveReport(payload) {
  const res = await fetch('/.netlify/functions/saveReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function getReports() {
  const res = await fetch('/.netlify/functions/getReports')
  return res.json()
}

export async function saveReportToSupabase(payload) {
  const res = await fetch('/.netlify/functions/saveReportSupabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function getReportsFromSupabase() {
  const res = await fetch('/.netlify/functions/getReportsSupabase')
  return res.json()
}
