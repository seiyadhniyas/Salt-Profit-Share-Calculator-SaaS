import React, { useState, useEffect } from 'react'
import AccordionCard from './AccordionCard'
import StockReservedCard from './StockReservedCard'
import DisasterRecoveryCard from './DisasterRecoveryCard'

function NumberInput({ label, value, onChange, min = 0, step = 'any', name, decimals = 2, tooltip, disabled = false }) {
  const displayValue = value === 0 ? '' : (decimals !== null && typeof value === 'number' ? value.toFixed(decimals) : value)
  
  return (
    <label className="block mb-3">
      <div className="flex items-center gap-3 mb-2 ml-1">
        <div className={`text-sm font-semibold uppercase tracking-tight ${disabled ? 'text-slate-300' : 'text-slate-500'}`}>{label}</div>
        {tooltip && (
          <div className="relative group">
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-slate-300 border border-slate-200 rounded-full cursor-help hover:text-slate-500 transition">?</span>
            <div className="hidden group-hover:block absolute z-50 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 w-48 shadow-2xl leading-relaxed left-1/2 -translate-x-1/2 bottom-full mb-2 uppercase font-bold tracking-tighter">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <input
        name={name}
        type="number"
        step={step}
        min={min}
        value={displayValue}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        className={`w-full rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:ring-0 transition-all outline-none font-bold text-sm uppercase border-2 ${disabled ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-400 focus:border-slate-900'}`}
      />
    </label>
  )
}

export default function InputSection({ 
  inputs = {}, 
  setInput, 
  reset, 
  toggleLoans, 
  t, 
  lang, 
  setLang, 
  customLocations = [], 
  ownerNames = ['', ''], 
  ownerCount = 2, 
  stockReserved = {}, 
  setStockReserved, 
  stockSource = 'freshly-harvested', 
  setStockSource, 
  saveStockReserved, 
  results, 
  bagCostPerUnit, 
  activeModule, 
  recoveryPercentage, 
  setRecoveryPercentage, 
  contractorSharePercentage = 50,
  disasterRecovery: dashboardDisasterRecovery,
  setDisasterRecovery: setDashboardDisasterRecovery
}) {
  const contractorSectionDisabled = contractorSharePercentage === 0
  const isSingleOwner = ownerCount === 1
  const [cashReceivedManuallySet, setCashReceivedManuallySet] = useState(false)
  const [localDisasterRecovery, setLocalDisasterRecovery] = useState(dashboardDisasterRecovery || {})

  // Sync back to dashboard state periodically or when module closes
  useEffect(() => {
    if (setDashboardDisasterRecovery) {
      setDashboardDisasterRecovery(localDisasterRecovery)
    }
  }, [localDisasterRecovery, setDashboardDisasterRecovery])

  const onChange = (name, val) => {
    // Prevent changes to contractor expense fields when contractor share is 0%
    if (contractorSectionDisabled && ['packingFeePerBag', 'bagCostPerUnit', 'otherExpenses', 'expensePayment'].includes(name)) {
      return
    }
    if (typeof setInput === 'function') {
      setInput(prev => ({ ...prev, [name]: val }))
    }
    if (name === 'cashReceived' && val !== '') {
      setCashReceivedManuallySet(true)
    }
  }

  useEffect(() => {
    if (!cashReceivedManuallySet && typeof setInput === 'function') {
      const packedBags = Math.max(0, Math.floor(Number(inputs?.packedBags) || 0))
      const deductedBags = Math.max(0, Math.floor(Number(inputs?.deductedBags) || 0))
      const pricePerBag = Number(inputs?.pricePerBag) || 0
      const chequeReceived = Number(inputs?.chequeReceived) || 0

      if (packedBags > 0 && pricePerBag > 0) {
        const netBags = Math.max(0, packedBags - deductedBags)
        const initialPrice = netBags * pricePerBag
        const calculatedCash = initialPrice - chequeReceived
        const roundedCash = Math.round(Math.max(0, calculatedCash) * 100) / 100
        setInput(prev => ({ ...prev, cashReceived: roundedCash }))
      }
    }
  }, [inputs?.packedBags, inputs?.deductedBags, inputs?.pricePerBag, inputs?.chequeReceived, cashReceivedManuallySet, setInput])

  const addExpense = () => {
    const id = Date.now()
    const next = [...(inputs?.extraExpenses || []), { id, label: 'EXPENSE', amount: 0 }]
    if (typeof setInput === 'function') {
        setInput(prev => ({ ...prev, extraExpenses: next }))
    }
  }

  const updateExpense = (id, field, value) => {
    const next = (inputs?.extraExpenses || []).map(e => e.id === id ? { ...e, [field]: value } : e)
    if (typeof setInput === 'function') {
        setInput(prev => ({ ...prev, extraExpenses: next }))
    }
  }

  const removeExpense = (id) => {
    const next = (inputs?.extraExpenses || []).filter(e => e.id !== id)
    if (typeof setInput === 'function') {
        setInput(prev => ({ ...prev, extraExpenses: next }))
    }
  }

  const addLabourCost = () => {
    const id = Date.now()
    const next = [...(inputs?.labourCosts || []), { id, name: '', date: '', frequency: 'Weekly', amount: '' }]
    if (typeof setInput === 'function') {
        setInput(prev => ({ ...prev, labourCosts: next }))
    }
  }

  const updateLabourCost = (id, field, value) => {
    const next = (inputs?.labourCosts || []).map(l => l.id === id ? { ...l, [field]: value } : l)
    if (typeof setInput === 'function') {
        setInput(prev => ({ ...prev, labourCosts: next }))
    }
  }

  const removeLabourCost = (id) => {
    const next = (inputs?.labourCosts || []).filter(l => l.id !== id)
    if (typeof setInput === 'function') {
        setInput(prev => ({ ...prev, labourCosts: next }))
    }
  }

  // Advance payments to contractor: [{id, date, amount, reason}]
  const addAdvancePayment = () => {
    const id = Date.now()
    const next = [...(inputs?.advancePayments || []), { id, date: '', amountInaya: '', amountShakira: '', reason: '' }]
    if (typeof setInput === 'function') {
      setInput(prev => ({ ...prev, advancePayments: next }))
    }
  }

  const updateAdvancePayment = (id, field, value) => {
    const next = (inputs?.advancePayments || []).map(a => a.id === id ? { ...a, [field]: value } : a)
    if (typeof setInput === 'function') {
      setInput(prev => ({ ...prev, advancePayments: next }))
    }
  }

  const removeAdvancePayment = (id) => {
    const next = (inputs?.advancePayments || []).filter(a => a.id !== id)
    if (typeof setInput === 'function') {
      setInput(prev => ({ ...prev, advancePayments: next }))
    }
  }

  const resetRevenueAndExpenses = () => {
    if (typeof setInput === 'function') {
      setInput(prev => ({
        ...prev,
        packedBags: 0,
        deductedBags: 0,
        pricePerBag: 0,
        packingFeePerBag: 0,
        bagCostPerUnit: 0,
        otherExpenses: 0,
        cashReceived: 0,
        chequeReceived: 0,
        expensePayment: 'owners',
        extraExpenses: [],
        advancePayments: [],
        bothOwnersHaveLoans: false,
        loanInaya: 0,
        loanShakira: 0,
        freshAmount: 0,
        reservedAmount: 0
      }))
    }
    setCashReceivedManuallySet(false)
  }

  const resetLabourCosts = () => {
    if (typeof setInput === 'function') {
      setInput(prev => ({
        ...prev,
        labourCosts: []
      }))
    }
  }

  const resetDocumentDetails = () => {
    if (typeof setInput === 'function') {
      setInput(prev => ({
        ...prev,
        location: '',
        date: '',
        buyerName: '',
        billNumber: ''
      }))
    }
  }

  const resetStockReserved = () => {
    setStockReserved({
      selectedLocations: [],
      stockLevel: 0,
      stockUnit: 'bags',
      estimatedPrice: 0,
      fromDate: '',
      toDate: ''
    })
  }

  const resetDisasterRecovery = () => {
    setDisasterRecovery({
      lossQuantity: '',
      lossUnit: 'bags',
      pondsReconstruction: '',
      hutReconstruction: '',
      electricityBills: '',
      compensationReceived: '',
      donationsReceived: ''
    })
  }

  const tr = (k, f) => (t ? t(k) : f)

  return (
    <div className="space-y-4">
      {(activeModule === 'setup' || !activeModule) && (
      <AccordionCard 
        title={tr('documentDetails', 'REPORT METADATA')} 
        bgColor="#e0f2fe" 
        defaultOpen={false}
        onReset={resetDocumentDetails}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mt-2">
          <label className="block">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('locationDay', 'LOCATION')} <span className="text-rose-600">*</span></div>
            {Array.isArray(customLocations) && customLocations.length > 0 ? (
              <div className="relative">
                <select 
                  name="location" 
                  value={inputs?.location || '' } 
                  onChange={(e) => onChange('location', e.target.value)} 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 focus:border-slate-900 outline-none appearance-none cursor-pointer font-bold text-sm uppercase"
                >
                  <option value=''>{tr('selectLocation', 'SELECT...')}</option>
                  {customLocations.map(loc => (
                    <option key={loc} value={loc} className="uppercase font-bold">{loc.toUpperCase()}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-6 text-slate-500 font-bold">
                  ▼
                </div>
              </div>
            ) : (
              <input
                type="text"
                disabled
                placeholder="ADD LOCATIONS IN DASHBOARD"
                className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-300 cursor-not-allowed font-bold text-xs"
              />
            )}
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('date', 'DATE')} <span className="text-rose-600">*</span></div>
            <input
              type="date"
              value={inputs?.date || ''}
              onChange={(e) => onChange('date', e.target.value)}
              required
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 focus:border-slate-900 outline-none font-bold text-sm"
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('buyerName', 'BUYER NAME')}</div>
            <input
              type="text"
              value={inputs?.buyerName || ''}
              onChange={(e) => onChange('buyerName', e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none font-bold text-sm uppercase"
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('billNumber', 'BILL NO.')}</div>
            <input
              type="text"
              value={inputs?.billNumber || ''}
              onChange={(e) => onChange('billNumber', e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none font-bold text-sm uppercase"
            />
          </label>
        </div>
      </AccordionCard>
      )}

      {(activeModule === 'revenue' || activeModule === 'costs' || !activeModule) && (
      <AccordionCard 
        title={tr('inputData', 'REVENUE & EXPENSES')} 
        bgColor="#fefce8" 
        defaultOpen={false}
        icon="📝"
        onReset={resetRevenueAndExpenses}
      >
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
          {(activeModule === 'revenue' || !activeModule) && (
          <div className="space-y-6"> 
            <div className="bg-slate-50 p-4 lg:p-6 rounded-[28px] border-2 border-blue-100 mb-6">
              <div className="text-sm font-semibold text-blue-500 uppercase tracking-tight mb-4">{tr('stockSource', 'STOCK SOURCE')}</div>
              <div className="flex flex-col gap-3">
                {[
                  { id: 'freshly-harvested', label: tr('freshlyHarvested', 'Freshly harvested'), desc: tr('freshlyHarvestedDesc', 'New salt from harvest') },
                  { id: 'sold-reserved', label: tr('soldReservedStock', 'Sold reserved stock'), desc: tr('soldReservedStockDesc', 'From stored inventory') },
                  { id: 'mixed', label: tr('mixedStockReservedAndFresh', 'Mixed (reserved + fresh)'), desc: tr('mixedStockDesc', 'Combination of both') }
                ].map(opt => (
                  <label key={opt.id} className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="stockSource" 
                      value={opt.id} 
                      checked={stockSource === opt.id} 
                      onChange={(e) => setStockSource(e.target.value)} 
                      className="w-5 h-5 text-blue-600 focus:ring-0 border-2 border-slate-300 mt-0.5" 
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 tracking-tight transition-colors block normal-case font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-600 normal-case font-normal">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {(stockSource === 'sold-reserved' || stockSource === 'mixed') && (Array.isArray(stockReserved?.selectedLocations) && stockReserved?.selectedLocations.length > 0 && stockReserved?.stockLevel > 0) && (
                <div className="mt-4 p-3 bg-blue-100 rounded-lg border-l-4 border-blue-500">
                  <div className="text-[10px] font-bold text-blue-800">
                    Available Reserved: {stockReserved?.stockLevel || 0} {stockReserved?.stockUnit || 'bags'}
                  </div>
                  <div className="text-[9px] text-blue-700 mt-1">
                    Locations: {stockReserved?.selectedLocations.join(', ')}
                  </div>
                </div>
              )}
               {(stockSource === 'sold-reserved' || stockSource === 'mixed') && (
                (!Array.isArray(stockReserved?.selectedLocations) || stockReserved?.selectedLocations.length === 0 || !stockReserved?.stockLevel || stockReserved?.stockLevel <= 0) && (
                  <div className="mt-4 p-3 bg-yellow-100 rounded-lg border-l-4 border-yellow-500">
                    <div className="text-[10px] font-bold text-yellow-800">
                      ⚠️ No reserved stock available. Add details in 'Stock Reserved' card first.
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center gap-2 mb-2 p-3 bg-blue-50 rounded-2xl border-2 border-blue-100">
              <span className="text-xl">💵</span>
              <div className="text-base font-semibold text-blue-900 tracking-tight">{tr('totalCurrentSaltSale')}</div>
            </div>
            
            <NumberInput label={tr('totalSaltPackedBags', 'PACKED BAGS')} name="packedBags" value={inputs?.packedBags} onChange={onChange} decimals={null} />

            {stockSource === 'mixed' && (
              <div className="bg-indigo-50/50 p-4 rounded-3xl border-2 border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                <NumberInput 
                  label={tr('freshAmount', 'FRESH HARVEST AMOUNT (BAGS)')} 
                  name="freshAmount" 
                  value={inputs?.freshAmount} 
                  onChange={onChange} 
                  decimals={null} 
                />
                <NumberInput 
                  label={tr('reservedAmount', 'RESERVED STOCK AMOUNT (BAGS)')} 
                  name="reservedAmount" 
                  value={inputs?.reservedAmount} 
                  onChange={onChange} 
                  decimals={null} 
                />
              </div>
            )}

            <NumberInput label={tr('deductedBags', 'DEDUCTED BAGS')} name="deductedBags" value={inputs?.deductedBags} onChange={onChange} decimals={null} />
            <NumberInput label={tr('pricePerBag', 'PRICE PER BAG (LKR)')} name="pricePerBag" value={inputs?.pricePerBag} onChange={onChange} decimals={2} />
          </div>
          )}

          {(activeModule === 'costs' || !activeModule) && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2 p-3 bg-purple-50 rounded-2xl border-2 border-purple-100">
              <span className="text-xl">🏭</span>
              <div className="text-sm font-semibold text-purple-900 uppercase tracking-tight">{tr('contractorExpenses', 'OPERATIONAL COSTS')}</div>
            </div>
            
            <div className={`bg-slate-50 p-4 lg:p-6 rounded-[28px] border-2 border-slate-100 ${contractorSectionDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-4">{tr('costResponsibility')}</div>
              <div className="flex flex-col gap-4">
                {[
                  { id: 'owners', label: tr('expenseOwners', 'Owners responsibility') },
                  { id: 'contractor', label: tr('expenseContractor', 'Contractor responsibility') },
                  { id: 'shared5050', label: tr('expenseShared5050', '50/50 shared') }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="expensePayment" value={opt.id} checked={(inputs?.expensePayment || 'owners') === opt.id} onChange={(e) => onChange('expensePayment', e.target.value)} disabled={contractorSectionDisabled} className={`w-5 h-5 text-purple-600 focus:ring-0 border-2 border-slate-300 ${contractorSectionDisabled ? 'cursor-not-allowed opacity-50' : ''}`} />
                    <span className="text-sm text-slate-500 group-hover:text-slate-900 tracking-tight transition-colors normal-case font-semibold">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <NumberInput label={tr('packingFeePerBag', 'PACKING WAGE /BAG')} name="packingFeePerBag" value={inputs?.packingFeePerBag} onChange={onChange} decimals={2} disabled={contractorSectionDisabled} />
            <NumberInput label={tr('bagCostPerUnit', 'PLASTIC BAG COST')} name="bagCostPerUnit" value={inputs?.bagCostPerUnit} onChange={onChange} decimals={2} disabled={contractorSectionDisabled} />
            <NumberInput label={tr('otherExpenses', 'FIXED OVERHEADS')} name="otherExpenses" value={inputs?.otherExpenses} onChange={onChange} decimals={2} disabled={contractorSectionDisabled} />
            
            <button type="button" onClick={addExpense} disabled={contractorSectionDisabled} className={`w-full bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-[28px] px-6 py-4 text-slate-600 font-bold transition-all uppercase tracking-widest text-[10px] ${contractorSectionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {tr('addOperationalCost')}
            </button>

            {(inputs?.extraExpenses || []).length > 0 && (
              <div className={`space-y-3 ${contractorSectionDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                {(inputs?.extraExpenses || []).map(exp => (
                  <div key={exp.id} className="flex gap-2 p-4 bg-white border-2 border-slate-100 rounded-[24px]">
                    <input className="flex-1 bg-transparent text-[10px] font-black uppercase outline-none focus:text-purple-600" value={exp.label} onChange={(e) => updateExpense(exp.id, 'label', e.target.value.toUpperCase())} disabled={contractorSectionDisabled} />
                    <input type="number" step="any" className="w-24 bg-transparent text-[10px] font-black text-right outline-none" value={exp.amount === 0 ? '' : Number(exp.amount).toFixed(2)} onChange={(e) => updateExpense(exp.id, 'amount', e.target.value)} disabled={contractorSectionDisabled} />
                    <button type="button" onClick={() => removeExpense(exp.id)} disabled={contractorSectionDisabled} className={`text-rose-400 font-bold hover:scale-110 transition ${contractorSectionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Advance Payments Given to Contractor */}
            <div className="mt-4">
              <button type="button" onClick={addAdvancePayment} disabled={contractorSectionDisabled} className={`w-full bg-white border-2 border-dashed border-purple-200 rounded-[28px] px-6 py-4 text-purple-600 font-bold hover:bg-purple-50 transition-all uppercase tracking-widest text-[10px] ${contractorSectionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {tr('addAdvancePayment', 'ADD ADVANCE PAYMENT')}
              </button>

              {(inputs?.advancePayments || []).length === 0 ? (
                <div className="text-center py-4 text-slate-400 font-bold text-[10px]">
                  {tr('noAdvancePayments', 'No advance payments recorded')}
                </div>
              ) : (
                <div className={`space-y-3 mt-3 ${contractorSectionDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="text-[11px] font-bold text-slate-700 tracking-tight mb-1">{tr('advancePaymentsGiven', 'Contractor Advance Payment')}</div>
                  {(inputs?.advancePayments || []).map(entry => (
                    <div key={entry.id} className="bg-white p-3 rounded-xl border-2 border-slate-100 flex flex-col gap-2">
                      <div className="flex justify-end">
                        <button type="button" onClick={() => removeAdvancePayment(entry.id)} disabled={contractorSectionDisabled} className={`text-rose-400 hover:text-rose-600 font-bold transition ${contractorSectionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>✕</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <label className="block">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight mb-1">{tr('dateOfPayment', 'Date')}</div>
                          <input type="date" value={entry.date || ''} onChange={(e) => updateAdvancePayment(entry.id, 'date', e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-[10px] px-3 py-2 text-slate-900 outline-none text-xs" />
                        </label>

                        <label className="block">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight mb-1">{ownerNames && ownerNames[0] ? `${ownerNames[0]} (${t ? t('amount') : 'Amount'})` : `${t ? t('owner') : 'Owner'} 1 (${t ? t('amount') : 'Amount'})`}</div>
                          <input type="number" step="any" value={entry.amountInaya === 0 ? '' : entry.amountInaya} onChange={(e) => updateAdvancePayment(entry.id, 'amountInaya', e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-[10px] px-3 py-2 text-right text-slate-900 outline-none text-xs" />
                        </label>

                        {!isSingleOwner && (
                          <label className="block">
                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight mb-1">{ownerNames && ownerNames[1] ? `${ownerNames[1]} (${t ? t('amount') : 'Amount'})` : `${t ? t('owner') : 'Owner'} 2 (${t ? t('amount') : 'Amount'})`}</div>
                            <input type="number" step="any" value={entry.amountShakira === 0 ? '' : entry.amountShakira} onChange={(e) => updateAdvancePayment(entry.id, 'amountShakira', e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-[10px] px-3 py-2 text-right text-slate-900 outline-none text-xs" />
                          </label>
                        )}

                        <label className="block md:col-span-4">
                           <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight mb-1">{tr('reason', 'Reason')}</div>
                           <input type="text" value={entry.reason || ''} onChange={(e) => updateAdvancePayment(entry.id, 'reason', e.target.value)} placeholder={tr('advanceReasonPlaceholder', 'e.g., partial mobilization')} className="w-full bg-white border-2 border-slate-200 rounded-[10px] px-3 py-2 text-slate-900 outline-none text-xs" />
                         </label>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {(activeModule === 'revenue' || !activeModule) && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2 p-3 bg-emerald-50 rounded-2xl border-2 border-emerald-100">
               <span className="text-xl">💰</span>
               <div className="text-sm font-semibold text-emerald-900 uppercase tracking-tight">{tr('income', 'NET SETTLEMENT')}</div>
            </div>
            <NumberInput label={tr('cashReceived', 'PHYSICAL CASH (LKR)')} name="cashReceived" value={inputs?.cashReceived} onChange={onChange} decimals={2} tooltip={tr('cashAutoHint', 'This fills automatically, you may override it.')} />
            <NumberInput label={tr('chequeReceived', 'BANK CHEQUES (LKR)')} name="chequeReceived" value={inputs?.chequeReceived} onChange={onChange} decimals={2} />
            
            <div className={`mt-12 bg-indigo-50/50 rounded-[28px] border-2 border-indigo-100 transition-all duration-300 ${(inputs?.bothOwnersHaveLoans) ? 'p-6' : 'p-0 flex items-center min-h-[64px]'}`}>
              <div className="flex items-center gap-3 w-full mb-0 px-6 py-4">
                <input
                  id="toggleLoans"
                  type="checkbox"
                  checked={inputs?.bothOwnersHaveLoans || false}
                  onChange={(e) => toggleLoans(e.target.checked)}
                  className="h-5 w-5 text-indigo-600 rounded-lg border-2 border-indigo-200 focus:ring-0"
                />
                <label htmlFor="toggleLoans" className="text-sm font-semibold text-indigo-900 uppercase tracking-tight cursor-pointer">
                  {tr(isSingleOwner ? 'oneOwnerHasLoan' : 'bothOwnersHaveLoans', isSingleOwner ? 'OWNER HAS LOAN' : 'BOTH OWNERS HAVE LOANS')}
                </label>
              </div>
              {inputs?.bothOwnersHaveLoans && (
                <div className="space-y-4 max-h-96 overflow-hidden transition-all duration-300 px-6 pb-6">
                  <NumberInput label={`${tr('loan', 'LOAN')} (${ownerNames?.[0] || tr('owner', 'OWNER') + ' 1'})`} name="loanInaya" value={inputs?.loanInaya} onChange={onChange} decimals={2} />
                  {!isSingleOwner && (
                    <NumberInput label={`${tr('loan', 'LOAN')} (${ownerNames?.[1] || tr('owner', 'OWNER') + ' 2'})`} name="loanShakira" value={inputs?.loanShakira} onChange={onChange} decimals={2} />
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </AccordionCard>
      )}

      {(activeModule === 'inventory' || !activeModule) && (
      <div className="mt-4 flex flex-col items-center w-full">
        <div className="w-full max-w-full">
          <StockReservedCard
            stockReserved={stockReserved}
            onStockReservedChange={(field, val) => setStockReserved(prev => ({ ...prev, [field]: val }))}
            customLocations={customLocations}
            onAddLocation={(location) => setCustomLocations([...customLocations, location])}
            onSave={saveStockReserved}
            t={t}
            labourCostsTotal={results?.labourCostsTotal || 0}
            bagCostPerUnit={bagCostPerUnit}
            onReset={resetStockReserved}
          />
        </div>
      </div>
      )}

      {(activeModule === 'labour' || !activeModule) && (
      <AccordionCard 
        title={tr('labour', 'LABOUR DETAILS')} 
        bgColor="#ffe4ff" 
        defaultOpen={false}
        icon="👷"
        onReset={resetLabourCosts}
      >
        <div className="space-y-4">
          <button 
            type="button"
            onClick={addLabourCost} 
            className="w-full bg-white border-2 border-dashed border-purple-200 rounded-[28px] px-6 py-4 text-purple-600 font-bold hover:bg-purple-50 transition-all uppercase tracking-widest text-[10px]"
          >
            {tr('addLabourCostEntry', 'ADD LABOUR COST ENTRY')}
          </button>

          {(inputs?.labourCosts || []).length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              {tr('noRecordsInLabourLog', 'NO RECORDS IN LABOUR LOG')}
            </div>
          ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(inputs?.labourCosts || []).map(entry => (
                <div key={entry.id} className="bg-white/50 border-2 border-purple-100 rounded-[24px] p-4 flex flex-col gap-3">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => removeLabourCost(entry.id)} className="text-rose-400 hover:text-rose-600 font-bold transition">✕</button>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block">
                      <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('labourNameRole', 'Name / Role')}</div>
                      <input 
                        type="text" 
                        value={entry.name || ''} 
                        onChange={(e) => updateLabourCost(entry.id, 'name', e.target.value.toUpperCase())}
                        placeholder="..."
                        className="w-full bg-white border-2 border-slate-200 rounded-[20px] px-4 py-3 text-slate-900 focus:border-purple-500 outline-none font-bold text-xs uppercase"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('dateOfService', 'Date')}</div>
                        <input 
                          type="date" 
                          value={entry.date || ''} 
                          onChange={(e) => updateLabourCost(entry.id, 'date', e.target.value)}
                          className="w-full bg-white border-2 border-slate-200 rounded-[20px] px-4 py-3 text-slate-900 focus:border-purple-500 outline-none font-bold text-xs"
                        />
                      </label>

                      <label className="block">
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('paymentFrequency', 'Frequency')}</div>
                        <select 
                          value={entry.frequency || 'Weekly'} 
                          onChange={(e) => updateLabourCost(entry.id, 'frequency', e.target.value)}
                          className="w-full bg-white border-2 border-slate-200 rounded-[20px] px-4 py-3 text-slate-900 focus:border-purple-500 outline-none appearance-none font-bold text-xs"
                        >
                          <option value="Weekly">{tr('weekly', 'Weekly')}</option>
                          <option value="Fortnightly">{tr('fortnightly', 'Fortnightly')}</option>
                          <option value="Monthly">{tr('monthly', 'Monthly')}</option>
                          <option value="Yearly">{tr('yearly', 'Yearly')}</option>
                        </select>
                      </label>
                    </div>

                    <label className="block">
                      <div className="text-sm font-semibold text-slate-500 uppercase tracking-tight mb-2 ml-1">{tr('totalAmountLkr', 'Total Amount (LKR)')}</div>
                      <input 
                        type="number" 
                        step="any" 
                        value={entry.amount || ''} 
                        onChange={(e) => updateLabourCost(entry.id, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border-2 border-slate-200 rounded-[20px] px-4 py-3 text-slate-900 focus:border-purple-500 outline-none font-bold text-xs"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccordionCard>
      )}

      {(activeModule === 'disaster' || !activeModule) && (
      <AccordionCard 
        title={tr('disasterRecovery', 'Disaster Recovery')} 
        bgColor="#fce4ec" 
        defaultOpen={false}
        icon="🏘️"
        onReset={() => {
          const empty = {
            lossQuantity: '',
            lossUnit: 'bags',
            pondsReconstruction: '',
            hutReconstruction: '',
            electricityBills: '',
            compensationReceived: '',
            donationsReceived: ''
          };
          setLocalDisasterRecovery(empty);
          if (setDashboardDisasterRecovery) setDashboardDisasterRecovery(empty);
        }}
      >
        <DisasterRecoveryCard
          value={localDisasterRecovery}
          onChange={(field, val) => setLocalDisasterRecovery(prev => ({ ...prev, [field]: val }))}
          t={t}
        />
      </AccordionCard>
      )}
    </div>
  )
}
