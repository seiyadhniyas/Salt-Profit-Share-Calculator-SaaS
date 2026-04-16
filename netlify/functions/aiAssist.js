const fetch = globalThis.fetch
const { URL } = require('url')

// Optional secret header to protect endpoint
const SECRET_HEADER = 'x-ai-secret'

function safeString(s) {
  if (!s || typeof s !== 'string') return ''
  return s.replace(/\s+/g, ' ').trim()
}

function simpleSuggestions(issues = [], lang = 'en') {
  // Minimal mapping for quick deterministic assistance
  const map = {
    missing_location: {
      en: 'Select a Location from the top-left picker or add a new location in the Dashboard.',
    },
    missing_date: { en: 'Choose the report Date. It is required.' },
    missing_packedBags: { en: 'Enter total packed bags (must be greater than 0).' },
    missing_pricePerBag: { en: 'Enter the price per bag (LKR) to compute totals.' },
    missing_reserved_stock: { en: "Add reserved stock details in 'Stock Reserved' card before selecting reserved stock." },
    missing_mixed_amounts: { en: 'Provide both Fresh and Reserved amounts when using Mixed stock.' },
    mixed_sum_mismatch: { en: 'Ensure Fresh + Reserved equals Packed Bags for accurate breakdown.' },
    reserved_exceeds_available: { en: 'Reserved amount exceeds available reserved stock. Adjust reserved amount or stock records.' },
    missing_other_expense_reason: { en: 'Add a reason for Other Expenses so records are auditable.' },
    recommended_costs: { en: 'Add packing fee, bag cost, or other expenses to improve accuracy.' },
    recommended_labour: { en: 'Consider adding labour entries if labour costs apply.' },
    missing_loss_quantity: { en: 'Provide loss quantity for disaster recovery entries.' }
  }

  return issues.map(issue => {
    const r = map[issue.messageKey] || { en: issue.fallback || 'Address the reported issue.' }
    return { issue: issue.messageKey || null, suggestion: (r[lang] || r.en) }
  })
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  // Optional secret enforcement
  const secret = process.env.AI_ASSIST_SECRET
  if (secret) {
    const provided = event.headers && (event.headers[SECRET_HEADER] || event.headers[SECRET_HEADER.toLowerCase()])
    if (!provided || provided !== secret) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) }
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { module, issues = [], inputs = {}, lang = 'en', requestId = null } = body

    // If an OpenAI key is available and user requested LLM, proxy the request
    const OPENAI_KEY = process.env.OPENAI_API_KEY
    const useLLM = process.env.AI_ASSIST_USE_LLM === '1' && OPENAI_KEY

    if (useLLM && OPENAI_KEY) {
      // Build a safe prompt summarizing issues and sanitized inputs
      const promptParts = []
      promptParts.push(`You are an assistant for a Salt Profit Share Calculator web app.`)
      promptParts.push(`Module: ${module || 'unknown'}`)
      if (Array.isArray(issues) && issues.length) {
        promptParts.push('Detected issues:')
        issues.forEach((it, i) => {
          promptParts.push(`${i + 1}. ${it.messageKey || it.message || JSON.stringify(it)}`)
        })
      }
      promptParts.push('Relevant (sanitized) inputs:')
      const safeInputs = Object.keys(inputs || {}).slice(0, 30).map(k => `${k}: ${String(inputs[k]).slice(0, 120)}`)
      promptParts.push(safeInputs.join('\n'))
      promptParts.push('Provide concise, actionable suggestions (1-3 bullets).')

      const prompt = promptParts.join('\n')

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: process.env.AI_ASSIST_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.2
        })
      })

      if (!resp.ok) {
        const txt = await resp.text()
        return { statusCode: 502, body: JSON.stringify({ ok: false, error: 'LLM request failed', detail: txt }) }
      }

      const data = await resp.json()
      const assistant = data?.choices?.[0]?.message?.content || ''
      return { statusCode: 200, body: JSON.stringify({ ok: true, source: 'llm', assistant, requestId }) }
    }

    // Fallback: deterministic rule-based suggestions
    const suggestions = simpleSuggestions(issues || [], lang)
    return { statusCode: 200, body: JSON.stringify({ ok: true, source: 'rules', suggestions, requestId }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
