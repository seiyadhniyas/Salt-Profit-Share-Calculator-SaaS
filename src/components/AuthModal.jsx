import React, { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

const initialForm = {
  email: '',
  password: '',
  confirmPassword: '',
}

export default function AuthModal({ open, mode, onClose, onModeChange, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setMessage('')
      setForm(initialForm)
    }
  }, [open, mode])

  if (!open) return null

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to your env file.')
      return
    }

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signin') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (signInError) throw signInError
        if (data?.session?.user) {
          onSuccess?.(data.session.user)
        }
        onClose?.()
      } else {
        // Signup flow with email confirmation
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
            data: {},
          },
        })
        
        if (signUpError) throw signUpError

        // After successful signup
        if (data?.user?.id) {
          // Check if session was created (no email confirmation needed)
          if (data?.session?.user) {
            onSuccess?.(data.session.user)
            onClose?.()
          } else {
            // Email confirmation is required
            setMessage(
              'Account created successfully! \n\n' +
              'A confirmation email has been sent to ' + form.email + '\n\n' +
              'Please click the link in the email to verify your account, then sign in with your credentials.'
            )
            // Clear form for next attempt
            setForm(initialForm)
          }
        }
      }
    } catch (authError) {
      console.error('Auth error:', authError)
      setError(authError?.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Member Access</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Close
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => onModeChange?.('signin')}
              className={`rounded-xl px-3 py-2 transition ${mode === 'signin' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onModeChange?.('signup')}
              className={`rounded-xl px-3 py-2 transition ${mode === 'signup' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
            >
              Register
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="At least 6 characters"
            />
          </label>

          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Repeat password"
              />
            </label>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase is not configured locally yet. Create a <span className="font-semibold">.env.local</span> from the example file.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in to dashboard' : 'Create account'}
          </button>

          <p className="text-xs leading-5 text-slate-500">
            This dashboard is designed for lifetime members of the Saltern Welfare Society. Calculator logic stays unchanged after sign in.
          </p>
        </form>
      </div>
    </div>
  )
}
