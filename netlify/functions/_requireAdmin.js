const { URL } = require('url')
const fetch = globalThis.fetch

async function requireAdmin(event) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    return { ok: false, statusCode: 500, error: 'Supabase environment is not configured' }
  }

  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, statusCode: 401, error: 'Missing Bearer token' }
  }

  const jwt = authHeader.slice(7)

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: SUPABASE_ANON_KEY,
    },
  })

  if (!userRes.ok) {
    const text = await userRes.text()
    return { ok: false, statusCode: 401, error: `Invalid session: ${text}` }
  }

  const user = await userRes.json()
  const profileUrl = new URL('/rest/v1/profiles', SUPABASE_URL)
  profileUrl.search = `?select=id,is_admin&id=eq.${encodeURIComponent(user.id)}&limit=1`

  const profileRes = await fetch(profileUrl.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  })

  if (!profileRes.ok) {
    const text = await profileRes.text()
    return { ok: false, statusCode: 500, error: `Admin check failed: ${text}` }
  }

  const profiles = await profileRes.json()
  const profile = Array.isArray(profiles) ? profiles[0] : null

  if (!profile?.is_admin) {
    return { ok: false, statusCode: 403, error: 'Admin access required' }
  }

  return { ok: true, user, serviceKey: SUPABASE_SERVICE_ROLE_KEY, supabaseUrl: SUPABASE_URL }
}

module.exports = { requireAdmin }
