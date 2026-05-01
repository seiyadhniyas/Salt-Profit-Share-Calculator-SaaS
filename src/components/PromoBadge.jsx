import React from 'react'
import { formatLKR } from '../utils/calculations.jsx'

export default function PromoBadge({ promoInfo = {}, onClick }) {
  const remaining = Number(promoInfo?.remaining || 0)
  if (remaining <= 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-900 text-sm font-bold shadow-sm hover:bg-amber-100 transition max-w-full"
      aria-label={`Promo: ${promoInfo.discountPercent}% off, ${remaining} spots left`}
    >
      <span className="text-[11px] font-black">{promoInfo.discountPercent}%</span>
      <span className="text-sm font-extrabold truncate hidden sm:inline">{formatLKR(promoInfo.discountedPrice)}</span>
      <span className="text-sm font-extrabold sm:hidden">{formatLKR(promoInfo.discountedPrice)}</span>
      <div className="ml-2 inline-flex items-center justify-center bg-amber-600 text-white rounded-full w-6 h-6 text-xs font-black">{remaining}</div>
    </button>
  )
}
