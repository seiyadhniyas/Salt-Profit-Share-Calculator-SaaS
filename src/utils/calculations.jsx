// Calculation utilities for Salt Profit Share Calculator

// Format helper: ensures numbers are finite and returns 0 otherwise
const safeNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Primary compute function. Takes an inputs object and returns an object
// with all intermediate and final values. Keeps raw values for
// highlighting and applies validation rules described in spec.
export function computeAll(inputs) {
  // parse inputs safely
  const packedBags = Math.max(0, Math.floor(safeNum(inputs.packedBags)))
  const deductedBags = Math.max(0, Math.floor(safeNum(inputs.deductedBags)))
  const pricePerBag = safeNum(inputs.pricePerBag)
  const cashReceived = safeNum(inputs.cashReceived)
  const chequeReceived = safeNum(inputs.chequeReceived)
  const packingFeePerBag = safeNum(inputs.packingFeePerBag)
  const bagCostPerUnit = safeNum(inputs.bagCostPerUnit)
  const otherExpenses = safeNum(inputs.otherExpenses)
  // extra expenses array: [{id, label, amount}]
  const extraExpenses = Array.isArray(inputs.extraExpenses) ? inputs.extraExpenses : []
  const extraExpensesTotal = extraExpenses.reduce((s, it) => s + safeNum(it.amount), 0)
  const totalOtherExpenses = otherExpenses + extraExpensesTotal
  const expensePayment = inputs.expensePayment || 'owners'
  const loanInaya = inputs.bothOwnersHaveLoans ? safeNum(inputs.loanInaya) : 0
  const loanShakira = inputs.bothOwnersHaveLoans ? safeNum(inputs.loanShakira) : 0

  // net bags
  const netBagsRaw = packedBags - deductedBags
  const netBags = Math.max(0, netBagsRaw)

  // initial price = net_bags * price_per_bag
  const initialPrice = netBags * pricePerBag

  // grand total received
  const grandTotalReceived = cashReceived + chequeReceived

  // contractor_total_spent
  // Use total packed bags for contractor per-bag wage/cost calculations as requested:
  // (Packing Wage × packedBags) + (Bag Cost × packedBags) + Other Expenses (if contractor pays)
  // Treat any missing/blank inputs as 0 via safeNum above.
  const contractorTotalSpent = (packingFeePerBag * packedBags) + (bagCostPerUnit * packedBags) + (expensePayment === 'contractor' ? totalOtherExpenses : 0)

  // contractor_share = (initial_price / 2) + contractor_total_spent
  const contractorShare = (initialPrice / 2) + contractorTotalSpent

  // owner_pool
  const ownerPool = grandTotalReceived - contractorShare

  // general_share_per_owner
  const generalSharePerOwner = ownerPool / 2

  // raw final shares
  let finalInayaRaw = generalSharePerOwner - loanInaya
  let finalShakiraRaw = generalSharePerOwner - loanShakira

  // Prevent negative values: if result < 0 -> show 0 (we'll clamp)
  let finalInaya = Math.max(0, finalInayaRaw)
  let finalShakira = Math.max(0, finalShakiraRaw)

  // Validation: ensure final_inaya + final_shakira == owner_pool
  // If mismatch, difference = owner_pool - (final_inaya + final_shakira)
  // Add difference to person with LOWER loan
  // Note: use loan values to decide; if equal, give to Inaya.
  const sumFinals = finalInaya + finalShakira
  const diff = ownerPool - sumFinals

  if (Math.abs(diff) > 0.0001) {
    // choose owner with lower loan (smaller number)
    const aLoan = loanInaya
    const bLoan = loanShakira
    if (aLoan <= bLoan) {
      finalInaya = Math.max(0, finalInaya + diff)
    } else {
      finalShakira = Math.max(0, finalShakira + diff)
    }
  }

  // Zakat: 5% of each final share (before zakat)
  const zakatInaya = finalInaya * 0.05
  const zakatShakira = finalShakira * 0.05
  const finalInayaAfterZakat = Math.max(0, finalInaya - zakatInaya)
  const finalShakiraAfterZakat = Math.max(0, finalShakira - zakatShakira)

  // Prepare flags for negative/raw highlighting (before clamp)
  const highlights = {
    ownerPoolNegative: ownerPool < 0,
    finalInayaNegative: finalInayaRaw < 0,
    finalShakiraNegative: finalShakiraRaw < 0,
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
    loanInaya: round2(loanInaya),
    loanShakira: round2(loanShakira),
    contractorTotalSpent: round2(contractorTotalSpent),
    contractorShare: round2(contractorShare),
    ownerPool: round2(ownerPool),
    generalSharePerOwner: round2(generalSharePerOwner),
    finalInaya: round2(finalInaya),
    finalShakira: round2(finalShakira),
    zakatInaya: round2(zakatInaya),
    zakatShakira: round2(zakatShakira),
    finalInayaAfterZakat: round2(finalInayaAfterZakat),
    finalShakiraAfterZakat: round2(finalShakiraAfterZakat),
    highlights,
  }
}

// currency format LKR 1,000.00
export function formatLKR(n) {
  const num = Number(n) || 0
  return `LKR ${num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
}
