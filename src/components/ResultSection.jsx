import React from 'react'
import { formatLKR } from '../utils/calculations.jsx'

function StatRow({label, value, isNegative}){
  // split bracketed part to allow responsive stacking
  const idx = label.indexOf('(')
  const hasBracket = idx !== -1
  const main = hasBracket ? label.slice(0, idx).trim() : label
  const sub = hasBracket ? label.slice(idx).trim() : ''

  return (
    <div className="py-3 px-5 rounded-[28px] bg-[#ffac76]/10 border border-[#ffac76]/30 mb-3 last:mb-0 transition-all hover:bg-[#ffac76]/20">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
        <div>
          <div className="text-sm text-slate-700 font-bold">{main}</div>
          {hasBracket && (
            <div className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">{sub}</div>
          )}
        </div>
        <div className={`text-base font-mono font-bold ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>{value}</div>
      </div>
    </div>
  )
}

export default function ResultSection({results, t, ownerNames = ['', ''], ownerCount = 2}){
  if(!results) return null
  
  const owner1Name = (ownerNames && ownerNames[0]) || `${t ? t('owner') : 'Owner'} 1`
  const owner2Name = (ownerNames && ownerNames[1]) || `${t ? t('owner') : 'Owner'} 2`
  const isSingleOwner = ownerCount === 1

  return (
    <div className="mt-2 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 lg:gap-4">
        {/* Detailed Breakdown */}
        <div className="android-card p-2 lg:p-6 relative group overflow-hidden" style={{ backgroundColor: "#fff0f0" }}>
          <div className="flex items-center justify-between mb-4 ml-[10px] relative z-20">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{t ? t('calculationBreakdown') : 'Calculation Breakdown'}</h3>
            </div>
            <span className="text-xl font-black text-slate-900/10 group-hover:text-slate-900/20 transition-colors pr-1">
              6
            </span>
          </div>
          <div className="space-y-1">
            <StatRow label={t ? t('netBags') + ' (' + t('packedMinusDeducted') + ')' : 'Net Bags (Packed - Deducted)'} value={results.netBags} isNegative={false} />
            <StatRow label={(t ? t('initialPrice') : 'Initial Price') + ' (' + (t ? t('netTimesPricePerBag') : 'Net × Price/Bag') + ')'} value={formatLKR(results.initialPrice)} isNegative={false} />
            <div className="my-2 border-t border-slate-300"></div>
            <StatRow label={(t ? t('contractorSpent') : 'Contractor Total Spent') + ' (' + (t ? t('contractorSpentFormula') : 'Packing Wage × TotalPackedBags + Bag Cost × PackedBags + Other Expenses + Labour Costs') + ')'} value={formatLKR(results.contractorTotalSpent)} isNegative={false} />
                        {results.extraExpensesTotal > 0 && (
              <StatRow label={t ? t('extraExpenses') : "Extra Expenses"} value={formatLKR(results.extraExpensesTotal)} isNegative={false} />
            )}
            {results.labourCostsTotal > 0 && (
              <>
                <StatRow label={t ? t('labourCostsTotal') : "Labour Costs (Total)"} value={formatLKR(results.labourCostsTotal)} isNegative={false} />
                {results.labourCosts && results.labourCosts.length > 0 && (
                  <>
                    {/* Arrow moved upward, height unchanged */}
                    <div className="relative flex justify-center" style={{ zIndex: 20, marginTop: '-14px', marginBottom: '6px' }}>
                      <span className="text-2xl text-emerald-500 font-black drop-shadow-lg" style={{ WebkitTextStroke: '2px #059669', zIndex: 20, position: 'absolute', top: '-4px' }}>↓</span>
                    </div>
                    <div className="ml-4 mt-2 p-3 rounded-2xl bg-[#eed3ff] border" style={{ marginTop: '4px', border: '0.5px solid #a78bfa' }}>
                      <div className="text-[13px] font-bold text-purple-800 tracking-wider mb-2 normal-case">{t ? t('labourDetails') : 'Labour details'}</div>
                      <div className="space-y-1">
                        {results.labourCosts.map((labour, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="font-semibold text-emerald-900">{labour.name ? `${labour.name} (${labour.frequency})` : `Labour - ${labour.frequency}`}</span>
                            <span className="font-mono text-emerald-700">{formatLKR(labour.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
            {results.advancesTotal > 0 && (
              <StatRow label={t ? t('advancePaymentsGiven') : 'Contractor Advance Payment'} value={formatLKR(results.advancesTotal)} isNegative={false} />
            )}
            <StatRow
              label={(t ? t('contractorShare') : 'Contractor Share') + (results.expensePayment === 'owners' ? ` (${t ? t('contractorShareOwnersFormula') : 'InitialPrice/2 + Spent'})` : results.expensePayment === 'shared5050' ? ` (${t ? t('contractorShareShared5050Formula') : '(InitialPrice - Spent)/2 + (Spent / 2)'})` : ` (${t ? t('contractorShareContractorFormula') : '(InitialPrice - Spent)/2'})`) }
              value={formatLKR(results.contractorNetShare)}
              isNegative={false}
            />
            <div className="my-2 border-t border-slate-300"></div>
            <StatRow
              label={(t ? t('grandTotalReceived') : 'Grand Total Received') + (results.expensePayment === 'owners' ? ` (${t ? t('grandTotalOwnersFormula') : 'InitialPrice - TotalLoan'})` : results.expensePayment === 'shared5050' ? ` (${t ? t('grandTotalShared5050Formula') : 'InitialPrice - Spent/2 - TotalLoan'})` : ` (${t ? t('grandTotalContractorFormula') : 'InitialPrice - Spent - TotalLoan'})`)}
              value={formatLKR(results.grandTotalReceived)}
              isNegative={false}
            />
            <StatRow
              label={(t ? t('ownerPool') : 'Owners Group Amount') + (results.expensePayment === 'owners' ? ` (${t ? t('ownerPoolOwnersFormula') : 'GrandTotal - ContractorShare'})` : results.expensePayment === 'shared5050' ? ` (${t ? t('ownerPoolShared5050Formula') : '(InitialPrice - Spent)/2'})` : ` (${t ? t('ownerPoolContractorFormula') : '(GrandTotal + TotalLoan)/2'})`)}
              value={formatLKR(results.ownerPool)}
              isNegative={results.highlights.ownerPoolNegative}
            />
            <StatRow label={isSingleOwner ? (t ? t('ownerPool') : 'Owners Group Amount') : (t ? (t('perOwnerShare') + ' (' + t('ownerPool') + '/2)') : 'Per Owner Share (Owners Group Amount/2)')} value={formatLKR(results.generalSharePerOwner)} isNegative={false} />
            <div className="my-2 border-t"></div>
            <StatRow label={t ? `${t('societyServiceCharge')} (${t('netBags')} × 100)` : 'Society Service Charge (Net Bags × 100)'} value={formatLKR(results.netBags * 100)} isNegative={false} />
            <StatRow label={t ? t('societyServiceReserved30') : 'Society Service Reserved 30%'} value={formatLKR((results.netBags * 100) * 0.30)} isNegative={false} />
          </div>
        </div>

        {/* Final Results */}
        <div className="android-card p-2 lg:p-6 relative group overflow-hidden" style={{ backgroundColor: "#f0fdf4" }}>
          <div className="flex items-center justify-between mb-4 ml-[10px] relative z-20">
            <div className="flex items-center gap-2">
              <span className="text-lg">🥇</span>
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{t ? t('finalResults') : 'Final Results'}</h3>
            </div>
            <span className="text-xl font-black text-slate-900/10 group-hover:text-slate-900/20 transition-colors pr-1">
              7
            </span>
          </div>
          <div className="space-y-4">
            <div className="android-card p-6 bg-sky-50 border border-sky-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-700">{owner1Name} - {t ? t('finalShare') : 'Final Share'}</span>
                {results.loanInaya > 0 && (
                  <span className="text-[11px] font-bold bg-sky-200 text-sky-800 px-3 py-1 rounded-full">{t ? t('loan') : 'Loan'}: {formatLKR(results.loanInaya)}</span>
                )}
              </div>
              {results.ownerAdvanceInaya > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-slate-600">{t ? t('advancePaid') : 'Advance Paid'}: <strong className="font-mono">{formatLKR(results.ownerAdvanceInaya)}</strong></span>
                </div>
              )}
              <div className={`text-2xl font-mono font-bold ${results.highlights.finalInayaNegative ? 'text-rose-600' : 'text-sky-600'}`}>
                {formatLKR(results.finalInaya)}
              </div>
              {results.highlights.finalInayaNegative && (
                <p className="text-[11px] font-bold text-rose-600 mt-3 flex items-center gap-1">
                  <span>⚠️</span> {t ? t('lossDetected') : 'Loss detected'}
                </p>
              )}
            </div>

            {!isSingleOwner && (
              <div className="android-card p-6 border border-emerald-100" style={{ backgroundColor: "#d0fedd" }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-slate-700">{owner2Name} - {t ? t('finalShare') : 'Final Share'}</span>
                  {results.loanShakira > 0 && (
                    <span className="text-[11px] font-bold bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full">{t ? t('loan') : 'Loan'}: {formatLKR(results.loanShakira)}</span>
                  )}
                </div>
                {results.ownerAdvanceShakira > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-slate-600">{t ? t('advancePaid') : 'Advance Paid'}: <strong className="font-mono">{formatLKR(results.ownerAdvanceShakira)}</strong></span>
                  </div>
                )}
                <div className={`text-2xl font-mono font-bold ${results.highlights.finalShakiraNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatLKR(results.finalShakira)}
                </div>
                {results.highlights.finalShakiraNegative && (
                  <p className="text-[11px] font-bold text-rose-600 mt-3 flex items-center gap-1">
                    <span>⚠️</span> {t ? t('lossDetected') : 'Loss detected'}
                  </p>
                )}
              </div>
            )}

            <div className="android-card p-6 mt-4 bg-orange-50 border border-orange-200/50">
                <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-700">{t ? t('totalDistributed') : 'Total Distribution'}</span>
                <strong className="text-lg font-mono text-slate-900">{formatLKR(results.finalInaya + (isSingleOwner ? 0 : results.finalShakira))}</strong>
              </div>
              <div className="my-4 border-t border-orange-200/50"></div>
              <div className={`grid ${isSingleOwner ? 'grid-cols-2' : 'grid-cols-2'} gap-y-4 gap-x-6`}>
                <div>
                  <div className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-1">{owner1Name} {t ? t('zakatLabel') : 'Zakat (5%)'}</div>
                  <div className="text-base font-mono font-bold text-slate-900">{formatLKR(results.zakatInaya)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{owner1Name} {t ? t('afterZakatLabel') : 'After Zakat'}</div>
                  <div className="text-base font-mono font-bold text-slate-900">{formatLKR(results.finalInayaAfterZakat)}</div>
                </div>
                {!isSingleOwner && (
                  <>
                    <div className="pt-2 border-t border-orange-200/30">
                      <div className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-1">{owner2Name} {t ? t('zakatLabel') : 'Zakat (5%)'}</div>
                      <div className="text-base font-mono font-bold text-slate-900">{formatLKR(results.zakatShakira)}</div>
                    </div>
                    <div className="pt-2 border-t border-orange-200/30">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{owner2Name} {t ? t('afterZakatLabel') : 'After Zakat'}</div>
                      <div className="text-base font-mono font-bold text-slate-900">{formatLKR(results.finalShakiraAfterZakat)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
