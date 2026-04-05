const fetch = globalThis.fetch

async function notifyAdmin(payload) {
  const webhookUrl = process.env.ADMIN_NOTIFICATION_WEBHOOK_URL
  if (!webhookUrl) return { ok: true, skipped: true }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Admin webhook failed: ${res.status} ${text}` }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

module.exports = { notifyAdmin }
