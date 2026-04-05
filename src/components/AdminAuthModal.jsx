import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export default function AdminAuthModal({ open, onClose, onSuccess, t }) {
  const tr = (key, fallback) => (t ? t(key) : fallback)
  const [stage, setStage] = useState('login') // 'login' | 'verify' | 'authenticated'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminSecret, setAdminSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminUser, setAdminUser] = useState(null)

  if (!open) return null

  const handleReset = () => {
    setStage('login')
    setEmail('')
    setPassword('')
    setAdminSecret('')
    setAdminUser(null)
    setError('')
  }

  const handleClose = () => {
    handleReset()
    onClose?.()
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (!data?.session?.user?.id) {
        throw new Error('Sign-in failed.')
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.session.user.id)
        .single()

      if (profileError) throw new Error('Could not verify admin status.')
      if (!profile?.is_admin) throw new Error('User is not an admin.')

      setAdminUser({
        id: data.session.user.id,
        email: data.session.user.email,
        session: data.session,
      })
      setStage('verify')
      setError('')
    } catch (err) {
      setError(err.message || 'Sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSecretVerification = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'AdminSecret123'
      if (adminSecret !== ADMIN_SECRET) {
        throw new Error('Invalid admin secret.')
      }

      onSuccess?.(adminUser)
      setStage('authenticated')
    } catch (err) {
      setError(err.message || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {tr('adminAuthRequired', 'Admin Authentication')}
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:bg-slate-400"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:bg-slate-400"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => setStage('login')}
                disabled={loading}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold py-2 rounded-lg transition"
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
              <div className="text-3xl text-green-600 mb-2">✓</div>
              <p className="text-green-700 font-semibold">
                {tr('adminAuthSuccess', 'Authentication Successful')}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-slate-900 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
