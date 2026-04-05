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
  inputs,
  results,
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
  customLocations = [],
  onAddLocation,
  onDeleteLocation,
  ownerNames = ['', ''],
  onOwnerNamesChange,
  contractorSharePercentage = 50,
  onContractorSharePercentageChange,
  t,
}) {
  const tr = (key, fallback) => (t ? t(key) : fallback)
  const signedIn = Boolean(session?.user)
  const displayName = session?.user?.email || tr('guestMember', 'Guest member')
  const reportsCount = Array.isArray(reports) ? reports.length : 0
  const lastReportDate = reportsCount > 0 ? (reports[0]?.created_at || tr('recently', 'Recently')) : tr('noReportsYet', 'No reports yet')
  const latestPayload = reports[0]?.payload || reports[0]?.inserted?.[0]?.payload || {}
  const latestResults = latestPayload.results || {}
  const liveNetBags = Number(results?.netBags) || 0
  const liveInitialPrice = Number(results?.initialPrice) || 0
  const latestNetBags = Number(latestResults.netBags) || 0
  const latestInitialPrice = Number(latestResults.initialPrice) || 0
  const snapshotNetBags = liveNetBags > 0 ? liveNetBags : latestNetBags
  const snapshotInitialPrice = liveInitialPrice > 0 ? liveInitialPrice : latestInitialPrice
  const snapshotSaltWeight = snapshotNetBags * 50
  const [reportsOpen, setReportsOpen] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const fileRows = Array.isArray(savedFiles) ? savedFiles : []
  const ownerNamesCount = Array.isArray(ownerNames)
    ? ownerNames.map(name => String(name || '').trim()).filter(Boolean).length
    : 0

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
              {tr('signOut', 'Sign out')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              {tr('signInRegister', 'Sign in / Register')}
            </button>
          )}
        </div>

        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          {tr('dashboardSubtitle', 'Quick producer summary for salt calculations, report sync, and saved performance snapshots.')}
        </p>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-2">
        <StatCard
          title={tr('account', 'Account')}
          value={signedIn ? displayName : tr('notSignedIn', 'Not signed in')}
          note={signedIn ? tr('connectedSupabaseAuth', 'Connected through Supabase Auth') : tr('popupAuthReady', 'Popup auth is ready when you need it')}
          accent="blue"
        />
        <StatCard
          title={tr('productionSnapshot', 'Production Snapshot')}
          value={`${snapshotNetBags} ${tr('bagsUnit', 'bags')}`}
          note={`${tr('weightLabel', 'Weight')}: ${snapshotSaltWeight} kg • ${tr('initialPriceLabel', 'Initial price')}: LKR ${snapshotInitialPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accent="slate"
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="inline-flex rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            📍 {tr('workLocations', 'Work Locations')}
          </div>
          <div className="mt-3">
            <div className="text-sm text-slate-600 mb-2">{tr('workLocationsHelp', 'Add your work locations here to use them in reports')}</div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newLocation.trim() && onAddLocation) {
                    onAddLocation(newLocation.trim(), null)
                    setNewLocation('')
                  }
                }}
                placeholder={tr('enterLocationName', 'Enter location name')}
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  if (newLocation.trim() && onAddLocation) {
                    onAddLocation(newLocation.trim(), null)
                    setNewLocation('')
                  }
                }}
                className="rounded-full bg-slate-800 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                {tr('add', 'Add')}
              </button>
            </div>
            {Array.isArray(customLocations) && customLocations.length > 0 && (
              <div className="space-y-2">
                {customLocations.map(loc => (
                  <div key={loc} className="flex items-center justify-between gap-2 bg-slate-100 rounded px-3 py-2">
                    <span className="text-xs text-slate-700 font-medium break-words flex-1">{loc}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteLocation && onDeleteLocation(loc)
                      }}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition flex-shrink-0"
                      title={tr('deleteLocation', 'Delete location')}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="inline-flex rounded-full bg-gradient-to-r from-orange-600 to-red-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            % {tr('profitShare', 'Profit Share')}
          </div>
          <div className="mt-3">
            <div className="text-sm text-slate-600 mb-2">{tr('contractorSharePercentage', 'Contractor share percentage')}</div>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={contractorSharePercentage}
                onChange={(e) => onContractorSharePercentageChange && onContractorSharePercentageChange(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs lg:text-sm font-semibold text-slate-900 text-center lg:text-right lg:whitespace-nowrap">
                {contractorSharePercentage}% {tr('contractor', 'Contractor')} : {100 - contractorSharePercentage}% {tr('owners', 'Owners')}
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {contractorSharePercentage === 50 ? tr('splitStandard', '50/50 split (standard)') : 
               contractorSharePercentage > 50 ? `${tr('contractorGetsMore', 'Contractor gets more')} (${contractorSharePercentage}%)` :
               tr('ownersGetMore', 'Owners get more')}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:col-span-2">
          <div className="inline-flex rounded-full bg-gradient-to-r from-cyan-600 to-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            👥 {tr('ownerNames', 'Owner Names')}
          </div>
          <div className="mt-3">
            <div className="text-sm text-slate-600 mb-3">{tr('ownerNamesHelp', "Customize your partners' names to display in reports")}</div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {[0, 1].map(idx => (
                <div key={idx} className="block">
                  <div className="text-xs font-semibold text-slate-700 mb-2">{tr('owner', 'Owner')} {idx + 1}</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ownerNames?.[idx] ?? ''}
                      onChange={(e) => {
                        const updated = [...(ownerNames || ['', ''])]
                        updated[idx] = e.target.value
                        onOwnerNamesChange && onOwnerNamesChange(updated)
                      }}
                      placeholder={`${tr('owner', 'Owner')} ${idx + 1}`}
                      className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(ownerNames || ['', ''])]
                        updated[idx] = ''
                        onOwnerNamesChange && onOwnerNamesChange(updated)
                      }}
                      className="px-2 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition"
                      title={tr('clearOwnerName', 'Clear owner name')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {ownerNames && ownerNames[0] && ownerNames[1] && (
              <div className="mt-3 text-xs text-slate-600 break-words">
                {tr('reportsWillShow', 'Reports will show')}: <span className="font-semibold text-slate-900">{ownerNames[0]} & {ownerNames[1]}</span>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-4 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  {tr('reports', 'Reports')} ({ownerNamesCount > 0 ? `${ownerNamesCount} ${tr('owners', 'Owners')}` : tr('noOwnersSet', 'No owners set')})
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{reportsCount}</div>
                <div className="text-sm text-slate-500">{lastReportDate && lastReportDate !== tr('noReportsYet', 'No reports yet') ? `${tr('lastSync', 'Last sync')}: ${lastReportDate}` : tr('saveReportToPopulate', 'Save a report to populate the list')}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReportsOpen(prev => !prev)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  {reportsOpen ? tr('hideDetails', 'Hide details') : tr('showDetails', 'Show details')}
                </button>
                <button
                  type="button"
                  onClick={onClearReportFilters}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  {tr('clear', 'Clear')}
                </button>
              </div>
            </div>

            {reportsOpen && (
              <div className="border-t border-slate-200 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tr('fromDate', 'From Date')}</div>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => onReportFromDateChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tr('toDate', 'To Date')}</div>
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
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">{tr('grossSales', 'Gross Sales')}</div>
                  <div className="mt-2 text-2xl font-bold text-blue-900">{formatLKR(pnlSummary.grossSales)}</div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 shadow-lg">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">{tr('totalExpenses', 'Operating Expenses')}</div>
                  <div className="mt-2 text-2xl font-bold text-amber-900">{formatLKR(pnlSummary.totalOperatingExpenses)}</div>
                  <div className="mt-1 text-sm text-amber-700">{formatLKR(pnlSummary.totalLoans)} {tr('totalLoans', 'Loans')}</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 shadow-lg md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{tr('netProfit', 'Net Profit')}</div>
                  <div className={`mt-2 text-2xl font-bold ${pnlSummary.netProfit < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                    {formatLKR(pnlSummary.netProfit)}
                  </div>
                  <div className="mt-1 text-sm text-emerald-700">{tr('grossMargin', 'Gross margin')}: {formatLKR(pnlSummary.grossMargin)} • {tr('reports', 'Reports')}: {pnlSummary.count}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{tr('savedReports', 'Saved Reports')}</div>
                {filteredReports.length === 0 ? (
                  <div className="text-sm text-slate-500">{reportsCount === 0 ? tr('noReportsLoaded', 'No reports loaded.') : tr('noReportsInPeriod', 'No reports in this period.')}</div>
                ) : (
                  <ul className="space-y-3">
                    {filteredReports.map(r => (
                      <li key={r.id || r.inserted?.[0]?.id || Math.random()} className="rounded-2xl border border-slate-200 p-3 shadow-sm transition hover:shadow-md hover:bg-slate-50">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{tr('id', 'ID')}: {r.id || (r.inserted && r.inserted[0] && r.inserted[0].id) || r.inserted?.[0]?.id}</div>
                            <div className="text-xs text-slate-500">{r.created_at || (r.inserted && r.inserted[0] && r.inserted[0].created_at) || ''}</div>
                            <div className="mt-1 text-xs text-slate-700">{tr('date', 'Date')}: {((r.payload && r.payload.inputs && r.payload.inputs.date) || (r.inserted && r.inserted[0] && r.inserted[0].payload && r.inserted[0].payload.inputs && r.inserted[0].payload.inputs.date) || '')}</div>
                            <div className="text-xs text-slate-700">{tr('billNumberShort', 'Bill #')}: {((r.payload && r.payload.inputs && r.payload.inputs.billNumber) || (r.inserted && r.inserted[0] && r.inserted[0].payload && r.inserted[0].payload.inputs && r.inserted[0].payload.inputs.billNumber) || '')}</div>
                          </div>
                          <div>
                            <button onClick={() => onLoadReport?.(r)} className="rounded-full bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700">{tr('load', 'Load')}</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{tr('savedFiles', 'Saved Files')}</div>
                {fileRows.length === 0 ? (
                  <div className="text-sm text-slate-500">{tr('noSavedFilesYet', 'No saved files yet.')}</div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-semibold">{tr('file', 'File')}</th>
                            <th className="px-4 py-3 font-semibold">{tr('created', 'Created')}</th>
                            <th className="px-4 py-3 font-semibold">{tr('size', 'Size')}</th>
                            <th className="px-4 py-3 font-semibold">{tr('action', 'Action')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {fileRows.map((file) => (
                            <tr key={file.id || file.file_path} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{file.file_name || tr('unnamedFile', 'Unnamed file')}</div>
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
                                  {tr('open', 'Open')}
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
