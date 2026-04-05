import React, { useState, useEffect } from 'react'

function NumberInput({ label, value, onChange, min = 0, step = 'any', name, decimals = 2 }) {
  // Format display to show specified decimal places
  const displayValue = value === 0 ? '' : (decimals !== null && typeof value === 'number' ? value.toFixed(decimals) : value)
  
  return (
    <label className="block mb-3">
      <div className="text-base font-medium text-gray-700 mb-1">{label}</div>
      <input
        name={name}
        type="number"
        step={step}
        min={min}
        value={displayValue}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  )
}

export default function InputSection({ inputs, setInput, reset, toggleLoans, t, lang, setLang, customLocations = [], ownerNames = ['', ''] }) {
  const [cashReceivedManuallySet, setCashReceivedManuallySet] = useState(false)

  const onChange = (name, val) => {
    setInput(prev => ({ ...prev, [name]: val }))
    // Track if user manually sets Cash Received so we don't override it
    if (name === 'cashReceived' && val !== '') {
      setCashReceivedManuallySet(true)
    }
  }

  // Auto-calculate Cash Received when packed bags, price, or cheque changes (if not manually set)
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
        // Round to 2 decimal places for currency
        const roundedCash = Math.round(Math.max(0, calculatedCash) * 100) / 100
        setInput(prev => ({ ...prev, cashReceived: roundedCash }))
      }
    }
  }, [inputs.packedBags, inputs.deductedBags, inputs.pricePerBag, inputs.chequeReceived, cashReceivedManuallySet, setInput])

  const addExpense = () => {
    const id = Date.now()
    const next = [...(inputs.extraExpenses || []), { id, label: t ? t('expenseItemDefaultLabel') : 'Expense', amount: 0 }]
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

  return (
    <>
      <div className="shadow-xl rounded-2xl p-5 mb-4" style={{ backgroundColor: '#ddfafe' }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xl font-bold text-gray-800">{t('documentDetails')}</h4>
          <div>
            <select value={lang} onChange={(e) => setLang && setLang(e.target.value)} className="border rounded px-2 py-1 text-sm font-medium" style={{ backgroundColor: '#fce4ec' }}>
              <option value="en">ENG</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-sm font-medium text-gray-700 mb-1">{t('locationDay')}</div>
            {Array.isArray(customLocations) && customLocations.length > 0 ? (
              <select name="location" value={inputs.location || ''} onChange={(e) => onChange('location', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-base">
                <option value="">{t ? t('selectLocation') : 'Select a location'}</option>
                {customLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value=""
                disabled
                placeholder={t ? t('addLandNameInDashboard') : 'Add land name in Dashboard'}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            )}
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-700 mb-1">{t('date')}</div>
            <input
              type="date"
              value={inputs.date || ''}
              onChange={(e) => onChange('date', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-base"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-700 mb-1">{t('buyerName')}</div>
            <input
              type="text"
              value={inputs.buyerName || ''}
              onChange={(e) => onChange('buyerName', e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-3 text-base"
              placeholder=""
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-700 mb-1">{t('billNumber')}</div>
            <input
              type="text"
              value={inputs.billNumber || ''}
              onChange={(e) => onChange('billNumber', e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-3 text-base"
              placeholder=""
            />
          </label>
        </div>
      </div>

      <div className="bg-yellow-50 shadow-xl rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">{t('inputData')}</h3>
          <button
            onClick={reset}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm transition"
          >
            {t('reset')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">📦 {t('totalSaltPackedBags')}</h4>
            <NumberInput label={t('totalSaltPackedBags')} name="packedBags" value={inputs.packedBags} onChange={onChange} step="1" decimals={null} />
            <NumberInput label={t('deductedBags') || 'Deducted Bags'} name="deductedBags" value={inputs.deductedBags} onChange={onChange} step="1" decimals={null} />
            <NumberInput label={t('pricePerBag') || 'Price per Bag (LKR)'} name="pricePerBag" value={inputs.pricePerBag} onChange={onChange} decimals={2} />
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">🏭 {t('contractorExpenses')}</h4>
            <NumberInput label={t('packingFeePerBag') || 'Packing Wage per Bag (LKR)'} name="packingFeePerBag" value={inputs.packingFeePerBag} onChange={onChange} decimals={2} />
            <NumberInput label={t('bagCostPerUnit') || 'Plastic Bag Cost (LKR)'} name="bagCostPerUnit" value={inputs.bagCostPerUnit} onChange={onChange} decimals={2} />
            <NumberInput label={t('otherExpenses') || 'Other Expenses (LKR)'} name="otherExpenses" value={inputs.otherExpenses} onChange={onChange} decimals={2} />
            <label className="block mb-3">
              <div className="text-sm font-medium text-gray-700 mb-1">{t('otherExpensesReason')}</div>
              <input
                type="text"
                name="otherExpensesReason"
                value={inputs.otherExpensesReason || ''}
                onChange={(e) => onChange('otherExpensesReason', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                placeholder={t ? t('otherExpensesReasonPlaceholder') : 'Brief reason for other expenses'}
              />
            </label>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">💰 {t('income')}</h4>
            <NumberInput label={t('cashReceived') || 'Cash Received (LKR)'} name="cashReceived" value={inputs.cashReceived} onChange={onChange} decimals={2} />
            <div className="text-xs text-gray-500 mt-1">{t ? t('cashAutoHint') : 'Auto-filled from Net Bags × Price per Bag; edit to override'}</div>
            <NumberInput label={t('chequeReceived') || 'Cheque Received (LKR)'} name="chequeReceived" value={inputs.chequeReceived} onChange={onChange} decimals={2} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="block mb-3">
              <div className="text-sm font-medium text-gray-700 mb-2">{t('expenseResponsibility')}</div>
              <div className="flex flex-col gap-3">
                <label className="inline-flex items-center">
                  <input type="radio" name="expensePayment" value="owners" checked={(inputs.expensePayment || 'owners') === 'owners'} onChange={(e) => onChange('expensePayment', e.target.value)} className="mr-2" />
                  <span className="text-sm">{t('expenseOwners')}</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="expensePayment" value="contractor" checked={(inputs.expensePayment || 'owners') === 'contractor'} onChange={(e) => onChange('expensePayment', e.target.value)} className="mr-2" />
                  <span className="text-sm">{t('expenseContractor')}</span>
                </label>
              </div>
            </div>
            <div className="mt-3">
              <button type="button" onClick={addExpense} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-sm hover:bg-blue-100 w-fit">
                {t('addExpenses')}
              </button>
            </div>

            {(inputs.extraExpenses || []).length > 0 && (
              <div className="mt-3 space-y-2">
                {(inputs.extraExpenses || []).map(exp => (
                  <div key={exp.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input className="flex-1 border border-gray-300 rounded px-3 py-2 text-base" value={exp.label} onChange={(e) => updateExpense(exp.id, 'label', e.target.value)} />
                    <input type="number" step="any" className="w-full sm:w-28 border border-gray-300 rounded px-3 py-2 text-base" value={exp.amount === 0 ? '' : Number(exp.amount).toFixed(2)} onChange={(e) => updateExpense(exp.id, 'amount', e.target.value)} />
                    <button type="button" onClick={() => removeExpense(exp.id)} className="text-sm text-red-600">{t('remove') || 'Remove'}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-3 mb-4">
            <input
              id="toggleLoans"
              type="checkbox"
              checked={inputs.bothOwnersHaveLoans}
              onChange={(e) => toggleLoans(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="toggleLoans" className="font-medium text-gray-700 cursor-pointer">
              💳 {t ? t('bothOwnersHaveLoans') : 'Both owners have loans'}
            </label>
          </div>

          {inputs.bothOwnersHaveLoans && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput label={`${t ? t('loan') : 'Loan'} (${ownerNames?.[0] || `${t ? t('owner') : 'Owner'} 1`}) - LKR`} name="loanInaya" value={inputs.loanInaya} onChange={onChange} decimals={2} />
              <NumberInput label={`${t ? t('loan') : 'Loan'} (${ownerNames?.[1] || `${t ? t('owner') : 'Owner'} 2`}) - LKR`} name="loanShakira" value={inputs.loanShakira} onChange={onChange} decimals={2} />
            </div>
          )}

          {!inputs.bothOwnersHaveLoans && (
            <p className="text-sm text-gray-500">{t ? t('toggleLoansHint') : 'Toggle checkbox above to add loans'}</p>
          )}
        </div>
      </div>
    </>
  )
}
