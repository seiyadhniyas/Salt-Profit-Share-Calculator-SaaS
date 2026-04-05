import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export default function AdminAuthPage({ onAuthSuccess, t }) {
  const tr = (key, fallback) => (t ? t(key) : fallback)
  const [stage, setStage] = useState('login') // 'login' | 'verify' | 'authenticated'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminSecret, setAdminSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminUser, setAdminUser] = useState(null)

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Attempt admin sign-in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (!data?.session?.user?.id) {
        throw new Error('Sign-in failed. No session created.')
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.session.user.id)
        .single()

      if (profileError) {
        throw new Error('Could not verify admin status.')
      }

      if (!profile?.is_admin) {
        throw new Error('User is not an admin. Access denied.')
      }

      // Admin verified - proceed to secret verification
      setAdminUser({
        id: data.session.user.id,
        email: data.session.user.email,
        session: data.session,
      })
      setStage('verify')
      setError('')
    } catch (err) {
      setError(err.message || 'Admin sign-in failed.')
      console.error('Admin sign-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSecretVerification = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Verify admin secret (hardcoded or from env for now)
      const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'AdminSecret123'

      if (adminSecret !== ADMIN_SECRET) {
        throw new Error('Invalid admin secret.')
      }

      // Success
      onAuthSuccess?.(adminUser)
      setStage('authenticated')
    } catch (err) {
      setError(err.message || 'Secret verification failed.')
      console.error('Secret verification error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogOut = () => {
    setStage('login')
    setEmail('')
    setPassword('')
    setAdminSecret('')
    setAdminUser(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {tr('adminDashboard', 'Admin Dashboard')}
          </h1>
          <p className="text-slate-600 mt-2">
            {tr('adminAuthRequired', 'Authentication Required')}
          </p>
        </div>

        {/* Stage 1: Sign In */}
        {stage === 'login' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Stage 2: Verify Admin Secret */}
        {stage === 'verify' && (
          <form onSubmit={handleSecretVerification} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Signed in as: <strong>{adminUser?.email}</strong>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Admin Secret Key
              </label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Enter admin secret"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={handleLogOut}
                disabled={loading}
                className="flex-1 bg-slate-300 hover:bg-slate-400 disabled:bg-slate-200 text-slate-900 font-semibold py-2 rounded-lg transition"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {/* Stage 3: Authenticated */}
        {stage === 'authenticated' && (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl text-green-600 mb-2">✓</div>
              <p className="text-green-700 font-semibold">
                {tr('adminAuthSuccess', 'Admin Authentication Successful')}
              </p>
              <p className="text-green-600 text-sm mt-1">{adminUser?.email}</p>
            </div>
            <p className="text-slate-600 text-sm">
              {tr('redirectingToDashboard', 'Redirecting to dashboard...')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
