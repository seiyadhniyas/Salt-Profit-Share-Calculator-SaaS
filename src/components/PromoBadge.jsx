import React from 'react'
import { formatLKR } from '../utils/calculations.jsx'

export default function PromoBadge({ promoInfo = {}, onClick }) {
  if (!promoInfo || Number(promoInfo.remaining || 0) <= 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-900 text-sm font-bold shadow-sm hover:bg-amber-100 transition"
      aria-label={`Promo: ${promoInfo.discountPercent}% off, ${promoInfo.remaining} spots left`}
    >
      <div className="flex flex-col leading-tight text-left">
        <span className="text-[10px] uppercase tracking-wider font-black">Promo</span>
        <span className="text-sm font-extrabold">{promoInfo.discountPercent}% off — {formatLKR(promoInfo.discountedPrice)}</span>
      </div>
      <div className="ml-2 inline-flex items-center justify-center bg-amber-600 text-white rounded-full w-7 h-7 text-xs font-black">
        {promoInfo.remaining}
      </div>
    </button>
  )
}
