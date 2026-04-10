import React from 'react'

export default function DisasterRecoveryCard({ value, onChange, t }) {
  const tr = (key, fallback) => (t ? t(key) : fallback)
  
  const inputStyle = "w-full bg-white/50 border border-rose-200 rounded-[28px] px-6 py-4 text-slate-900 placeholder-rose-300 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none"
  const selectStyle = "bg-white/50 border border-rose-200 rounded-[28px] px-4 py-4 text-slate-900 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none appearance-none cursor-pointer"

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <label className="block mb-2 ml-1 text-sm font-bold text-rose-800 tracking-tight">{tr('lossQuantity', 'Loss Quantity of Salt')}</label>
        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            value={value.lossQuantity || ''}
            onChange={e => onChange('lossQuantity', e.target.value)}
            className="w-32 bg-white/50 border border-rose-200 rounded-[28px] px-6 py-4 text-slate-900 placeholder-rose-300 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none"
            placeholder={tr('lossQuantityPlaceholder', 'e.g. 100')}
          />
          <div className="relative flex-1">
            <select
              value={value.lossUnit || 'bags'}
              onChange={e => onChange('lossUnit', e.target.value)}
              className="bg-white/50 border border-rose-200 rounded-[28px] px-4 py-4 text-slate-900 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none appearance-none cursor-pointer w-full pr-10"
            >
              <option value="bags">{tr('bags', 'Bags')}</option>
              <option value="kg">{tr('kg', 'kg')}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-rose-400 text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>
      <div>
        <label className="block mb-2 ml-1 text-sm font-bold text-rose-800 tracking-tight">{tr('pondsReconstruction', 'Ponds Reconstruction (LKR)')}</label>
        <input
          type="number"
          min="0"
          value={value.pondsReconstruction || ''}
          onChange={e => onChange('pondsReconstruction', e.target.value)}
          className="w-full bg-white/50 border border-rose-200 rounded-[28px] px-6 py-4 text-slate-900 placeholder-rose-300 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none"
          placeholder={tr('pondsReconstructionPlaceholder', 'e.g. 50000')}
        />
      </div>
      <div>
        <label className="block mb-2 ml-1 text-sm font-bold text-rose-800 tracking-tight">{tr('hutReconstruction', 'Hut Reconstruction (LKR)')}</label>
        <input
          type="number"
          min="0"
          value={value.hutReconstruction || ''}
          onChange={e => onChange('hutReconstruction', e.target.value)}
          className="w-full bg-white/50 border border-rose-200 rounded-[28px] px-6 py-4 text-slate-900 placeholder-rose-300 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none"
          placeholder={tr('hutReconstructionPlaceholder', 'e.g. 20000')}
        />
      </div>
      <div>
        <label className="block mb-2 ml-1 text-sm font-bold text-rose-800 tracking-tight">{tr('electricityBills', 'Electricity Bills (LKR)')}</label>
        <input
          type="number"
          min="0"
          value={value.electricityBills || ''}
          onChange={e => onChange('electricityBills', e.target.value)}
          className="w-full bg-white/50 border border-rose-200 rounded-[28px] px-6 py-4 text-slate-900 placeholder-rose-300 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none"
          placeholder={tr('electricityBillsPlaceholder', 'e.g. 5000')}
        />
      </div>
      <div>
        <label className="block mb-2 ml-1 text-sm font-bold text-rose-800 tracking-tight">{tr('compensationReceived', 'Compensation Received (LKR)')}</label>
        <input
          type="number"
          min="0"
          value={value.compensationReceived || ''}
          onChange={e => onChange('compensationReceived', e.target.value)}
          className="w-full bg-white/50 border border-rose-200 rounded-[28px] px-6 py-4 text-slate-900 placeholder-rose-300 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none"
          placeholder={tr('compensationReceivedPlaceholder', 'e.g. 10000')}
        />
      </div>
      <div>
        <label className="block mb-2 ml-1 text-sm font-bold text-rose-800 tracking-tight">{tr('donationsReceived', 'Donations Received (LKR)')}</label>
        <input
          type="number"
          min="0"
          value={value.donationsReceived || ''}
          onChange={e => onChange('donationsReceived', e.target.value)}
          className="w-full bg-white/50 border border-rose-200 rounded-[28px] px-6 py-4 text-slate-900 placeholder-rose-300 ring-1 ring-inset ring-rose-100/50 focus:ring-2 focus:ring-inset focus:ring-rose-500 transition-all outline-none"
          placeholder={tr('donationsReceivedPlaceholder', 'e.g. 5000')}
        />
      </div>
    </div>
  )
}
