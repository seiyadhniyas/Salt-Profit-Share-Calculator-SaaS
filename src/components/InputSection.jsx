import React from 'react'

function NumberInput({ label, value, onChange, min = 0, step = 'any', name }) {
  return (
    <label className="block mb-3">
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      <input
        name={name}
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  )
}

export default function InputSection({ inputs, setInput, reset, toggleLoans }) {
  const onChange = (name, val) => setInput(prev => ({ ...prev, [name]: val }))

  const addExpense = () => {
    const id = Date.now()
    const next = [...(inputs.extraExpenses || []), { id, label: 'Expense', amount: 0 }]
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
      <div className="shadow rounded-lg p-4 mb-4" style={{ backgroundColor: '#ddfafe' }}>
        <h4 className="text-xl font-bold text-gray-800 mb-2">Document Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
            <input
              type="date"
              value={inputs.date || ''}
              onChange={(e) => onChange('date', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-700 mb-1">Buyer's Name</div>
            <input
              type="text"
              value={inputs.buyerName || ''}
              onChange={(e) => onChange('buyerName', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-700 mb-1">Bill Number</div>
            <input
              type="text"
              value={inputs.billNumber || ''}
              onChange={(e) => onChange('billNumber', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="bg-yellow-50 shadow rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Input Data</h3>
          <button
            onClick={reset}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm transition"
          >
            🔄 Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">📦 Production Details</h4>
            <NumberInput label="Salt Packed Bags" name="packedBags" value={inputs.packedBags} onChange={onChange} step="1" />
            <NumberInput label="Deducted Bags" name="deductedBags" value={inputs.deductedBags} onChange={onChange} step="1" />
            <NumberInput label="Price per Bag (LKR)" name="pricePerBag" value={inputs.pricePerBag} onChange={onChange} />
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">💰 Income</h4>
            <NumberInput label="Cash Received (LKR)" name="cashReceived" value={inputs.cashReceived} onChange={onChange} />
            <NumberInput label="Cheque Received (LKR)" name="chequeReceived" value={inputs.chequeReceived} onChange={onChange} />
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">🏭 Contractor Expenses</h4>
            <NumberInput label="Packing Fee per Bag (LKR)" name="packingFeePerBag" value={inputs.packingFeePerBag} onChange={onChange} />
            <NumberInput label="Plastic Bag Cost (LKR)" name="bagCostPerUnit" value={inputs.bagCostPerUnit} onChange={onChange} />
            <NumberInput label="Other Expenses (LKR) (state reason)" name="otherExpenses" value={inputs.otherExpenses} onChange={onChange} />
            <label className="block mb-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Other Expenses Reason</div>
              <input
                type="text"
                name="otherExpensesReason"
                value={inputs.otherExpensesReason || ''}
                onChange={(e) => onChange('otherExpensesReason', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                placeholder="Brief reason for other expenses"
              />
            </label>
            <div className="mt-2">
              <button type="button" onClick={addExpense} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-sm hover:bg-blue-100">
                + add expenses
              </button>
            </div>

            {(inputs.extraExpenses || []).length > 0 && (
              <div className="mt-3 space-y-2">
                {(inputs.extraExpenses || []).map(exp => (
                  <div key={exp.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" value={exp.label} onChange={(e) => updateExpense(exp.id, 'label', e.target.value)} />
                    <input type="number" step="any" className="w-full sm:w-28 border border-gray-300 rounded px-2 py-1 text-sm" value={exp.amount} onChange={(e) => updateExpense(exp.id, 'amount', e.target.value)} />
                    <button type="button" onClick={() => removeExpense(exp.id)} className="text-sm text-red-600">Remove</button>
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
              💳 Both owners have loans
            </label>
          </div>

          {inputs.bothOwnersHaveLoans && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput label="Loan (Inaya) - LKR" name="loanInaya" value={inputs.loanInaya} onChange={onChange} />
              <NumberInput label="Loan (Shakira) - LKR" name="loanShakira" value={inputs.loanShakira} onChange={onChange} />
            </div>
          )}

          {!inputs.bothOwnersHaveLoans && (
            <p className="text-sm text-gray-500">Toggle checkbox above to add loans</p>
          )}
        </div>
      </div>
    </>
  )
}
