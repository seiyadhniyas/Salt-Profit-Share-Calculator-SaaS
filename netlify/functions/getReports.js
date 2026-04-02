const fs = require('fs')
const path = require('path')

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const reportsPath = path.join('/tmp', 'reports.json')
    let reports = []
    try {
      if (fs.existsSync(reportsPath)) {
        reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'))
      }
    } catch (e) {
      // ignore
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, reports }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
