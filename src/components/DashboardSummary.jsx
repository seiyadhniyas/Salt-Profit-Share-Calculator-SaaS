import React from 'react'

function StatCard({ title, value, note, accent = 'slate' }) {
  const accentMap = {
    slate: 'from-slate-900 to-slate-700',
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-emerald-600 to-teal-500',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-full bg-gradient-to-r ${accentMap[accent]} px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white`}>
        {title}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      {note && <div className="mt-1 text-sm text-slate-500">{note}</div>}
    </div>
  )
}

export default function DashboardSummary({ session, reports, isSupabaseConfigured, onOpenAuth, onSignOut }) {
  const signedIn = Boolean(session?.user)
  const displayName = session?.user?.email || 'Guest member'
  const reportsCount = Array.isArray(reports) ? reports.length : 0
  const lastReportDate = reportsCount > 0 ? (reports[0]?.created_at || 'Recently') : 'No reports yet'

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 px-6 py-6 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Member Dashboard</p>
            <h2 className="mt-2 text-3xl font-bold">{signedIn ? `Welcome back, ${displayName}` : 'Saltern Welfare Society workspace'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              A shared dashboard for salt producers. Sign in to sync reports, keep member data organized, and preserve the existing profit-share calculator workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {signedIn ? (
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Sign in / Register
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3">
        <StatCard
          title="Account"
          value={signedIn ? displayName : 'Not signed in'}
          note={signedIn ? 'Connected through Supabase Auth' : 'Popup auth is ready when you need it'}
          accent="blue"
        />
        <StatCard
          title="Reports"
          value={String(reportsCount)}
          note={lastReportDate && lastReportDate !== 'No reports yet' ? `Last sync: ${lastReportDate}` : 'Save a report to populate the list'}
          accent="green"
        />
        <StatCard
          title="Access"
          value={isSupabaseConfigured ? 'Supabase ready' : 'Local mode'}
          note={isSupabaseConfigured ? 'Auth and sync can use your Supabase project' : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY'}
          accent="slate"
        />
      </div>
    </section>
  )
}
