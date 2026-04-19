import React, { useState } from 'react'
import { formatLKR } from '../utils/calculations.jsx'
import ContactFormModal from './ContactFormModal.jsx'

function StatCard({ title, value, note, accent = 'slate', isTamil }) {
  const accentMap = {
    slate: 'from-slate-900 to-slate-700',
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-emerald-600 to-teal-500',
    purple: 'from-purple-600 to-indigo-500',
    amber: 'from-amber-500 to-orange-400',
    gradient: 'from-pink-500 via-purple-500 to-indigo-500',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className={`inline-flex rounded-full bg-gradient-to-r ${accentMap[accent] || accentMap['gradient']} px-3 py-1 ${isTamil ? 'text-[0.6rem]' : 'text-xs'} font-semibold uppercase tracking-[0.05em] text-white`}>
        {title}
      </div>
      <div className={`mt-3 ${isTamil ? 'text-lg' : 'text-2xl'} font-bold text-slate-900 break-words`}>{value}</div>
      {note && <div className={`mt-1 ${isTamil ? 'text-[0.65rem] leading-tight' : 'text-sm'} text-slate-500`}>{note}</div>}
    </div>
  )
}

export default function DashboardSummary({
  open,
  onClose,
  session,
  reports = [],
  savedFiles = [],
  inputs,
  results,
  onOpenAuth,
  onSignOut,
  customLocations = [],
  onAddLocation,
  onDeleteLocation,
  ownerNames = ['', ''],
  setOwnerNames,
  contractorSharePercentage = 50,
  onContractorSharePercentageChange,
  t,
  billingStatus,
  onStartCardPayment,
  onRequestCashPayment,
  isAdmin,
  pendingPaymentRequests = [],
  onRefreshPendingPaymentRequests,
  onActivatePaymentRequest,
  adminActionBusy,
  onOpenAdminAuth,
}) {

  const [showVaultExpanded, setShowVaultExpanded] = useState(false)
  const [newLoc, setNewLoc] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactFormBusy, setContactFormBusy] = useState(false)
  
  if (!open) return null

  // Safe translation function
  const tr = (key, fallback) => {
    try {
      if (!t || typeof t !== 'function') return fallback
      const result = t(key)
      return result || fallback
    } catch {
      return fallback
    }
  }
  
  const isTamil = (t && typeof t === 'function' && t('lang') === 'ta')
  const signedIn = Boolean(session?.user)
  const displayName = session?.user?.email || tr('guestMember', 'Guest member')

  const reportCount = reports?.length || 0
  const savedFileCount = savedFiles?.length || 0
  const totalRevenue = reports?.reduce((sum, item) => sum + Number(item?.payload?.results?.initialPrice || 0), 0) || 0
  const mostRecentReport = reports?.[0]
  const mostRecentFile = savedFiles?.[0]
  const paymentStatus = billingStatus?.payment_status || 'trial'
  const fullAccessEnabled = Boolean(billingStatus?.full_access_enabled)
  const trialUses = billingStatus?.trial_uses ?? 0
  const trialRemaining = billingStatus?.remaining ?? Math.max(0, 3 - trialUses)
  const paymentPending = paymentStatus === 'payment_pending_verification'
  const paymentLabel = fullAccessEnabled
    ? tr('premiumActive', 'PREMIUM ACTIVE')
    : paymentPending
      ? tr('pendingAdminApproval', 'PENDING ADMIN APPROVAL')
      : `${tr('trialUses', 'TRIAL USES')}: ${trialUses}/3`

  // Handle contact form submission
  const handleContactFormSubmit = async (formData) => {
    try {
      setContactFormBusy(true)
      // Call the parent handler with the form data
      await onRequestCashPayment?.(formData)
    } catch (error) {
      throw error
    } finally {
      setContactFormBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-t-[32px] sm:rounded-[32px] bg-[#fdf2ff] shadow-2xl transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-white">
          <h2 className="text-lg font-black text-purple-900 uppercase tracking-tight">{tr('dashboard', 'Dashboard')}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 hover:bg-purple-100 transition active:scale-95 text-lg font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-9 custom-scrollbar">
          {/* User Profile and Auth */}
          <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
            <div 
              className="flex flex-col gap-4 px-6 py-5 text-white"
              style={{ background: 'linear-gradient(to right, #6b21a8, #4f46e5)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl border border-white/30 backdrop-blur-md">👤</div>
                  <div>
                    <div className="text-xs font-bold text-purple-200 uppercase tracking-widest">{tr('account', 'Account')}</div>
                    <div className="text-lg font-bold">{signedIn ? displayName : tr('guestMember', 'Guest Member')}</div>
                  </div>
                </div>
                {signedIn ? (
                  <button onClick={() => onSignOut?.()} className="rounded-full border border-white/40 bg-white/20 px-6 py-2 text-xs font-bold text-white transition hover:bg-white/30 uppercase">{tr('signOut', 'Sign Out')}</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => onOpenAuth?.()} className="rounded-full bg-white px-6 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-50 uppercase shadow-lg shadow-purple-900/20">{tr('signInRegister', 'SignIn/Register')}</button>
                    <button onClick={() => onOpenAdminAuth?.()} className="rounded-full border border-amber-300 bg-amber-100 border-2 px-6 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-200 uppercase">{tr('adminAccess', 'Admin Access')}</button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
               {/* Billing & Premium */}
               <div 
                  className="rounded-2xl border-2 border-purple-100 p-5 shadow-inner"
                  style={{ background: 'linear-gradient(to bottom right, #faf5ff, #ffffff)' }}
               >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="text-[10px] font-black uppercase text-purple-400 tracking-widest">{tr('pricingAndAccess', 'PRICING & ACCESS')}</div>
                    <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase">{tr('oneOffPrice', 'ONE-OFF: LKR 30,000')}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <div className="text-base font-black text-slate-800 uppercase italic underline decoration-purple-300 decoration-2">{paymentLabel}</div>
                      {!fullAccessEnabled && (
                        <div className="text-xs text-slate-500 mt-2 font-medium leading-relaxed max-w-sm">
                          {paymentPending
                            ? tr('pendingAdminApprovalNote', 'Your payment is awaiting admin verification.')
                            : tr('lifetimeAccessPromo', 'PROMO: Full access for LKR 30,000 lifetime.')}
                          <br/><span className="text-[10px]">{tr('cardSurchargeNote', '*Card payments include LKR 1,100 surcharge.')}</span>
                        </div>
                      )}
                      {!fullAccessEnabled && !paymentPending && (
                        <div className="mt-3 text-xs text-slate-500 font-medium uppercase tracking-[0.15em]">
                          {tr('remainingTrial', 'Remaining trial uses')}: {trialRemaining}
                        </div>
                      )}
                    </div>
                    {!fullAccessEnabled && (
                      <div className="flex gap-3">
                        <button onClick={() => onStartCardPayment?.()} className="rounded-xl bg-purple-600 px-5 py-3 text-xs font-black text-white hover:bg-purple-700 transition-all uppercase shadow-lg shadow-purple-200">{tr('payByCard', 'PAY BY CARD')}</button>
                        <button onClick={() => setShowContactForm(true)} className="rounded-xl border-2 border-purple-200 bg-white px-5 py-3 text-xs font-black text-purple-600 hover:bg-purple-50 transition-all uppercase">{tr('cashOrBank', 'CASH / BANK')}</button>
                      </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              <StatCard title={tr('savedReports', 'Saved Reports')} value={`${reportCount}`} note={tr('cloudReportsNote', 'Secure P&L report history in the cloud')} accent="blue" />
              <StatCard title={tr('downloadedFiles', 'Downloaded Files')} value={`${savedFileCount}`} note={savedFileCount > 0 ? tr('downloadedFilesNote', 'PDF/Excel exports saved to cloud storage') : tr('noDownloadsYet', 'No downloads yet')} accent="green" />
              <StatCard title={tr('totalRevenue', 'Total Revenue')} value={formatLKR(totalRevenue)} note={tr('reportRevenueTotal', 'Aggregate from saved reports')} accent="purple" />
              <StatCard title={tr('paymentStatus', 'Payment Status')} value={paymentLabel} note={paymentPending ? tr('pendingAdminApprovalNote', 'Awaiting admin approval') : fullAccessEnabled ? tr('premiumPaidNote', 'Full access granted') : `${tr('trialRemaining', 'Trial remaining')}: ${trialRemaining}`} accent={fullAccessEnabled ? 'green' : paymentPending ? 'amber' : 'amber'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Locations Management */}
                  <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[10px] font-semibold uppercase text-slate-500 tracking-tight mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-500"></span> {tr('workLocations', 'WORK LOCATIONS')}
                    </div>
                    <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:gap-2">
                      <input 
                        className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm border-2 border-slate-400 focus:border-purple-600 focus:ring-0 transition-all outline-none"
                        value={newLoc}
                        onChange={e => setNewLoc(e.target.value)}
                        placeholder={tr('newLocationName', 'NEW LOCATION NAME')}
                      />
                      <button 
                        onClick={() => { if(newLoc.trim() && onAddLocation){ onAddLocation(newLoc); setNewLoc(''); }}}
                        className="bg-purple-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase hover:bg-purple-700 transition"
                      >{tr('add', 'ADD')}</button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {customLocations.map(loc => (
                        <div key={loc} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm group border border-transparent hover:border-blue-100 transition-all">
                          <span className="font-bold text-slate-700 uppercase">{loc}</span>
                          <button onClick={() => onDeleteLocation?.(loc)} className="text-rose-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 transition opacity-0 group-hover:opacity-100 font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Owner Names Management */}
                  <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[10px] font-semibold uppercase text-slate-500 tracking-tight mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {tr('ownerNamesTitle', 'OWNER NAMES')}
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-2 items-center">
                        <input 
                          className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm border-2 border-slate-400 focus:border-purple-600 transition-all outline-none font-bold"
                          value={ownerNames[0] || ''}
                          onChange={e => { 
                            const newValue = e.target.value;
                            const n = Array.isArray(ownerNames) ? [...ownerNames] : ['', ''];
                            n[0] = newValue; 
                            setOwnerNames?.(n);
                            try { localStorage.setItem('ownerNames', JSON.stringify(n)); } catch {}
                          }}
                          placeholder={tr('owner1Name', 'Owner 1 Name')}
                        />
                        <button onClick={() => { 
                          const n = Array.isArray(ownerNames) ? [...ownerNames] : ['', ''];
                          n[0] = ''; 
                          setOwnerNames?.(n); 
                          try { localStorage.setItem('ownerNames', JSON.stringify(n)); } catch {}
                        }} className="text-rose-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 font-bold">✕</button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input 
                          className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm border-2 border-slate-400 focus:border-purple-600 transition-all outline-none font-bold"
                          value={ownerNames[1] || ''}
                          onChange={e => { 
                            const newValue = e.target.value;
                            const n = Array.isArray(ownerNames) ? [...ownerNames] : ['', ''];
                            n[1] = newValue; 
                            setOwnerNames?.(n);
                            try { localStorage.setItem('ownerNames', JSON.stringify(n)); } catch {}
                          }}
                          placeholder={tr('owner2Name', 'Owner 2 Name')}
                        />
                        <button onClick={() => { 
                          const n = Array.isArray(ownerNames) ? [...ownerNames] : ['', ''];
                          n[1] = ''; 
                          setOwnerNames?.(n);
                          try { localStorage.setItem('ownerNames', JSON.stringify(n)); } catch {}
                        }} className="text-rose-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 font-bold">✕</button>
                      </div>
                    </div>
                  </div>

                  {/* Profit Share Slider */}
                  <div className="md:col-span-2 rounded-2xl border border-slate-300 p-4 sm:p-6 bg-white shadow-xl">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <div className="text-[10px] font-semibold uppercase text-slate-500 tracking-tight">PROFIT SHARE RATIO</div>
                      {session?.user ? (
                        <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-emerald-100 animate-pulse">
                          Cloud Synced
                        </div>
                      ) : (
                        <div className="text-[9px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-amber-100">
                          Local Cache Only
                        </div>
                      )}
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={contractorSharePercentage}
                      onChange={e => onContractorSharePercentageChange?.(Number(e.target.value))}
                      className="w-full h-3 rounded-lg bg-purple-100 accent-purple-600 mb-4 sm:mb-8 cursor-pointer shadow-inner"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div 
                        className="p-3 sm:p-6 rounded-2xl text-center shadow-lg border-2 border-slate-600"
                        style={{ background: 'linear-gradient(to bottom right, #1e293b, #334155)' }}
                      >
                        <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-tight mb-1 sm:mb-2">CONTRACTOR SHARE</div>
                        <div className="text-2xl sm:text-4xl font-black text-white">{contractorSharePercentage}%</div>
                      </div>
                      <div 
                        className="p-3 sm:p-6 rounded-2xl text-center shadow-lg border-2 border-indigo-400"
                        style={{ background: 'linear-gradient(to bottom right, #6b21a8, #4f46e5)' }}
                      >
                        <div className="text-[9px] sm:text-[10px] font-black text-purple-200 uppercase tracking-widest mb-1 sm:mb-2">OWNERS SHARE</div>
                        <div className="text-2xl sm:text-4xl font-black text-white">{100 - contractorSharePercentage}%</div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </section>

          {/* Saved Reports Table */}
          <section className="rounded-3xl border border-purple-200 bg-white p-6 shadow-xl overflow-hidden">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-sm font-black text-purple-900 uppercase tracking-widest">CLOUD DATA VAULT</h3>
                  <p className="text-xs text-slate-500 mt-1">{tr('vaultDescription', 'Saved sales records, P&L reports and download history.')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-wider">{reportCount} {tr('entries', 'ENTRIES')}</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{savedFileCount} {tr('downloadedFiles', 'DOWNLOADS')}</span>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 hover:bg-purple-100 transition"
                    onClick={() => setShowVaultExpanded(v => !v)}
                  >
                    {showVaultExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
             </div>
             <div className={`overflow-x-auto transition-all duration-300 ${showVaultExpanded ? '' : 'max-h-40 overflow-hidden'}`}>
               <table className="w-full text-left text-xs">
                 <thead className="bg-purple-50 text-purple-900 uppercase font-black">
                   <tr>
                     <th className="px-5 py-4 first:rounded-l-2xl">LOCATION</th>
                     <th className="px-5 py-4">SECURE DATE</th>
                     <th className="px-5 py-4 last:rounded-r-2xl">REVENUE (LKR)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-purple-50">
                   {/* TODO: Replace with full P&L aggregation logic for all time periods */}
                   {reportCount > 0 ? reports.map(r => (
                     <tr key={r.id} className="hover:bg-purple-50/50 transition-colors cursor-pointer">
                       <td className="px-5 py-4 font-black text-slate-800 uppercase">{r.payload?.inputs?.location || '-'}</td>
                       <td className="px-5 py-4 font-bold text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                       <td className="px-5 py-4 text-emerald-600 font-black">{formatLKR(r.payload?.results?.initialPrice || 0)}</td>
                     </tr>
                   )) : <tr><td colSpan="3" className="text-center py-10 font-bold text-slate-300 uppercase tracking-widest italic">NO SECURE RECORDS FOUND</td></tr>}
                 </tbody>
               </table>
             </div>
          </section>

          {/* Download History */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{tr('downloadHistory', 'Download History')}</h3>
                <p className="text-xs text-slate-500 mt-1">{tr('downloadHistoryDescription', 'Exported reports and downloadable files from your account.')}</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider">{savedFileCount} {tr('files', 'FILES')}</span>
            </div>
            {savedFileCount > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-900 uppercase font-black">
                    <tr>
                      <th className="px-5 py-4 first:rounded-l-2xl">FILE NAME</th>
                      <th className="px-5 py-4">CREATED</th>
                      <th className="px-5 py-4">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {savedFiles.map(file => (
                      <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-800 break-words max-w-[220px]">{file.file_name || file.storage_url?.split('/').pop() || tr('unnamedFile', 'Unnamed File')}</td>
                        <td className="px-5 py-4 text-slate-500">{new Date(file.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          {file.storage_url ? (
                            <a href={file.storage_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-200 transition">{tr('download', 'Download')}</a>
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-slate-400">{tr('noLink', 'No link')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                {tr('noDownloadHistory', 'No downloads have been created yet. Save a report or export a PDF to create a history entry.')}
              </div>
            )}
          </section>

          {/* Copyright Footer */}
          <div className="text-center pt-2 pb-10 border-t border-purple-100 mb-20 lg:mb-24">
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              Copyright © {new Date().getFullYear()} | Fixmation (Pvt) Ltd
            </p>
          </div>
        </div>

        {/* Contact Form Modal */}
        <ContactFormModal
          open={showContactForm}
          onClose={() => setShowContactForm(false)}
          onSubmit={handleContactFormSubmit}
          isLoading={contactFormBusy}
          t={t}
          session={session}
        />
      </div>
    </div>
  )
}