import React, { useState } from 'react'
import { formatLKR } from '../utils/calculations.jsx'

function StatCard({ title, value, note, accent = 'slate' }) {
  const accentMap = {
    slate: 'from-slate-900 to-slate-700',
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-emerald-600 to-teal-500',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className={`inline-flex rounded-full bg-gradient-to-r ${accentMap[accent]} px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white`}>
        {title}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      {note && <div className="mt-1 text-sm text-slate-500">{note}</div>}
    </div>
  )
}

export default function DashboardSummary({
  session,
  reports,
  savedFiles,
  filteredReports,
  pnlSummary,
  reportFromDate,
  reportToDate,
  onReportFromDateChange,
  onReportToDateChange,
  onClearReportFilters,
  onOpenAuth,
  onSignOut,
  onLoadReport,
  onLoadSavedFile,
}) {
  const signedIn = Boolean(session?.user)
  const displayName = session?.user?.email || 'Guest member'
  const reportsCount = Array.isArray(reports) ? reports.length : 0
  const lastReportDate = reportsCount > 0 ? (reports[0]?.created_at || 'Recently') : 'No reports yet'
  const latestPayload = reports[0]?.payload || reports[0]?.inserted?.[0]?.payload || {}
  const latestInputs = latestPayload.inputs || {}
  const latestResults = latestPayload.results || {}
  const latestNetBags = Number(latestResults.netBags) || 0
  const latestSaltWeight = latestNetBags * 50
  const latestInitialPrice = Number(latestResults.initialPrice) || 0
  const [reportsOpen, setReportsOpen] = useState(false)
  const fileRows = Array.isArray(savedFiles) ? savedFiles : []

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 px-6 py-5 text-white">
        <div className="flex flex-wrap items-center justify-end gap-3">
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

        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          Quick producer summary for salt calculations, report sync, and saved performance snapshots.
        </p>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-2">
        <StatCard
          title="Account"
          value={signedIn ? displayName : 'Not signed in'}
          note={signedIn ? 'Connected through Supabase Auth' : 'Popup auth is ready when you need it'}
          accent="blue"
        />
        <StatCard
          title="Production Snapshot"
          value={`${latestNetBags} bags`}
          note={`Weight: ${latestSaltWeight} kg • Initial price: LKR ${latestInitialPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accent="slate"
        />
        <div className="md:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-4 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  Reports
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{reportsCount}</div>
                <div className="text-sm text-slate-500">{lastReportDate && lastReportDate !== 'No reports yet' ? `Last sync: ${lastReportDate}` : 'Save a report to populate the list'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReportsOpen(prev => !prev)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  {reportsOpen ? 'Hide details' : 'Show details'}
                </button>
                <button
                  type="button"
                  onClick={onClearReportFilters}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>

            {reportsOpen && (
              <div className="border-t border-slate-200 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">From Date</div>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => onReportFromDateChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Date</div>
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(e) => onReportToDateChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-blue-50 p-4 shadow-lg">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">Gross Sales</div>
                  <div className="mt-2 text-2xl font-bold text-blue-900">{formatLKR(pnlSummary.grossSales)}</div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 shadow-lg">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Operating Expenses</div>
                  <div className="mt-2 text-2xl font-bold text-amber-900">{formatLKR(pnlSummary.totalOperatingExpenses)}</div>
                  <div className="mt-1 text-sm text-amber-700">{formatLKR(pnlSummary.totalLoans)} Loans</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 shadow-lg md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Net Profit</div>
                  <div className={`mt-2 text-2xl font-bold ${pnlSummary.netProfit < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                    {formatLKR(pnlSummary.netProfit)}
                  </div>
                  <div className="mt-1 text-sm text-emerald-700">Gross margin: {formatLKR(pnlSummary.grossMargin)} • Reports: {pnlSummary.count}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Saved Reports</div>
                {filteredReports.length === 0 ? (
                  <div className="text-sm text-slate-500">{reportsCount === 0 ? 'No reports loaded.' : 'No reports in this period.'}</div>
                ) : (
                  <ul className="space-y-3">
                    {filteredReports.map(r => (
                      <li key={r.id || r.inserted?.[0]?.id || Math.random()} className="rounded-2xl border border-slate-200 p-3 shadow-sm transition hover:shadow-md hover:bg-slate-50">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">ID: {r.id || (r.inserted && r.inserted[0] && r.inserted[0].id) || r.inserted?.[0]?.id}</div>
                            <div className="text-xs text-slate-500">{r.created_at || (r.inserted && r.inserted[0] && r.inserted[0].created_at) || ''}</div>
                            <div className="mt-1 text-xs text-slate-700">Date: {((r.payload && r.payload.inputs && r.payload.inputs.date) || (r.inserted && r.inserted[0] && r.inserted[0].payload && r.inserted[0].payload.inputs && r.inserted[0].payload.inputs.date) || '')}</div>
                            <div className="text-xs text-slate-700">Bill #: {((r.payload && r.payload.inputs && r.payload.inputs.billNumber) || (r.inserted && r.inserted[0] && r.inserted[0].payload && r.inserted[0].payload.inputs && r.inserted[0].payload.inputs.billNumber) || '')}</div>
                          </div>
                          <div>
                            <button onClick={() => onLoadReport?.(r)} className="rounded-full bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700">Load</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Saved Files</div>
                {fileRows.length === 0 ? (
                  <div className="text-sm text-slate-500">No saved files yet.</div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-semibold">File</th>
                            <th className="px-4 py-3 font-semibold">Created</th>
                            <th className="px-4 py-3 font-semibold">Size</th>
                            <th className="px-4 py-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {fileRows.map((file) => (
                            <tr key={file.id || file.file_path} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{file.file_name || 'Unnamed file'}</div>
                                <div className="text-xs text-slate-500 break-all">{file.file_path}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{file.created_at || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{file.file_size ? `${(Number(file.file_size) / 1024).toFixed(1)} KB` : '-'}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => onLoadSavedFile?.(file)}
                                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
