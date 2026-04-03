import React from 'react'
import { formatLKR } from '../utils/calculations.jsx'

function StatRow({label, value, isNegative}){
  // split bracketed part to allow responsive stacking
  const idx = label.indexOf('(')
  const hasBracket = idx !== -1
  const main = hasBracket ? label.slice(0, idx).trim() : label
  const sub = hasBracket ? label.slice(idx).trim() : ''

  return (
    <div className="py-2 px-3 rounded hover:bg-gray-50 transition">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <div className="text-sm text-gray-700">{main}</div>
          {hasBracket && (
            <div className="text-xs text-gray-500 mt-1 sm:mt-0">{sub}</div>
          )}
        </div>
        <div className={`mt-2 sm:mt-0 font-semibold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
      </div>
    </div>
  )
}

export default function ResultSection({results, t}){
  if(!results) return null

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detailed Breakdown */}
        <div className="shadow rounded-lg p-5" style={{ backgroundColor: '#fff0f0' }}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t ? t('calculationBreakdown') : 'Calculation Breakdown'}</h3>
          <div className="space-y-1">
            <StatRow label={t ? t('netBags') + ' (Packed - Deducted)' : 'Net Bags (Packed - Deducted)'} value={results.netBags} isNegative={false} />
            <StatRow label={(t ? t('initialPrice') : 'Initial Price') + ' (Net × Price/Bag)'} value={formatLKR(results.initialPrice)} isNegative={false} />
            <div className="my-2 border-t"></div>
            <StatRow label={(t ? t('contractorSpent') : 'Contractor Total Spent') + ' (Packing Fee × PackedBags + Bag Cost × PackedBags + Other Expenses)'} value={formatLKR(results.contractorTotalSpent)} isNegative={false} />
            <StatRow label={(t ? t('contractorShare') : 'Contractor Share') + ' (Initial/2 + Spent)'} value={formatLKR(results.contractorShare)} isNegative={false} />
            <div className="my-2 border-t"></div>
            <StatRow label={t ? t('grandTotalReceived') : 'Grand Total Received'} value={formatLKR(results.grandTotalReceived)} isNegative={false} />
            <StatRow label={t ? t('ownerPool') : 'Owners Group Amount'} value={formatLKR(results.ownerPool)} isNegative={results.highlights.ownerPoolNegative} />
            <StatRow label={t ? (t('perOwnerShare') + ' (Pool/2)') : 'General Share Per Owner (Pool/2)'} value={formatLKR(results.generalSharePerOwner)} isNegative={false} />
          </div>
        </div>

        {/* Final Results */}
        <div className="shadow rounded-lg p-5" style={{ backgroundColor: '#f7fff0' }}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t ? t('finalResults') : 'Final Results'}</h3>
          <div className="space-y-3">
            <div className="rounded-lg p-4" style={{ backgroundColor: '#b1ecff' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{t ? t('inayaFinalShare') : 'Inaya Final Share'}</span>
                {results.loanInaya > 0 && (
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Loan: {formatLKR(results.loanInaya)}</span>
                )}
              </div>
              <div className={`text-2xl font-bold ${results.highlights.finalInayaNegative ? 'text-red-600' : 'text-blue-600'}`}>
                {formatLKR(results.finalInaya)}
              </div>
              {results.highlights.finalInayaNegative && (
                <p className="text-xs text-red-600 mt-2">⚠️ Loss detected</p>
              )}
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: '#bcfaea' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{t ? t('shakiraFinalShare') : 'Shakira Final Share'}</span>
                {results.loanShakira > 0 && (
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Loan: {formatLKR(results.loanShakira)}</span>
                )}
              </div>
              <div className={`text-2xl font-bold ${results.highlights.finalShakiraNegative ? 'text-red-600' : 'text-green-600'}`}>
                {formatLKR(results.finalShakira)}
              </div>
              {results.highlights.finalShakiraNegative && (
                <p className="text-xs text-red-600 mt-2">⚠️ Loss detected</p>
              )}
            </div>

            <div className="rounded-lg p-3 mt-3" style={{ backgroundColor: '#ffc6b1' }}>
                <div className="flex justify-between">
                <span className="text-sm text-gray-700">{t ? t('totalDistributed') : 'Total Distributed'}</span>
                <strong className="text-gray-900">{formatLKR(results.finalInaya + results.finalShakira)}</strong>
              </div>
              <div className="my-2 border-t"></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-600">Inaya Zakat (5%)</div>
                  <div className="font-semibold">{formatLKR(results.zakatInaya)}</div>
                  <div className="text-xs text-gray-600 mt-1">After Zakat</div>
                  <div className="font-semibold">{formatLKR(results.finalInayaAfterZakat)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Shakira Zakat (5%)</div>
                  <div className="font-semibold">{formatLKR(results.zakatShakira)}</div>
                  <div className="text-xs text-gray-600 mt-1">After Zakat</div>
                  <div className="font-semibold">{formatLKR(results.finalShakiraAfterZakat)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
