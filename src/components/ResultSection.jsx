import React from 'react'
import { formatLKR } from '../utils/calculations.jsx'
import AccordionCard from './AccordionCard'

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
    <div className="mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Detailed Breakdown */}
        <AccordionCard 
          title={t ? t('calculationBreakdown') : 'Calculation Breakdown'}
          bgColor="#fff0f0"
          defaultOpen={false}
          icon="📊"
        >
          <div className="space-y-1">
            <StatRow label={t ? t('netBags') + ' (' + t('packedMinusDeducted') + ')' : 'Net Bags (Packed - Deducted)'} value={results.netBags} isNegative={false} />
            <StatRow label={(t ? t('initialPrice') : 'Initial Price') + ' (' + (t ? t('netTimesPricePerBag') : 'Net × Price/Bag') + ')'} value={formatLKR(results.initialPrice)} isNegative={false} />
            <div className="my-2 border-t"></div>
            <StatRow label={(t ? t('contractorSpent') : 'Contractor Total Spent') + ' (' + (t ? t('contractorSpentFormula') : 'Packing Wage × TotalPackedBags + Bag Cost × PackedBags + Other Expenses') + ')'} value={formatLKR(results.contractorTotalSpent)} isNegative={false} />
            <StatRow
              label={(t ? t('contractorShare') : 'Contractor Share') + (results.expensePayment === 'owners' ? ` (${t ? t('contractorShareOwnersFormula') : 'InitialPrice/2 + Spent'})` : ` (${t ? t('contractorShareContractorFormula') : '(InitialPrice - Spent)/2'})`)}
              value={formatLKR(results.contractorShare)}
              isNegative={false}
            />
            <div className="my-2 border-t"></div>
            <StatRow
              label={(t ? t('grandTotalReceived') : 'Grand Total Received') + (results.expensePayment === 'owners' ? ` (${t ? t('grandTotalOwnersFormula') : 'InitialPrice - TotalLoan'})` : ` (${t ? t('grandTotalContractorFormula') : 'InitialPrice - Spent - TotalLoan'})`)}
              value={formatLKR(results.grandTotalReceived)}
              isNegative={false}
            />
            <StatRow
              label={(t ? t('ownerPool') : 'Owners Group Amount') + (results.expensePayment === 'owners' ? ` (${t ? t('ownerPoolOwnersFormula') : 'GrandTotal - ContractorShare'})` : ` (${t ? t('ownerPoolContractorFormula') : '(GrandTotal + TotalLoan)/2'})`)}
              value={formatLKR(results.ownerPool)}
              isNegative={results.highlights.ownerPoolNegative}
            />
            <StatRow label={isSingleOwner ? (t ? t('ownerPool') : 'Owners Group Amount') : (t ? (t('perOwnerShare') + ' (' + t('ownerPool') + '/2)') : 'Per Owner Share (Owners Group Amount/2)')} value={formatLKR(results.generalSharePerOwner)} isNegative={false} />
            <div className="my-2 border-t"></div>
            <StatRow label={t ? `${t('societyServiceCharge')} (${t('netBags')} × 100)` : 'Society Service Charge (Net Bags × 100)'} value={formatLKR(results.netBags * 100)} isNegative={false} />
            <StatRow label={t ? t('societyServiceReserved30') : 'Society Service Reserved 30%'} value={formatLKR((results.netBags * 100) * 0.30)} isNegative={false} />
          </div>
        </AccordionCard>

        {/* Final Results */}
        <AccordionCard 
          title={t ? t('finalResults') : 'Final Results'}
          bgColor="#f0fdf4"
          defaultOpen={false}
          icon="🥇"
        >
          <div className="space-y-4">
            <div className="android-card p-6 bg-sky-50 border border-sky-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-700">{owner1Name} - {t ? t('finalShare') : 'Final Share'}</span>
                {results.loanInaya > 0 && (
                  <span className="text-[11px] font-bold bg-sky-200 text-sky-800 px-3 py-1 rounded-full">{t ? t('loan') : 'Loan'}: {formatLKR(results.loanInaya)}</span>
                )}
              </div>
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
              <div className="android-card p-6 bg-emerald-50 border border-emerald-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-slate-700">{owner2Name} - {t ? t('finalShare') : 'Final Share'}</span>
                  {results.loanShakira > 0 && (
                    <span className="text-[11px] font-bold bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full">{t ? t('loan') : 'Loan'}: {formatLKR(results.loanShakira)}</span>
                  )}
                </div>
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
                <span className="text-sm font-bold text-slate-700">{t ? t('totalDistributed') : 'Total Distributed'}</span>
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
        </AccordionCard>
      </div>
    </div>
  )
}
