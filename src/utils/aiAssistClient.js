export function getLocalSuggestions(issues = [], lang = 'en') {
  const map = {
    missing_location: {
      en: 'Select a Location from the top-left picker or add a new location in the Dashboard.'
    },
    missing_date: { en: 'Choose the report Date. It is required.' },
    missing_packedBags: { en: 'Enter total packed bags (must be greater than 0).' },
    missing_pricePerBag: { en: 'Enter the price per bag (LKR) to compute totals.' },
    missing_reserved_stock: { en: "Add reserved stock details in 'Stock Reserved' card before selecting reserved stock." },
    missing_mixed_amounts: { en: 'Provide both Fresh and Reserved amounts when using Mixed stock.' },
    mixed_sum_mismatch: { en: 'Ensure Fresh + Reserved equals Packed Bags for accurate breakdown.' },
    reserved_exceeds_available: { en: 'Reserved amount exceeds available reserved stock. Adjust reserved amount or stock records.' },
    missing_other_expense_reason: { en: 'Add a reason for Other Expenses so records are auditable.' },
    recommended_costs: { en: 'Add packing fee, bag cost, or other expenses to improve accuracy.' },
    recommended_labour: { en: 'Consider adding labour entries if labour costs apply.' },
    missing_loss_quantity: { en: 'Provide loss quantity for disaster recovery entries.' }
  }

  return (issues || []).map(issue => {
    const r = map[issue.messageKey] || { en: issue.fallback || 'Address the reported issue.' }
    return { issue: issue.messageKey || null, suggestion: (r[lang] || r.en) }
  })
}

export default getLocalSuggestions
