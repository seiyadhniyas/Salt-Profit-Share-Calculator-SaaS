import { describe, it, expect } from 'vitest'
import { computeAll, deriveOwnerNetBags } from './calculations.jsx'

describe('computeAll basic scenarios (no formula changes)', () => {
  it('owners pay, simple 50/50 split', () => {
    const inputs = { packedBags: 100, deductedBags: 0, pricePerBag: 1000 }
    const res = computeAll(inputs, { contractorSharePercentage: 50, ownerCount: 2 })

    expect(res.initialPrice).toBeCloseTo(100000)
    expect(res.contractorShare).toBeCloseTo(50000)
    expect(res.finalInaya).toBeCloseTo(25000)
    expect(res.finalInayaAfterZakat).toBeCloseTo(23750)
  })

  it('contractor pays expenses, contractorShare 40%', () => {
    const inputs = {
      packedBags: 10,
      deductedBags: 0,
      pricePerBag: 2000,
      packingFeePerBag: 10,
      bagCostPerUnit: 5,
      expensePayment: 'contractor',
    }

    const res = computeAll(inputs, { contractorSharePercentage: 40, ownerCount: 2, stockSource: 'freshly-harvested' })

    // manual calculations based on current formulas
    // initialPrice = 2000 * 10 = 20000
    // contractorTotalSpent = (10*10)+(5*10) = 150
    // contractorShare = (initialPrice - spent) * 0.4 = 7940
    expect(res.initialPrice).toBeCloseTo(20000)
    expect(res.contractorTotalSpent).toBeCloseTo(150)
    expect(res.contractorShare).toBeCloseTo(7940)
    expect(res.contractorNetShare).toBeCloseTo(7940)
    expect(res.finalInaya).toBeCloseTo(5955)
    expect(res.finalInayaAfterZakat).toBeCloseTo(5657.25)
  })

  it('keeps both final owner shares positive across expense responsibility modes', () => {
    const baseInputs = {
      packedBags: 100,
      deductedBags: 0,
      pricePerBag: 1000,
      packingFeePerBag: 20,
      bagCostPerUnit: 10,
      otherExpenses: 2000,
      bothOwnersHaveLoans: false,
    }

    for (const expensePayment of ['owners', 'contractor', 'shared5050']) {
      const res = computeAll({ ...baseInputs, expensePayment }, { contractorSharePercentage: 50, ownerCount: 2 })
      expect(res.finalInaya).toBeGreaterThan(0)
      expect(res.finalShakira).toBeGreaterThan(0)
      expect(res.finalInaya).toBeCloseTo(res.finalShakira)
    }
  })

  it('applies each owner loan to their own final share without swapping values between owners', () => {
    const inputs = {
      packedBags: 100,
      deductedBags: 0,
      pricePerBag: 1000,
      packingFeePerBag: 20,
      bagCostPerUnit: 10,
      otherExpenses: 2000,
      expensePayment: 'contractor',
      loanInaya: 3000,
      loanShakira: 7000,
      bothOwnersHaveLoans: true,
    }

    const res = computeAll(inputs, { contractorSharePercentage: 50, ownerCount: 2 })

    expect(res.finalInaya).toBeCloseTo(21250)
    expect(res.finalShakira).toBeCloseTo(17250)
  })

  it('deducts each owner loan from their share in the owners-pay mode', () => {
    const inputs = {
      packedBags: 100,
      deductedBags: 0,
      pricePerBag: 1000,
      packingFeePerBag: 20,
      bagCostPerUnit: 10,
      otherExpenses: 2000,
      expensePayment: 'owners',
      loanInaya: 3000,
      loanShakira: 7000,
      bothOwnersHaveLoans: true,
    }

    const res = computeAll(inputs, { contractorSharePercentage: 50, ownerCount: 2 })

    expect(res.generalSharePerOwner).toBeCloseTo(17500)
    expect(res.finalInaya).toBeCloseTo(14500)
    expect(res.finalShakira).toBeCloseTo(10500)
  })

  it('calculates society service from each owner net bag reading', () => {
    const inputs = {
      packedBags: 100,
      deductedBags: 20,
      pricePerBag: 1000,
      owner1NetBags: 50,
      owner2NetBags: 30,
    }

    const res = computeAll(inputs, { contractorSharePercentage: 50, ownerCount: 2 })

    expect(res.netBags).toBe(80)
    expect(res.owner1NetBags).toBe(50)
    expect(res.owner2NetBags).toBe(30)
    expect(res.societyServiceCharge).toBe(8000)
    expect(res.societyServiceReserved30).toBe(2400)
    expect(res.societyServiceChargeOwner1).toBe(5000)
    expect(res.societyServiceChargeOwner2).toBe(3000)
    expect(res.societyServiceReserved30Owner1).toBe(1500)
    expect(res.societyServiceReserved30Owner2).toBe(900)
  })

  it('fills the remaining owner net bags from the total after deductions', () => {
    const next = deriveOwnerNetBags(100, 20, 50, null, 2)

    expect(next.netBags).toBe(80)
    expect(next.owner1NetBags).toBe(50)
    expect(next.owner2NetBags).toBe(30)
  })

  it('recalculates Owner 2 when Owner 1 changes', () => {
    const next = deriveOwnerNetBags(100, 0, 25, 50, 2)

    expect(next.owner1NetBags).toBe(25)
    expect(next.owner2NetBags).toBe(75)
  })

  it('reserved stock deduction (kg -> bags conversion)', () => {
    const inputs = { packedBags: 20, deductedBags: 0, pricePerBag: 500, reservedAmount: 0 }
    const stockReserved = { stockLevel: 100, stockUnit: 'kg' } // 100 kg -> 2 bags (50kg per bag)

    const res = computeAll(inputs, { stockSource: 'sold-reserved', stockReserved })

    // packedBags should be reduced by 2
    expect(res.packedBags).toBe(18)
    expect(res.reservedStockDeducted).toBe(2)
    expect(res.netBags).toBe(18)
    expect(res.initialPrice).toBeCloseTo(18 * 500)
  })
})
