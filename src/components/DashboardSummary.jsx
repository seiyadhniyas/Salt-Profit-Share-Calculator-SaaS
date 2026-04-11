import React, { useState } from 'react'
import { formatLKR } from '../utils/calculations.jsx'

function StatCard({ title, value, note, accent = 'slate', isTamil }) {
  const accentMap = {
    slate: 'from-slate-900 to-slate-700',
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-emerald-600 to-teal-500',
    purple: 'from-purple-600 to-indigo-500',
    amber: 'from-amber-500 to-orange-400',
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-[#fdf2ff] shadow-2xl flex flex-col transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-white">
          <h2 className="text-lg font-black text-purple-900 uppercase tracking-tight">{tr('dashboard', 'Dashboard')}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 hover:bg-purple-100 transition active:scale-95 text-lg font-bold">✕</button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 pb-9">
          {/* User Profile and Auth */}
          <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
            <div className="flex flex-col gap-4 bg-gradient-to-r from-purple-700 to-indigo-600 px-6 py-5 text-white">
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
                    <button onClick={() => onOpenAuth?.()} className="rounded-full bg-white px-6 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-50 uppercase shadow-lg shadow-purple-900/20">SignIn/Register</button>
                    <button onClick={() => onOpenAdminAuth?.()} className="rounded-full border border-amber-300 bg-amber-100 border-2 px-6 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-200 uppercase">Admin Access</button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
               {/* Billing & Premium */}
               <div className="rounded-2xl border-2 border-purple-100 p-5 bg-gradient-to-br from-purple-50 to-white shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="text-[10px] font-black uppercase text-purple-400 tracking-widest">PRICING & ACCESS</div>
                    <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase">ONE-OFF: LKR 30,000</div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <div className="text-base font-black text-slate-800 uppercase italic underline decoration-purple-300 decoration-2">{billingStatus?.full_access_enabled ? tr('premiumActive', 'PREMIUM ACTIVE') : `${tr('trialUses', 'TRIAL USES')}: ${billingStatus?.trial_uses || 0}/3`}</div>
                      {!billingStatus?.full_access_enabled && (
                        <div className="text-xs text-slate-500 mt-2 font-medium leading-relaxed max-w-sm">
                          PROMO: Full access for <span className="text-purple-600 font-bold">LKR 30,000</span> lifetime. 
                          <br/><span className="text-[10px]">*Card payments include LKR 1,100 surcharge.</span>
                        </div>
                      )}
                    </div>
                    {!billingStatus?.full_access_enabled && (
                      <div className="flex gap-3">
                        <button onClick={() => onStartCardPayment?.()} className="rounded-xl bg-purple-600 px-5 py-3 text-xs font-black text-white hover:bg-purple-700 transition-all uppercase shadow-lg shadow-purple-200">PAY BY CARD</button>
                        <button onClick={() => onRequestCashPayment?.()} className="rounded-xl border-2 border-purple-200 bg-white px-5 py-3 text-xs font-black text-purple-600 hover:bg-purple-50 transition-all uppercase">CASH / BANK</button>
                      </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Locations Management */}
                  <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[10px] font-semibold uppercase text-slate-500 tracking-tight mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-500"></span> WORK LOCATIONS
                    </div>
                    <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:gap-2">
                      <input 
                        className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm border-2 border-slate-400 focus:border-purple-600 focus:ring-0 transition-all outline-none"
                        value={newLoc}
                        onChange={e => setNewLoc(e.target.value)}
                        placeholder="NEW LOCATION NAME"
                      />
                      <button 
                        onClick={() => { if(newLoc.trim() && onAddLocation){ onAddLocation(newLoc); setNewLoc(''); }}}
                        className="bg-purple-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase hover:bg-purple-700 transition"
                      >Add</button>
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
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> OWNER NAMES
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
                          placeholder="Owner 1 Name"
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
                          placeholder="Owner 2 Name"
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
                      <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-3 sm:p-6 rounded-2xl text-center shadow-lg border-2 border-slate-600">
                        <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-tight mb-1 sm:mb-2">CONTRACTOR SHARE</div>
                        <div className="text-2xl sm:text-4xl font-black text-white">{contractorSharePercentage}%</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-700 to-indigo-600 p-3 sm:p-6 rounded-2xl text-center shadow-lg border-2 border-indigo-400">
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
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-purple-900 uppercase tracking-widest">CLOUD DATA VAULT</h3>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-wider">{reports.length} ENTRIES</span>
                <button
                  type="button"
                  className="ml-4 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 hover:bg-purple-100 transition"
                  onClick={() => setShowVaultExpanded(v => !v)}
                >
                  {showVaultExpanded ? 'Collapse' : 'Expand'}
                </button>
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
                   {reports.length > 0 ? reports.map(r => (
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

          {/* Copyright Footer */}
          <div className="text-center pt-2 pb-10 border-t border-purple-100 mb-20 lg:mb-24">
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              Copyright © {new Date().getFullYear()} | Fixmation (Pvt) Ltd
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}