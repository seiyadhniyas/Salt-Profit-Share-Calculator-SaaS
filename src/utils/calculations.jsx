// Calculation utilities for Salt Profit Share Calculator

// Format helper: ensures numbers are finite and returns 0 otherwise
const safeNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Primary compute function. Takes an inputs object and options, returns an object
// with all intermediate and final values. Keeps raw values for
// highlighting and applies validation rules described in spec.
// Options: { contractorSharePercentage: 0-100 } (default 50)
export function computeAll(inputs, options = {}) {
  const contractorSharePercentage = Math.max(0, Math.min(100, options?.contractorSharePercentage ?? 50))
  const ownerCount = options?.ownerCount === 1 ? 1 : 2
  const contractorShareFactor = contractorSharePercentage / 100
  const ownerShareFactor = 1 - contractorShareFactor
  
  // Stock source for rotation system
  const stockSource = options?.stockSource || 'freshly-harvested'
  const stockReserved = options?.stockReserved || {}
  
  // parse inputs safely
  let packedBags = Math.max(0, Math.floor(safeNum(inputs.packedBags)))
  const deductedBags = Math.max(0, Math.floor(safeNum(inputs.deductedBags)))
  const pricePerBag = safeNum(inputs.pricePerBag)
  const cashReceived = safeNum(inputs.cashReceived)
  const chequeReceived = safeNum(inputs.chequeReceived)
  const packingFeePerBag = safeNum(inputs.packingFeePerBag)
  const bagCostPerUnit = safeNum(inputs.bagCostPerUnit)
  const otherExpenses = safeNum(inputs.otherExpenses)
  
  // Stock source tracking - deduct from reserved if applicable
  let reservedStockDeducted = 0
  if (stockSource === 'sold-reserved' && stockReserved.stockLevel) {
    const reservedQty = stockReserved.stockUnit === 'kg' 
      ? (Number(stockReserved.stockLevel) || 0) / 50 
      : (Number(stockReserved.stockLevel) || 0)
    reservedStockDeducted = Math.min(packedBags, reservedQty)
    packedBags = Math.max(0, packedBags - reservedStockDeducted)
  } else if (stockSource === 'mixed' && stockReserved.stockLevel) {
    // For mixed, calculate how much is from reserved vs fresh (future enhancement)
    // For now, treat similar to sold-reserved
    const reservedQty = stockReserved.stockUnit === 'kg' 
      ? (Number(stockReserved.stockLevel) || 0) / 50 
      : (Number(stockReserved.stockLevel) || 0)
    reservedStockDeducted = Math.min(packedBags, reservedQty / 2) // Use 50% of reserved for mixed
  }
  
  // extra expenses array: [{id, label, amount}]
  const extraExpenses = Array.isArray(inputs.extraExpenses) ? inputs.extraExpenses : []
  const extraExpensesTotal = extraExpenses.reduce((s, it) => s + safeNum(it.amount), 0)
  const totalOtherExpenses = otherExpenses + extraExpensesTotal
  // labour costs array: [{id, name, date, frequency, amount}]
  const labourCosts = Array.isArray(inputs.labourCosts) ? inputs.labourCosts : []
  const labourCostsTotal = labourCosts.reduce((s, it) => s + safeNum(it.amount), 0)
  const expensePayment = inputs.expensePayment || 'owners'
  const is5050 = expensePayment === 'shared5050'
  const loanInaya = inputs.bothOwnersHaveLoans ? safeNum(inputs.loanInaya) : 0
  const loanShakira = (ownerCount === 2 && inputs.bothOwnersHaveLoans) ? safeNum(inputs.loanShakira) : 0

  // net bags
  const netBagsRaw = packedBags - deductedBags
  const netBags = Math.max(0, netBagsRaw)

  // initial price = net_bags * price_per_bag
  const initialPrice = netBags * pricePerBag

  // contractor_total_spent
  // If contractor share is 0%, all contractor expenses and shares should be zero
  let contractorTotalSpent = 0
  if (contractorSharePercentage > 0) {
    // Allow a manual override: if the user provides `contractorTotalSpentManual` then
    // use that value directly (treats contractor expenses as strictly user-controlled).
    // Otherwise compute from per-bag rates and other expenses as before.
    // IMPORTANT: Labour costs are ALWAYS added to contractor expenses (regardless of expense payment mode)
    contractorTotalSpent = (packingFeePerBag * packedBags) + (bagCostPerUnit * packedBags) + (expensePayment === 'owners' ? totalOtherExpenses : 0) + (is5050 ? totalOtherExpenses : 0) + labourCostsTotal
  }

  // total loan (sum of both owners' loans)
  const totalLoan = loanInaya + loanShakira

  // grand total received (conditional on expense payment responsibility)
  // Grand total received (conditional on expense payment responsibility)
  // If owners pay expenses: owners cover contractor expenses, so treat Grand Total
  // as InitialPrice minus TotalLoan (do not add/subtract contractor spent here).
  // If contractor pays expenses: subtract contractor spent and loans.
  // If 50/50: split expenses equally, so subtract full contractor spent from available pool.
  let grandTotalReceived = 0
  if (expensePayment === 'owners') {
    grandTotalReceived = initialPrice - totalLoan
  } else if (expensePayment === 'contractor') {
    grandTotalReceived = initialPrice - contractorTotalSpent - totalLoan
  } else if (is5050) {
    grandTotalReceived = initialPrice - contractorTotalSpent - totalLoan
  }

  // contractor_share
  // If owners pay expenses: contractor receives full contractor expenses plus contractor%
  // of the initial price -> contractor_share = (InitialPrice * contractorShareFactor) + Spent
  // If contractor pays expenses: contractor_share = (InitialPrice - Spent) * contractorShareFactor
  // If 50/50: contractor_share = (InitialPrice - Spent) * contractorShareFactor
  // Uses packedBags-based spent calculation defined above; blanks are treated as 0 via safeNum
  let contractorShare = 0
  if (contractorSharePercentage > 0) {
    if (expensePayment === 'owners') {
      contractorShare = (initialPrice * contractorShareFactor) + contractorTotalSpent
    } else if (expensePayment === 'contractor') {
      contractorShare = (initialPrice - contractorTotalSpent) * contractorShareFactor
    } else if (is5050) {
      contractorShare = (initialPrice - contractorTotalSpent) * contractorShareFactor
    }
  }

  // owner_pool (Owners Group Amount)
  // If owners pay expenses: ownerPool = grandTotalReceived - contractorShare
  // If contractor pays expenses: ownerPool = (grandTotalReceived + totalLoan) * ownerShareFactor
  // If 50/50: ownerPool = (InitialPrice - contractorTotalSpent) / 2 (equals contractorShare)
  let ownerPool = 0
  if (expensePayment === 'owners') {
    ownerPool = grandTotalReceived - contractorShare
  } else if (expensePayment === 'contractor') {
    ownerPool = (grandTotalReceived + totalLoan) * ownerShareFactor
  } else if (is5050) {
    ownerPool = (initialPrice - contractorTotalSpent) / 2
  }

  // general_share_per_owner
  const generalSharePerOwner = ownerPool / ownerCount

  // raw final shares
  // Owner Final Share = (Owners Group Amount / 2) - Own Loan
  let finalInayaRaw = generalSharePerOwner - loanInaya
  let finalShakiraRaw = ownerCount === 2 ? (generalSharePerOwner - loanShakira) : 0

  // Special handling for "Contractor Pays Expenses" only (not for 50/50 split)
  if (expensePayment === 'contractor' && !is5050) {
    if (ownerCount === 2) {
      finalInayaRaw += loanShakira
      finalShakiraRaw += loanInaya
    }
  }

  // Prevent negative values: if result < 0 -> show 0 (we'll clamp)
  let finalInaya = Math.max(0, finalInayaRaw)
  let finalShakira = ownerCount === 2 ? Math.max(0, finalShakiraRaw) : 0

  // Validation: ensure sum of distributions equals available funds
  // For "Contractor Pays Expenses" (non-50/50): finalInaya + finalShakira + contractorShare should equal (grandTotalReceived + totalLoan)
  // For 50/50 or other modes: finalInaya + finalShakira + contractorShare should equal grandTotalReceived
  const sumAll = finalInaya + (ownerCount === 2 ? finalShakira : 0) + contractorShare
  const expectedTotal = (expensePayment === 'contractor' && !is5050) ? (grandTotalReceived + totalLoan) : grandTotalReceived
  const totalDiff = expectedTotal - sumAll

  if (Math.abs(totalDiff) > 0.0001) {
    // Distribute the difference to the owner with LOWER loan
    const aLoan = loanInaya
    const bLoan = ownerCount === 2 ? loanShakira : Number.POSITIVE_INFINITY
    if (aLoan <= bLoan || ownerCount === 1) {
      finalInaya += totalDiff
    } else {
      finalShakira += totalDiff
    }
    // Clamp to prevent negative final shares
    finalInaya = Math.max(0, finalInaya)
    finalShakira = ownerCount === 2 ? Math.max(0, finalShakira) : 0
  }

  // Zakat: 5% of each final share (before zakat)
  const zakatInaya = finalInaya * 0.05
  const zakatShakira = ownerCount === 2 ? finalShakira * 0.05 : 0
  const finalInayaAfterZakat = Math.max(0, finalInaya - zakatInaya)
  const finalShakiraAfterZakat = ownerCount === 2 ? Math.max(0, finalShakira - zakatShakira) : 0

  // Prepare flags for negative/raw highlighting (before clamp)
  const highlights = {
    ownerPoolNegative: ownerPool < 0,
    finalInayaNegative: finalInayaRaw < 0,
    finalShakiraNegative: ownerCount === 2 ? finalShakiraRaw < 0 : false,
  }

  // Helper to round decimal values to 2 places (currency)
  const round2 = (v) => Math.round(v * 100) / 100

  return {
    packedBags,
    deductedBags,
    netBags,
    initialPrice: round2(initialPrice),
    cashReceived: round2(cashReceived),
    chequeReceived: round2(chequeReceived),
    grandTotalReceived: round2(grandTotalReceived),
    packingFeePerBag: round2(packingFeePerBag),
    bagCostPerUnit: round2(bagCostPerUnit),
    otherExpenses: round2(totalOtherExpenses),
    extraExpenses,
    extraExpensesTotal: round2(extraExpensesTotal),
    labourCosts,
    labourCostsTotal: round2(labourCostsTotal),
    loanInaya: round2(loanInaya),
    loanShakira: round2(loanShakira),
    contractorTotalSpent: round2(contractorTotalSpent),
    contractorShare: round2(contractorShare),
    ownerCount,
    expensePayment,
    ownerPool: round2(ownerPool),
    generalSharePerOwner: round2(generalSharePerOwner),
    finalInaya: round2(finalInaya),
    finalShakira: round2(finalShakira),
    zakatInaya: round2(zakatInaya),
    zakatShakira: round2(zakatShakira),
    finalInayaAfterZakat: round2(finalInayaAfterZakat),
    finalShakiraAfterZakat: round2(finalShakiraAfterZakat),
    highlights,
    stockSource,
    reservedStockDeducted: Math.round(reservedStockDeducted),
  }
}

// currency format LKR 1,000.00
export function formatLKR(n) {
  const num = Number(n) || 0
  return `LKR ${num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
}

// Format weight in kilograms with locale-aware separators and unit suffix
export function formatKg(value) {
  const num = Number(value) || 0
  const rounded = Math.round(num * 100) / 100
  const opts = Number.isInteger(rounded) ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return `${rounded.toLocaleString('en-US', opts)} kg`
}
