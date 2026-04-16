export function validateModule(module, state = {}) {
  const {
    inputs = {},
    stockReserved = {},
    stockSource = 'freshly-harvested',
    ownerNames = [],
    ownerCount = 2
  } = state

  const issues = []

  const toNumber = (v) => {
    if (v === null || v === undefined || v === '') return NaN
    const n = Number(v)
    return Number.isFinite(n) ? n : NaN
  }

  const isNonEmptyStr = (s) => typeof s === 'string' && s.trim().length > 0

  switch (module) {
    case 'setup':
      if (!isNonEmptyStr(inputs?.location)) {
        issues.push({ type: 'error', messageKey: 'missing_location', fallback: 'Please select a Location.', fields: ['location'] })
      }
      if (!isNonEmptyStr(inputs?.date)) {
        issues.push({ type: 'error', messageKey: 'missing_date', fallback: 'Please enter a Date.', fields: ['date'] })
      }
      if (ownerCount > 0) {
        const filled = Array.isArray(ownerNames) ? ownerNames.filter(n => isNonEmptyStr(n)) : []
        if (filled.length < Math.min(ownerCount, 2)) {
          issues.push({ type: 'warning', messageKey: 'missing_owner_names', fallback: 'Add owner name(s) for the record.', fields: ['ownerNames'] })
        }
      }
      break

    case 'revenue': {
      const packedBags = toNumber(inputs?.packedBags)
      const deductedBags = toNumber(inputs?.deductedBags) || 0
      const netBags = Math.max(0, (Number.isFinite(packedBags) ? packedBags : 0) - (Number.isFinite(deductedBags) ? deductedBags : 0))
      const pricePerBag = toNumber(inputs?.pricePerBag) || 0

      if (!(packedBags > 0)) {
        issues.push({ type: 'error', messageKey: 'missing_packedBags', fallback: 'Enter total packed bags (must be > 0).', fields: ['packedBags'] })
      }
      if (!(pricePerBag > 0)) {
        issues.push({ type: 'error', messageKey: 'missing_pricePerBag', fallback: 'Enter price per bag (must be > 0).', fields: ['pricePerBag'] })
      }

      if (stockSource === 'mixed') {
        const fresh = toNumber(inputs?.freshAmount)
        const reservedAmt = toNumber(inputs?.reservedAmount)
        const freshOk = Number.isFinite(fresh)
        const reservedOk = Number.isFinite(reservedAmt)
        if (!freshOk || !reservedOk) {
          issues.push({ type: 'error', messageKey: 'missing_mixed_amounts', fallback: 'Provide both Fresh and Reserved amounts for Mixed stock.', fields: ['freshAmount', 'reservedAmount'] })
        } else {
          if (netBags > 0 && (fresh + reservedAmt) !== netBags) {
            issues.push({ type: 'warning', messageKey: 'mixed_sum_mismatch', fallback: 'Sum of Fresh + Reserved does not match Packed Bags.', fields: ['freshAmount', 'reservedAmount', 'packedBags'] })
          }
          const available = toNumber(stockReserved?.stockLevel)
          if (Number.isFinite(available) && reservedAmt > available) {
            issues.push({ type: 'warning', messageKey: 'reserved_exceeds_available', fallback: 'Reserved amount exceeds available reserved stock.', fields: ['reservedAmount'] })
          }
        }
      }

      if (stockSource === 'sold-reserved') {
        if (!Array.isArray(stockReserved?.selectedLocations) || stockReserved.selectedLocations.length === 0 || !(toNumber(stockReserved.stockLevel) > 0)) {
          issues.push({ type: 'error', messageKey: 'missing_reserved_stock', fallback: "No reserved stock available. Add details in 'Stock Reserved' card first.", fields: ['stockReserved'] })
        }
      }

      const chequeReceived = toNumber(inputs?.chequeReceived) || 0
      const cashReceived = toNumber(inputs?.cashReceived)
      const initialPrice = netBags * pricePerBag
      if (Number.isFinite(cashReceived) && cashReceived > initialPrice && initialPrice > 0) {
        issues.push({ type: 'warning', messageKey: 'invalid_cash_amount', fallback: 'Cash received exceeds calculated sale amount.', fields: ['cashReceived'] })
      }
      break
    }

    case 'costs': {
      const packingFee = toNumber(inputs?.packingFeePerBag)
      const bagCost = toNumber(inputs?.bagCostPerUnit)
      const otherExpenses = toNumber(inputs?.otherExpenses)

      if (!(packingFee > 0) && !(bagCost > 0) && !(otherExpenses > 0) && (!Array.isArray(inputs?.extraExpenses) || inputs.extraExpenses.length === 0)) {
        issues.push({ type: 'warning', messageKey: 'recommended_costs', fallback: 'Consider adding packing fee, bag cost, or other expenses for accurate results.' })
      }
      if (otherExpenses > 0 && !isNonEmptyStr(inputs?.otherExpensesReason)) {
        issues.push({ type: 'error', messageKey: 'missing_other_expense_reason', fallback: 'Provide a reason for Other Expenses.', fields: ['otherExpensesReason'] })
      }
      if (!['owners', 'contractor', 'shared5050'].includes(inputs?.expensePayment)) {
        issues.push({ type: 'warning', messageKey: 'invalid_expense_payment', fallback: 'Select expense responsibility.' })
      }
      break
    }

    case 'labour': {
      if (!Array.isArray(inputs?.labourCosts) || inputs.labourCosts.length === 0) {
        issues.push({ type: 'warning', messageKey: 'recommended_labour', fallback: 'No labour entries found. Add labour costs if applicable.' })
      } else {
        (inputs.labourCosts || []).forEach((l, idx) => {
          const amt = toNumber(l?.amount)
          if (!Number.isFinite(amt) || amt <= 0) {
            issues.push({ type: 'warning', messageKey: 'invalid_labour_amount', fallback: `Labour amount must be > 0 (entry ${idx + 1}).`, fields: [`labourCosts[${idx}].amount`] })
          }
          if (!isNonEmptyStr(l?.name)) {
            issues.push({ type: 'warning', messageKey: 'missing_labour_name', fallback: `Labour name is empty (entry ${idx + 1}).`, fields: [`labourCosts[${idx}].name`] })
          }
        })
      }
      break
    }

    case 'inventory': {
      if (!Array.isArray(stockReserved?.selectedLocations) || stockReserved.selectedLocations.length === 0 || !(toNumber(stockReserved.stockLevel) > 0)) {
        issues.push({ type: 'error', messageKey: 'missing_reserved_stock', fallback: "No reserved stock available. Add details in 'Stock Reserved' card first.", fields: ['stockReserved'] })
      }
      if (!(toNumber(stockReserved?.estimatedPrice) > 0)) {
        issues.push({ type: 'warning', messageKey: 'missing_estimated_price', fallback: 'Consider adding an estimated price for reserved stock.' })
      }
      break
    }

    case 'disaster': {
      const hasDR = toNumber(inputs?.pondsReconstruction) > 0 || toNumber(inputs?.hutReconstruction) > 0 || toNumber(inputs?.electricityBills) > 0 || toNumber(inputs?.compensationReceived) > 0 || toNumber(inputs?.donationsReceived) > 0
      if (hasDR && !isNonEmptyStr(inputs?.lossQuantity)) {
        issues.push({ type: 'error', messageKey: 'missing_loss_quantity', fallback: 'Provide loss quantity for disaster recovery entries.', fields: ['lossQuantity'] })
      }
      break
    }

    default:
      break
  }

  return issues
}

export default validateModule
