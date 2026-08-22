const { URL } = require('url')
const fetch = globalThis.fetch

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  // The expected admin secret key from environment variables
  // Check for ADMIN_SECRET_KEY first (preferred), then VITE_ADMIN_SECRET (fallback)
  const EXPECTED_ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || process.env.VITE_ADMIN_SECRET || 'SALT_ADMIN_2024_PROTECT'

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase config:', { 
      hasUrl: !!SUPABASE_URL, 
      hasKey: !!SUPABASE_SERVICE_ROLE_KEY 
    })
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Server configuration incomplete: missing Supabase credentials' }) }
  }

  try {
    const { email, password, adminSecret } = JSON.parse(event.body || '{}')

    if (!email || !password || !adminSecret) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Email, password, and adminSecret are required' }) }
    }

    // 1. Check Admin Secret Key
    if (adminSecret !== EXPECTED_ADMIN_SECRET) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Invalid admin secret key' }) }
    }

    // 2. Check current admin count
    const profileUrl = new URL('/rest/v1/profiles', SUPABASE_URL)
    profileUrl.search = '?select=id&is_admin=eq.true'
    
    const countRes = await fetch(profileUrl.toString(), {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    })

    if (!countRes.ok) {
      const text = await countRes.text()
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: `Failed to check admin count: ${text}` }) }
    }

    const admins = await countRes.json()
    if (admins.length >= 3) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Maximum number of admin accounts (3) reached' }) }
    }

    // 3. Create User in Supabase Auth
    const signUpUrl = new URL('/auth/v1/signup', SUPABASE_URL)
    const signUpRes = await fetch(signUpUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email, password })
    })

    const signUpData = await signUpRes.json()
    if (!signUpRes.ok) {
      console.error('Signup failed:', { status: signUpRes.status, error: signUpData })
      return { statusCode: signUpRes.status, body: JSON.stringify({ ok: false, error: signUpData.msg || signUpData.error || 'Auth signup failed' }) }
    }

    const userId = signUpData.user?.id || signUpData.id
    if (!userId) {
      console.error('No userId in signup response:', signUpData)
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Signup response missing user ID' }) }
    }

    // 4. Update Profile to be Admin
    // Wait a moment for trigger to create profile if it's not immediate
    // Or just upsert it
    const updateProfileUrl = new URL('/rest/v1/profiles', SUPABASE_URL)
    const profileUpdateRes = await fetch(`${updateProfileUrl.toString()}?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        is_admin: true,
        updated_at: new Date().toISOString(),
      }),
    })

    if (!profileUpdateRes.ok) {
        console.warn('Profile PATCH failed, attempting upsert:', { status: profileUpdateRes.status })
        // If PATCH fails (maybe profile not created yet), try POST (upsert)
        const upsertRes = await fetch(updateProfileUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                id: userId,
                is_admin: true,
                updated_at: new Date().toISOString(),
            }),
        })
        if (!upsertRes.ok) {
            const text = await upsertRes.text()
            console.error('Profile upsert failed:', { status: upsertRes.status, error: text })
            return { statusCode: 502, body: JSON.stringify({ ok: false, error: `Failed to set admin flag: ${text}` }) }
        }
        console.log('Profile created via upsert for userId:', userId)
    } else {
        console.log('Profile updated to admin for userId:', userId)
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'Admin account created successfully', userId }) }

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
  }
}