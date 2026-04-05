import React, { useState } from 'react'
import { formatLKR } from '../utils/calculations.jsx'

function StatCard({ title, value, note, accent = 'slate', isTamil }) {
  const accentMap = {
    slate: 'from-slate-900 to-slate-700',
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-emerald-600 to-teal-500',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className={`inline-flex rounded-full bg-gradient-to-r ${accentMap[accent]} px-3 py-1 ${isTamil ? 'text-[0.6rem]' : 'text-xs'} font-semibold uppercase tracking-[0.05em] text-white`}>
        {title}
      </div>
      <div className={`mt-3 ${isTamil ? 'text-lg' : 'text-2xl'} font-bold text-slate-900 break-words`}>{value}</div>
      {note && <div className={`mt-1 ${isTamil ? 'text-[0.65rem] leading-tight' : 'text-sm'} text-slate-500`}>{note}</div>}
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
  billingStatus,
  onStartCardPayment,
  onRequestCashPayment,
  stripeFeePreview,
  paymentBusy,
  isAdmin,
  pendingPaymentRequests = [],
  onRefreshPendingPaymentRequests,
  onActivatePaymentRequest,
  adminActionBusy,
  onOpenAdminAuth,
}) {
  const tr = (key, fallback) => (t ? t(key) : fallback)
  const isTamil = (t && t('lang') === 'ta') || (typeof t === 'function' && t('title') === 'உப்பு இலாப பகிர்வு கணக்கீடு')
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
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null)
  const [adminApprovalNote, setAdminApprovalNote] = useState('')
  const [approvalNoteError, setApprovalNoteError] = useState('')
  const fileRows = Array.isArray(savedFiles) ? savedFiles : []
  const trialLimit = Number(billingStatus?.trial_limit || 3)
  const trialUses = Number(billingStatus?.trial_uses || 0)
  const trialRemaining = Math.max(0, trialLimit - trialUses)
  const fullAccessEnabled = Boolean(billingStatus?.full_access_enabled)
  const paymentStatus = billingStatus?.payment_status || 'trial'
  const ownerNamesCount = Array.isArray(ownerNames)
    ? ownerNames.map(name => String(name || '').trim()).filter(Boolean).length
    : 0

  const openApprovalModal = (requestRow) => {
    setSelectedPaymentRequest(requestRow)
    setAdminApprovalNote('')
    setApprovalNoteError('')
    setApprovalModalOpen(true)
  }

  const closeApprovalModal = () => {
    setApprovalModalOpen(false)
    setSelectedPaymentRequest(null)
    setAdminApprovalNote('')
    setApprovalNoteError('')
  }

  const confirmActivationWithNote = async () => {
    const note = adminApprovalNote.trim()
    if (!note) {
      setApprovalNoteError(tr('adminNoteRequired', 'Admin note is required before activation.'))
      return
    }

    await onActivatePaymentRequest?.(selectedPaymentRequest, note)
    closeApprovalModal()
  }

  return (
    <section className={`mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ${t ? 'text-xs md:text-sm' : ''}`}>
      <div className="flex flex-col gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 px-6 py-5 text-white">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {signedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className={`rounded-full border border-white/20 bg-white/10 px-5 py-2.5 ${isTamil ? 'text-xs' : 'text-sm'} font-semibold text-white transition hover:bg-white/20`}
            >
              {tr('signOut', 'Sign out')}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={onOpenAuth}
                className={`rounded-full bg-white px-3 py-1.5 ${isTamil ? 'text-[10px]' : 'text-sm'} font-semibold text-slate-900 transition hover:bg-slate-100`}
              >
                {tr('signInRegister', 'Sign in / Register')}
              </button>
              <button
                type="button"
                onClick={onOpenAdminAuth}
                className={`rounded-full border border-amber-300 bg-amber-100 px-3 py-1.5 ${isTamil ? 'text-[10px]' : 'text-sm'} font-semibold text-amber-900 transition hover:bg-amber-200`}
              >
                👤 {tr('adminAccess', 'Admin Access')}
              </button>
            </div>
          )}
        </div>

        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          {tr('dashboardSubtitle', 'Quick producer summary for salt calculations, report sync, and saved performance snapshots.')}
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-full bg-gradient-to-r from-emerald-700 to-teal-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                {tr('adminDashboard', 'Admin Dashboard')}
              </div>
              <button
                type="button"
                onClick={onRefreshPendingPaymentRequests}
                disabled={adminActionBusy}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {tr('refreshPending', 'Refresh Pending')}
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-600">
              {tr('adminPendingHelp', 'Review pending/captured payments and activate user access with one click.')}
            </div>

            {pendingPaymentRequests.length === 0 ? (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {tr('noPendingPaymentRequests', 'No pending payment requests.')}
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{tr('user', 'User')}</th>
                        <th className="px-3 py-2 font-semibold">{tr('paymentMethod', 'Method')}</th>
                        <th className="px-3 py-2 font-semibold">{tr('amount', 'Amount')}</th>
                        <th className="px-3 py-2 font-semibold">{tr('status', 'Status')}</th>
                        <th className="px-3 py-2 font-semibold">{tr('action', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {pendingPaymentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700">
                            <div className="font-medium">{req.user_email || req.user_id}</div>
                            <div className="text-xs text-slate-500">{req.created_at || '-'}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{String(req.payment_method || '-').toUpperCase()}</td>
                          <td className="px-3 py-2 text-slate-700">{formatLKR(req.amount_lkr || 0)}</td>
                          <td className="px-3 py-2 text-slate-700">{req.status || '-'}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => openApprovalModal(req)}
                              disabled={adminActionBusy}
                              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {adminActionBusy ? tr('pleaseWait', 'Please wait...') : tr('activateNow', 'Activate Now')}
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
        )}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <div className="inline-flex rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
            {tr('billingAccess', 'Billing & Access')}
          </div>
          <div className="mt-5 grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-[28px] bg-slate-50 border border-slate-200 p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-2">{tr('trialStatus', 'Trial Status')}</div>
              <div className="text-sm font-bold text-slate-800">
                {fullAccessEnabled
                  ? tr('fullVersionActive', 'Full version is active')
                  : `${tr('freeTrialUsed', 'Free trial used')}: ${trialUses}/${trialLimit}`}
              </div>
              {!fullAccessEnabled && (
                <div className="mt-2 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
                  {tr('trialRemaining', 'Remaining')}: {trialRemaining}
                </div>
              )}
              {!fullAccessEnabled && paymentStatus === 'payment_pending_verification' && (
                <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-medium text-amber-800">
                  <span className="mr-1">⏳</span> {tr('activationPending', 'Payment received. Admin verification pending for activation.')}
                </div>
              )}
            </div>

            <div className="rounded-[28px] bg-slate-50 border border-slate-200 p-5 shadow-sm sm:col-span-1 md:col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">{tr('stripeFeeGlance', 'Stripe Fee Glance (Sri Lankan Cards)')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{tr('oneOffPrice', 'One-off Price')}</div>
                  <div className="text-sm font-bold text-slate-700">{stripeFeePreview?.baseFormatted || 'LKR 30,000.00'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{tr('estimatedCardFee', 'Estimated Card Fee')}</div>
                  <div className="text-sm font-bold text-slate-700">{stripeFeePreview?.feeFormatted || 'LKR 0.00'}</div>
                </div>
                <div className="space-y-1 border-l border-slate-200 pl-4">
                  <div className="text-[10px] text-indigo-400 font-bold uppercase">{tr('estimatedTotal', 'Estimated Total')}</div>
                  <div className="text-lg font-black text-slate-900">{stripeFeePreview?.totalFormatted || 'LKR 30,000.00'}</div>
                </div>
              </div>
              <div className="mt-3 text-[10px] italic text-slate-400 font-medium">{tr('feeDisclaimer', 'Actual Stripe fees may vary by issuer and card type.')}</div>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {!fullAccessEnabled && (
                <>
                  <button
                    type="button"
                    onClick={onStartCardPayment}
                    disabled={paymentBusy}
                    className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white shadow-lg transition active:scale-95 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paymentBusy ? tr('pleaseWait', 'Please wait...') : tr('payByCard', 'Pay by Card (Stripe)')}
                  </button>
                  <button
                    type="button"
                    onClick={onRequestCashPayment}
                    disabled={paymentBusy}
                    className="w-full rounded-2xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 transition active:scale-95 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {tr('submitCashRequest', 'Submit Cash Payment Request')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <StatCard
          title={tr('account', 'Account')}
          value={signedIn ? displayName : tr('notSignedIn', 'Not signed in')}
          note={signedIn ? tr('connectedSupabaseAuth', 'Connected through Supabase Auth') : tr('popupAuthReady', 'Popup auth is ready when you need it')}
          accent="blue"
          isTamil={isTamil}
        />
        <StatCard
          title={tr('productionSnapshot', 'Production Snapshot')}
          value={`${snapshotNetBags} ${tr('bagsUnit', 'bags')}`}
          note={`${tr('weightLabel', 'Weight')}: ${snapshotSaltWeight} kg • ${tr('initialPriceLabel', 'Initial price')}: LKR ${snapshotInitialPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accent="slate"
          isTamil={isTamil}
        />
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl transition-all hover:shadow-2xl">
          <div className="inline-flex rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white">
            📍 {tr('workLocations', 'Work Locations')}
          </div>
          <div className="mt-5">
            <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {tr('workLocationsHelp', 'Add your work locations here to use them in reports')}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
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
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
              <button
                type="button"
                onClick={() => {
                  if (newLocation.trim() && onAddLocation) {
                    onAddLocation(newLocation.trim(), null)
                    setNewLocation('')
                  }
                }}
                className="rounded-2xl bg-slate-900 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition active:scale-95 hover:bg-slate-800"
              >
                {tr('add', 'Add')}
              </button>
            </div>
            {Array.isArray(customLocations) && customLocations.length > 0 && (
              <div className="mt-5 grid grid-cols-1 gap-2">
                {customLocations.map((loc) => (
                  <div
                    key={loc}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition-all hover:border-purple-200 hover:bg-white hover:shadow-md"
                  >
                    <span className="truncate text-sm font-bold text-slate-700">{loc}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteLocation && onDeleteLocation(loc)}
                      className="rounded-full bg-red-50 p-2 text-red-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-100"
                      title={tr('deleteLocation', 'Delete location')}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl transition-all hover:shadow-2xl">
          <div className="inline-flex rounded-full bg-gradient-to-r from-orange-600 to-red-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white">
            % {tr('profitShare', 'Profit Share')}
          </div>
          <div className="mt-5">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {tr('contractorSharePercentage', 'Contractor share percentage')}
            </div>
            <div className="flex flex-col gap-5">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={contractorSharePercentage}
                  onChange={(e) => onContractorSharePercentageChange && onContractorSharePercentageChange(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-orange-600"
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">{tr('contractor', 'Contractor')}</div>
                  <div className="text-xl font-black text-slate-900">{contractorSharePercentage}%</div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">{tr('owners', 'Owners')}</div>
                  <div className="text-xl font-black text-slate-900">{100 - contractorSharePercentage}%</div>
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs font-medium italic text-slate-500">
              {contractorSharePercentage === 50 ? tr('splitStandard', '50/50 split (standard)') : 
               contractorSharePercentage > 50 ? `${tr('contractorGetsMore', 'Contractor gets more')} (${contractorSharePercentage}%)` :
               tr('ownersGetMore', 'Owners get more')}
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 transition-all hover:shadow-2xl">
          <div className="inline-flex rounded-full bg-gradient-to-r from-cyan-600 to-blue-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white">
            👥 {tr('ownerNames', 'Owner Names')}
          </div>
          <div className="mt-5">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {tr('ownerNamesHelp', "Customize your partners' names to display in reports")}
            </div>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1].map(idx => (
                <div key={idx} className="group relative flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 border border-slate-100 transition-all hover:border-blue-200 hover:bg-white hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">{tr('owner', 'Owner')} {idx + 1}</div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(ownerNames || ['', ''])]
                        updated[idx] = ''
                        onOwnerNamesChange && onOwnerNamesChange(updated)
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                      title={tr('clear', 'Clear')}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ownerNames?.[idx] ?? ''}
                    onChange={(e) => {
                      const updated = [...(ownerNames || ['', ''])]
                      updated[idx] = e.target.value
                      onOwnerNamesChange && onOwnerNamesChange(updated)
                    }}
                    placeholder={`${tr('owner', 'Owner')} ${idx + 1}`}
                    className="w-full bg-transparent text-sm font-bold text-slate-900 border-none outline-none placeholder:text-slate-300"
                  />
                  <div className="h-0.5 w-full bg-slate-200 group-focus-within:bg-blue-500 transition-colors"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
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
                      className="mt-1 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tr('toDate', 'To Date')}</div>
                    <input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => onReportToDateChange(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[28px] bg-blue-50 p-5 shadow-sm border border-blue-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600">{tr('grossSales', 'Gross Sales')}</div>
                    <div className="mt-2 text-2xl font-black text-blue-900">{formatLKR(pnlSummary.grossSales)}</div>
                  </div>
                  <div className="rounded-[28px] bg-amber-50 p-5 shadow-sm border border-amber-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-600">{tr('totalExpenses', 'Operating Expenses')}</div>
                    <div className="mt-2 text-2xl font-black text-amber-900">{formatLKR(pnlSummary.totalOperatingExpenses)}</div>
                    <div className="mt-1 text-xs font-medium text-amber-700 opacity-80">{formatLKR(pnlSummary.totalLoans)} {tr('totalLoans', 'Loans')}</div>
                  </div>
                  <div className="rounded-[28px] bg-emerald-50 p-5 shadow-sm border border-emerald-100 sm:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">{tr('netProfit', 'Net Profit')}</div>
                    <div className={`mt-2 text-2xl font-black ${pnlSummary.netProfit < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                      {formatLKR(pnlSummary.netProfit)}
                    </div>
                    <div className="mt-1 text-xs font-medium text-emerald-700 opacity-80">
                      {tr('grossMargin', 'Gross margin')}: {formatLKR(pnlSummary.grossMargin)} • {tr('reports', 'Reports')}: {pnlSummary.count}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">{tr('savedReports', 'Saved Reports')}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{filteredReports.length}</span>
                  </div>
                  
                  {filteredReports.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
                      {reportsCount === 0 ? tr('noReportsLoaded', 'No reports loaded.') : tr('noReportsInPeriod', 'No reports in this period.')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredReports.map(r => {
                        const reportId = r.id || (r.inserted && r.inserted[0] && r.inserted[0].id) || r.inserted?.[0]?.id;
                        const createdAt = r.created_at || (r.inserted && r.inserted[0] && r.inserted[0].created_at) || '';
                        const payload = r.payload || (r.inserted && r.inserted[0]?.payload) || {};
                        const reportDate = payload.inputs?.date || '';
                        const billNumber = payload.inputs?.billNumber || '';
                        const ownerName = payload.inputs?.ownerName || tr('unnamed', 'Unnamed');
                        const netProfit = payload.results?.netProfit || 0;

                        return (
                          <div key={reportId || Math.random()} className="group flex flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">#{String(reportId).slice(-6)}</span>
                                <span className="text-[10px] font-medium text-slate-500">{new Date(createdAt).toLocaleDateString()}</span>
                              </div>
                              <h5 className="font-bold text-slate-900 line-clamp-1">{ownerName}</h5>
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">{tr('date', 'Date')}</span>
                                  <span className="font-medium text-slate-700">{reportDate}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">{tr('billNumberShort', 'Bill #')}</span>
                                  <span className="font-medium text-slate-700">{billNumber}</span>
                                </div>
                                <div className="mt-2 border-t border-slate-100 pt-2 flex justify-between text-xs">
                                  <span className="font-bold text-slate-500">{tr('netProfit', 'Net Profit')}</span>
                                  <span className={`font-black ${netProfit < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatLKR(netProfit)}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => onLoadReport?.(r)} 
                              className="mt-4 w-full rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-lg transition active:scale-95 hover:bg-slate-800"
                            >
                              {tr('load', 'Load')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">{tr('savedFiles', 'Saved Files')}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{fileRows.length}</span>
                  </div>
                  
                  {fileRows.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
                      {tr('noSavedFilesYet', 'No saved files yet.')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {fileRows.map((file) => (
                        <div key={file.name} className="flex flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg">
                          <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-orange-100 p-2 text-orange-600">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="overflow-hidden">
                              <div className="truncate text-sm font-bold text-slate-900" title={file.name}>{file.name}</div>
                              <div className="mt-1 text-[10px] text-slate-500">
                                {new Date(file.created_at).toLocaleDateString()} • {(file.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onLoadSavedFile?.(file.name)}
                            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition active:scale-95 hover:bg-slate-100"
                          >
                            {tr('view', 'View')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {approvalModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{tr('approvalModalTitle', 'Approve & Activate Payment')}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {tr('approvalModalSubtitle', 'Add verification note before activating full access.')}
            </p>

            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <div><span className="font-semibold">{tr('user', 'User')}:</span> {selectedPaymentRequest?.user_email || selectedPaymentRequest?.user_id || '-'}</div>
              <div><span className="font-semibold">{tr('paymentMethod', 'Method')}:</span> {String(selectedPaymentRequest?.payment_method || '-').toUpperCase()}</div>
              <div><span className="font-semibold">{tr('amount', 'Amount')}:</span> {formatLKR(selectedPaymentRequest?.amount_lkr || 0)}</div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">{tr('adminVerificationNote', 'Admin Verification Note')}</span>
              <textarea
                value={adminApprovalNote}
                onChange={(e) => {
                  setAdminApprovalNote(e.target.value)
                  if (approvalNoteError) setApprovalNoteError('')
                }}
                rows={4}
                placeholder={tr('adminVerificationNotePlaceholder', 'Example: Bank transfer slip checked and matched with account records.')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            {approvalNoteError && (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {approvalNoteError}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeApprovalModal}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {tr('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={confirmActivationWithNote}
                disabled={adminActionBusy}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {adminActionBusy ? tr('pleaseWait', 'Please wait...') : tr('confirmActivate', 'Confirm & Activate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
