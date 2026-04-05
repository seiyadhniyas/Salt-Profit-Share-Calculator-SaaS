import React from 'react'

export default function DisasterRecoveryCard({ value, onChange, t }) {
  const tr = (key, fallback) => (t ? t(key) : fallback)
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-xl mt-6">
      <div className="text-lg font-bold text-rose-900 mb-4 flex items-center gap-2">
        <span>🌊</span> {tr('disasterRecovery', 'Disaster Recovery Expenses')}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block mb-1 font-medium text-rose-900">{tr('lossQuantity', 'Loss Quantity of Salt')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={value.lossQuantity || ''}
              onChange={e => onChange('lossQuantity', e.target.value)}
              className="w-24 border border-gray-300 rounded px-3 py-2 text-base"
              placeholder={tr('lossQuantityPlaceholder', 'e.g. 100')}
            />
            <select
              value={value.lossUnit || 'bags'}
              onChange={e => onChange('lossUnit', e.target.value)}
              className="border border-gray-300 rounded px-2 py-2 text-base"
            >
              <option value="bags">{tr('bags', 'Bags')}</option>
              <option value="kg">{tr('kg', 'kg')}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block mb-1 font-medium text-rose-900">{tr('pondsReconstruction', 'Ponds Reconstruction (LKR)')}</label>
          <input
            type="number"
            min="0"
            value={value.pondsReconstruction || ''}
            onChange={e => onChange('pondsReconstruction', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
            placeholder={tr('pondsReconstructionPlaceholder', 'e.g. 50000')}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-rose-900">{tr('hutReconstruction', 'Hut Reconstruction (LKR)')}</label>
          <input
            type="number"
            min="0"
            value={value.hutReconstruction || ''}
            onChange={e => onChange('hutReconstruction', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
            placeholder={tr('hutReconstructionPlaceholder', 'e.g. 20000')}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-rose-900">{tr('electricityBills', 'Electricity Bills (LKR)')}</label>
          <input
            type="number"
            min="0"
            value={value.electricityBills || ''}
            onChange={e => onChange('electricityBills', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
            placeholder={tr('electricityBillsPlaceholder', 'e.g. 5000')}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-rose-900">{tr('compensationReceived', 'Compensation Received (LKR)')}</label>
          <input
            type="number"
            min="0"
            value={value.compensationReceived || ''}
            onChange={e => onChange('compensationReceived', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
            placeholder={tr('compensationReceivedPlaceholder', 'e.g. 10000')}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-rose-900">{tr('donationsReceived', 'Donations Received (LKR)')}</label>
          <input
            type="number"
            min="0"
            value={value.donationsReceived || ''}
            onChange={e => onChange('donationsReceived', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
            placeholder={tr('donationsReceivedPlaceholder', 'e.g. 5000')}
          />
        </div>
      </div>
    </div>
  )
}
