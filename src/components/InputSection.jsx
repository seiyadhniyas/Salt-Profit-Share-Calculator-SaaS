import React, { useState, useEffect } from 'react'
import AccordionCard from './AccordionCard'

function NumberInput({ label, value, onChange, min = 0, step = 'any', name, decimals = 2, tooltip }) {
  const displayValue = value === 0 ? '' : (decimals !== null && typeof value === 'number' ? value.toFixed(decimals) : value)
  
  return (
    <label className="block mb-3">
      <div className="flex items-center gap-3 mb-2 ml-1">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
        {tooltip && (
          <div className="relative group">
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-slate-300 border border-slate-200 rounded-full cursor-help hover:text-slate-500 transition">?</span>
            <div className="hidden group-hover:block absolute z-50 bg-slate-900 text-white text-[10px] rounded-lg px-3 py-2 w-48 shadow-2xl leading-relaxed left-1/2 -translate-x-1/2 bottom-full mb-2 uppercase font-bold tracking-tighter">
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
        className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none font-bold text-sm uppercase"
      />
    </label>
  )
}

export default function InputSection({ inputs, setInput, reset, toggleLoans, t, lang, setLang, customLocations = [], ownerNames = ['', ''], ownerCount = 2 }) {
  const isSingleOwner = ownerCount === 1
  const [cashReceivedManuallySet, setCashReceivedManuallySet] = useState(false)

  const onChange = (name, val) => {
    setInput(prev => ({ ...prev, [name]: val }))
    if (name === 'cashReceived' && val !== '') {
      setCashReceivedManuallySet(true)
    }
  }

  useEffect(() => {
    if (!cashReceivedManuallySet) {
      const packedBags = Math.max(0, Math.floor(Number(inputs.packedBags) || 0))
      const deductedBags = Math.max(0, Math.floor(Number(inputs.deductedBags) || 0))
      const pricePerBag = Number(inputs.pricePerBag) || 0
      const chequeReceived = Number(inputs.chequeReceived) || 0

      if (packedBags > 0 && pricePerBag > 0) {
        const netBags = Math.max(0, packedBags - deductedBags)
        const initialPrice = netBags * pricePerBag
        const calculatedCash = initialPrice - chequeReceived
        const roundedCash = Math.round(Math.max(0, calculatedCash) * 100) / 100
        setInput(prev => ({ ...prev, cashReceived: roundedCash }))
      }
    }
  }, [inputs.packedBags, inputs.deductedBags, inputs.pricePerBag, inputs.chequeReceived, cashReceivedManuallySet, setInput])

  const addExpense = () => {
    const id = Date.now()
    const next = [...(inputs.extraExpenses || []), { id, label: 'EXPENSE', amount: 0 }]
    setInput(prev => ({ ...prev, extraExpenses: next }))
  }

  const updateExpense = (id, field, value) => {
    const next = (inputs.extraExpenses || []).map(e => e.id === id ? { ...e, [field]: value } : e)
    setInput(prev => ({ ...prev, extraExpenses: next }))
  }

  const removeExpense = (id) => {
    const next = (inputs.extraExpenses || []).filter(e => e.id !== id)
    setInput(prev => ({ ...prev, extraExpenses: next }))
  }

  const addLabourCost = () => {
    const id = Date.now()
    // Do not prefill amount, let user enter manually
    const next = [...(inputs.labourCosts || []), { id, name: '', date: '', frequency: 'Weekly', amount: '' }]
    setInput(prev => ({ ...prev, labourCosts: next }))
  }

  const updateLabourCost = (id, field, value) => {
    const next = (inputs.labourCosts || []).map(l => l.id === id ? { ...l, [field]: value } : l)
    setInput(prev => ({ ...prev, labourCosts: next }))
  }

  const removeLabourCost = (id) => {
    const next = (inputs.labourCosts || []).filter(l => l.id !== id)
    setInput(prev => ({ ...prev, labourCosts: next }))
  }

  const tr = (k, f) => (t ? t(k) : f)

  return (
    <div className="space-y-4">
      <AccordionCard 
        title={tr('documentDetails', 'REPORT METADATA')} 
        bgColor="#e0f2fe" 
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          <label className="block">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('locationDay', 'LOCATION')}</div>
            {Array.isArray(customLocations) && customLocations.length > 0 ? (
              <div className="relative">
                <select 
                  name="location" 
                  value={inputs.location || '' } 
                  onChange={(e) => onChange('location', e.target.value)} 
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
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('date', 'DATE')}</div>
            <input
              type="date"
              value={inputs.date || ''}
              onChange={(e) => onChange('date', e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 focus:border-slate-900 outline-none font-bold text-sm"
            />
          </label>

          <label className="block">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('buyerName', 'BUYER NAME')}</div>
            <input
              type="text"
              value={inputs.buyerName || ''}
              onChange={(e) => onChange('buyerName', e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none font-bold text-sm uppercase"
            />
          </label>

          <label className="block">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('billNumber', 'BILL NO.')}</div>
            <input
              type="text"
              value={inputs.billNumber || ''}
              onChange={(e) => onChange('billNumber', e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none font-bold text-sm uppercase"
            />
          </label>
        </div>
      </AccordionCard>

      <AccordionCard 
        title={tr('inputData', 'REVENUE & EXPENSES')} 
        bgColor="#fefce8" 
        defaultOpen={false}
        icon="📝"
      >
        <div className="flex justify-end mb-6">
          <button
            onClick={reset}
            className="px-6 py-2 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
          >
            {tr('reset', 'RESET FORM')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2 p-3 bg-blue-50 rounded-2xl border-2 border-blue-100">
               <span className="text-xl">📦</span>
               <div className="text-xs font-black text-blue-900 uppercase tracking-widest">{tr('totalSaltPackedBags', 'SALT QUANTITY')}</div>
            </div>
            <NumberInput label={tr('totalSaltPackedBags', 'PACKED BAGS')} name="packedBags" value={inputs.packedBags} onChange={onChange} decimals={null} />
            <NumberInput label={tr('deductedBags', 'DEDUCTED BAGS')} name="deductedBags" value={inputs.deductedBags} onChange={onChange} decimals={null} />
            <NumberInput label={tr('pricePerBag', 'PRICE PER BAG (LKR)')} name="pricePerBag" value={inputs.pricePerBag} onChange={onChange} decimals={2} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2 p-3 bg-purple-50 rounded-2xl border-2 border-purple-100">
               <span className="text-xl">🏭</span>
               <div className="text-xs font-black text-purple-900 uppercase tracking-widest">{tr('contractorExpenses', 'OPERATIONAL COSTS')}</div>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-[28px] border-2 border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">COST RESPONSIBILITY</div>
              <div className="flex flex-col gap-4">
                {[
                  { id: 'owners', label: tr('expenseOwners', 'OWNERS RESPONSIBILITY') },
                  { id: 'contractor', label: tr('expenseContractor', 'CONTRACTOR RESPONSIBILITY') },
                  { id: 'shared5050', label: tr('expenseShared5050', '50/50 SHARED') }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="expensePayment" value={opt.id} checked={(inputs.expensePayment || 'owners') === opt.id} onChange={(e) => onChange('expensePayment', e.target.value)} className="w-5 h-5 text-purple-600 focus:ring-0 border-2 border-slate-300" />
                    <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-900 uppercase tracking-tighter transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <NumberInput label={tr('packingFeePerBag', 'PACKING WAGE /BAG')} name="packingFeePerBag" value={inputs.packingFeePerBag} onChange={onChange} decimals={2} />
            <NumberInput label={tr('bagCostPerUnit', 'PLASTIC BAG COST')} name="bagCostPerUnit" value={inputs.bagCostPerUnit} onChange={onChange} decimals={2} />
            <NumberInput label={tr('otherExpenses', 'FIXED OVERHEADS')} name="otherExpenses" value={inputs.otherExpenses} onChange={onChange} decimals={2} />
            
            <button type="button" onClick={addExpense} className="w-full bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-[28px] px-6 py-4 text-slate-600 font-bold transition-all uppercase tracking-widest text-[10px]">
              + ADD OPERATIONAL COST
            </button>

            {(inputs.extraExpenses || []).length > 0 && (
              <div className="space-y-3">
                {(inputs.extraExpenses || []).map(exp => (
                  <div key={exp.id} className="flex gap-2 p-4 bg-white border-2 border-slate-100 rounded-[24px]">
                    <input className="flex-1 bg-transparent text-[10px] font-black uppercase outline-none focus:text-purple-600" value={exp.label} onChange={(e) => updateExpense(exp.id, 'label', e.target.value.toUpperCase())} />
                    <input type="number" step="any" className="w-24 bg-transparent text-[10px] font-black text-right outline-none" value={exp.amount === 0 ? '' : Number(exp.amount).toFixed(2)} onChange={(e) => updateExpense(exp.id, 'amount', e.target.value)} />
                    <button type="button" onClick={() => removeExpense(exp.id)} className="text-rose-400 font-bold hover:scale-110 transition">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2 p-3 bg-emerald-50 rounded-2xl border-2 border-emerald-100">
               <span className="text-xl">💰</span>
               <div className="text-xs font-black text-emerald-900 uppercase tracking-widest">{tr('income', 'NET SETTLEMENT')}</div>
            </div>
            <NumberInput label={tr('cashReceived', 'PHYSICAL CASH (LKR)')} name="cashReceived" value={inputs.cashReceived} onChange={onChange} decimals={2} tooltip={tr('cashAutoHint', 'AUTO-CALCULATED FROM NET SALES; OVERRIDE IF NEEDED')} />
            <NumberInput label={tr('chequeReceived', 'BANK CHEQUES (LKR)')} name="chequeReceived" value={inputs.chequeReceived} onChange={onChange} decimals={2} />
            
            <div className="mt-12 bg-indigo-50/50 p-6 rounded-[28px] border-2 border-indigo-100">
               <div className="flex items-center gap-3 mb-4">
                <input
                  id="toggleLoans"
                  type="checkbox"
                  checked={inputs.bothOwnersHaveLoans}
                  onChange={(e) => toggleLoans(e.target.checked)}
                  className="h-5 w-5 text-indigo-600 rounded-lg border-2 border-indigo-200 focus:ring-0"
                />
                <label htmlFor="toggleLoans" className="text-[10px] font-black text-indigo-900 uppercase tracking-widest cursor-pointer">
                  {tr(isSingleOwner ? 'oneOwnerHasLoan' : 'bothOwnersHaveLoans', isSingleOwner ? 'OWNER HAS LOAN' : 'BOTH OWNERS HAVE LOANS')}
                </label>
              </div>

              {inputs.bothOwnersHaveLoans && (
                <div className="space-y-4">
                  <NumberInput label={`${tr('loan', 'LOAN')} (${ownerNames?.[0] || tr('owner', 'OWNER') + ' 1'})`} name="loanInaya" value={inputs.loanInaya} onChange={onChange} decimals={2} />
                  {!isSingleOwner && (
                    <NumberInput label={`${tr('loan', 'LOAN')} (${ownerNames?.[1] || tr('owner', 'OWNER') + ' 2'})`} name="loanShakira" value={inputs.loanShakira} onChange={onChange} decimals={2} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AccordionCard>

      <AccordionCard 
        title={tr('labourCosts', 'Labour Costs')} 
        bgColor="#eed3ff" 
        defaultOpen={false}
        icon="💼"
      >
        <div className="mb-6">
          <button 
            type="button" 
            onClick={addLabourCost} 
            className="w-full bg-white/40 hover:bg-white/60 border-2 border-dashed border-purple-300 rounded-[28px] px-6 py-5 text-purple-700 font-black transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] shadow-sm"
          >
            {tr('addLabourCostEntry', '+ ADD LABOUR COST ENTRY')}
          </button>
        </div>

        {(inputs.labourCosts || []).length > 0 && (
          <div className="space-y-4">
            {(inputs.labourCosts || []).map(labour => (
              <div key={labour.id} className="relative bg-white/50 border-2 border-purple-100 rounded-[28px] p-4 md:p-5 shadow-xl rounded-[28px] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => removeLabourCost(labour.id)}
                  className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-transform hover:rotate-90 shadow-sm font-bold z-10"
                  title="REMOVE"
                >
                  ✕
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <label className="block w-full">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('labourNameRole', 'Labour Name / Role')}</div>
                    <input
                      type="text"
                      value={labour.name || ''}
                      onChange={(e) => updateLabourCost(labour.id, 'name', e.target.value)}
                      placeholder="e.g., Master Worker"
                      className="w-full bg-slate-50/50 border-2 border-slate-400 rounded-[24px] px-4 py-4 text-slate-900 placeholder-slate-300 focus:border-slate-900 outline-none transition-all font-semibold text-sm"
                    />
                  </label>

                  <label className="block w-full">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('dateOfService', 'Date of Service')}</div>
                    <input
                      type="date"
                      value={labour.date || ''}
                      onChange={(e) => updateLabourCost(labour.id, 'date', e.target.value)}
                      className="w-full bg-slate-50/50 border-2 border-slate-400 rounded-[24px] px-4 py-4 text-slate-900 focus:border-slate-900 outline-none transition-all font-semibold text-sm"
                    />
                  </label>

                  <label className="block w-full">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('paymentFrequency', 'Payment Frequency')}</div>
                    <div className="relative w-full">
                      <select
                        value={labour.frequency || 'Weekly'}
                        onChange={(e) => updateLabourCost(labour.id, 'frequency', e.target.value)}
                        className="w-full bg-slate-50/50 border-2 border-slate-400 rounded-[24px] px-4 py-4 text-slate-900 focus:border-slate-900 outline-none transition-all appearance-none cursor-pointer font-semibold text-sm"
                      >
                        <option value="Weekly">{tr('weekly', 'Weekly')}</option>
                        <option value="Fortnightly">{tr('fortnightly', 'Fortnightly')}</option>
                        <option value="Monthly">{tr('monthly', 'Monthly')}</option>
                        <option value="Quarterly">{tr('quarterly', 'Quarterly')}</option>
                        <option value="Yearly">{tr('yearly', 'Yearly')}</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 text-xs">
                        ▼
                      </div>
                    </div>
                  </label>

                  <label className="block w-full">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('amount', 'Total Amount (LKR)')}</div>
                    <input
                      type="number"
                      step="any"
                      value={labour.amount === '' ? '' : labour.amount}
                      onChange={(e) => updateLabourCost(labour.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50/50 border-2 border-slate-400 rounded-[24px] px-4 py-4 text-slate-900 placeholder-slate-300 focus:border-slate-900 outline-none transition-all font-semibold text-sm"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {(inputs.labourCosts || []).length === 0 && (
          <div className="py-12 text-center">
             <div className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em] italic">{tr('noRecordsLabourLog', 'NO RECORDS IN LABOUR LOG')}</div>
          </div>
        )}
      </AccordionCard>
    </div>
  )
}