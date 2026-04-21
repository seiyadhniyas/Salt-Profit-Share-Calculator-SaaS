import { describe, it, expect } from 'vitest'
import { computeAll } from './calculations.jsx'

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
