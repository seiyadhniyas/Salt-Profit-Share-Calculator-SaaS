const fs = require('fs')
const path = require('path')

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const reportsPath = path.join('/tmp', 'reports.json')
    let reports = []
    try {
      if (fs.existsSync(reportsPath)) {
        reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'))
      }
    } catch (e) {
      // ignore read errors and start fresh
    }

    const id = Date.now().toString()
    const record = { id, timestamp: new Date().toISOString(), payload: body }
    reports.push(record)

    try {
      fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2), 'utf8')
    } catch (e) {
      // write may fail on some Netlify runtimes; ignore for demo
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
