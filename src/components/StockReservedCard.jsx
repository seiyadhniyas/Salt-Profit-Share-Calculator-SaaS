import React, { useState } from 'react'
import AccordionCard from './AccordionCard'

export default function StockReservedCard({
  stockReserved = {},
  onStockReservedChange,
  customLocations = [],
  onAddLocation,
  onSave,
  t,
  labourCostsTotal = 0,
  bagCostPerUnit = 0,
}) {
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [manualLocation, setManualLocation] = useState('')

  const selectedLocations = Array.isArray(stockReserved.selectedLocations) ? stockReserved.selectedLocations : []

  const handleAddLocation = (location) => {
    if (location && !selectedLocations.includes(location)) {
      const updatedLocations = [...selectedLocations, location]
      onStockReservedChange('selectedLocations', updatedLocations)
    }
  }

  const handleRemoveLocation = (location) => {
    const updatedLocations = selectedLocations.filter(l => l !== location)
    onStockReservedChange('selectedLocations', updatedLocations)
  }

  const handleAddManualLocation = () => {
    if (manualLocation.trim() && !customLocations.includes(manualLocation.trim())) {
      onAddLocation(manualLocation.trim())
      handleAddLocation(manualLocation.trim())
      setManualLocation('')
      setIsManualEntry(false)
    } else if (manualLocation.trim()) {
      handleAddLocation(manualLocation.trim())
      setManualLocation('')
      setIsManualEntry(false)
    }
  }

  const tr = (key, fallback) => (t ? t(key) : fallback)

  // Calculate total bags quantity based on unit
  const totalBagsQty = stockReserved.stockUnit === 'kg' 
    ? (Number(stockReserved.stockLevel) || 0) / 50 
    : (Number(stockReserved.stockLevel) || 0)

  const totalPackingCost = Number(labourCostsTotal || 0) + (Number(bagCostPerUnit || 0) * totalBagsQty)
  
  // Calculate total estimated price based on stock level and estimated price input
  const totalEstimatedPrice = (Number(stockReserved.stockLevel) || 0) * (Number(stockReserved.estimatedPrice) || 0)

  return (
    <AccordionCard
      title={tr('stockReserved', 'Stock Reserved')}
      icon={<span className="text-4xl">🏠</span>}
      bgColor="#eafdb6"
      defaultOpen={false}
    >
      <div className="space-y-4 mt-4">
        {/* Stock Level Section */}
        <div className="bg-white/50 p-4 rounded-[24px] border-2 border-amber-100">
          {/* Quantity - Unit Selector at Top */}
          <label className="block mb-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('quantityUnit', 'QUANTITY UNIT')}</div>
            <div className="relative">
              <select
                value={stockReserved.stockUnit || 'bags'}
                onChange={(e) => onStockReservedChange('stockUnit', e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 focus:border-slate-900 outline-none font-bold text-sm uppercase appearance-none cursor-pointer"
              >
                <option value="bags">{tr('bags', 'BAGS')}</option>
                <option value="kg">{tr('kg', 'KG')}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-6 text-slate-500 font-bold">
                ▼
              </div>
            </div>
          </label>

          {/* Stock Level Input */}
          <label className="block mb-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('stockLevel', 'STOCK LEVEL')}</div>
            <input
              type="number"
              step="any"
              min="0"
              value={stockReserved.stockLevel === '' ? '' : (stockReserved.stockLevel || 0)}
              onChange={(e) => onStockReservedChange('stockLevel', e.target.value)}
              placeholder={tr('stockLevelPlaceholder', '0')}
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none font-bold text-sm uppercase"
            />
            {stockReserved.stockUnit === 'kg' && stockReserved.stockLevel && (
              <div className="text-[10px] text-amber-600 font-bold mt-2">
                {tr('approxBagFormat', 'Approx {qty} bags (50kg/bag)').replace('{qty}', Math.ceil((Number(stockReserved.stockLevel) || 0) / 50))}
              </div>
            )}
          </label>

          {/* Estimated Price Input */}
          <label className="block">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('estimatedPriceLKR', 'ESTIMATED PRICE (LKR)')}</div>
            <input
              type="number"
              step="any"
              min="0"
              value={stockReserved.estimatedPrice === '' ? '' : (stockReserved.estimatedPrice || 0)}
              onChange={(e) => onStockReservedChange('estimatedPrice', e.target.value)}
              placeholder={tr('estimatedPricePlaceholder', '0.00')}
              className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none font-bold text-sm uppercase"
            />
          </label>
        </div>

        {/* Location Section */}
        <div className="bg-white/50 p-4 rounded-[24px] border-2 border-amber-100">
          <label className="block">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{tr('locationsMultiple', 'LOCATIONS (MULTIPLE)')}</div>
            
            {/* Location Dropdown */}
            {customLocations.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddLocation(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 focus:border-slate-900 outline-none appearance-none cursor-pointer font-bold text-sm uppercase"
                  >
                    <option value="">{tr('selectLocationToAdd', '+ SELECT LOCATION TO ADD...')}</option>
                    {customLocations.map(loc => (
                      <option key={loc} value={loc}>{loc.toUpperCase()}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-6 text-slate-500 font-bold">
                    ▼
                  </div>
                </div>
              </div>
            )}

            {/* Manual Entry */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setIsManualEntry(!isManualEntry)}
                className="text-[10px] text-amber-600 font-bold uppercase hover:text-amber-700 transition"
              >
                {isManualEntry ? tr('cancelManualEntry', '- CANCEL MANUAL ENTRY') : tr('addNewLocation', '+ OR ADD NEW LOCATION')}
              </button>

              {isManualEntry && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder={tr('enterLocationName', 'Enter location name')}
                    className="flex-1 bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none font-bold text-sm uppercase"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddManualLocation()}
                  />
                  <button
                    type="button"
                    onClick={handleAddManualLocation}
                    className="px-6 py-2 bg-amber-500 text-white font-bold rounded-[20px] hover:bg-amber-600 transition text-xs whitespace-nowrap"
                  >
                    {tr('add', 'ADD')}
                  </button>
                </div>
              )}
            </div>

            {/* Selected Locations Chips */}
            {selectedLocations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedLocations.map(location => (
                  <div
                    key={location}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-200 to-orange-200 px-4 py-2 rounded-full border border-amber-300 shadow-sm"
                  >
                    <span className="text-sm font-bold text-amber-900">{location.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(location)}
                      className="text-amber-600 hover:text-amber-700 font-bold text-lg leading-none transition hover:scale-125"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedLocations.length === 0 && customLocations.length === 0 && (
              <div className="text-[10px] text-slate-500 font-bold py-3">
                {tr('noLocationsAvailable', 'No locations available. Add locations in Dashboard.')}
              </div>
            )}
          </label>
        </div>

        {/* Date Range Section */}
        <div className="bg-white/50 p-4 rounded-[24px] border-2 border-amber-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('fromDate', 'FROM DATE')}</div>
              <input
                type="date"
                value={stockReserved.fromDate || ''}
                onChange={(e) => onStockReservedChange('fromDate', e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 focus:border-slate-900 outline-none font-bold text-sm"
              />
            </label>
            <label className="block">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{tr('toDate', 'TO DATE')}</div>
              <input
                type="date"
                value={stockReserved.toDate || ''}
                onChange={(e) => onStockReservedChange('toDate', e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-400 rounded-[28px] px-6 py-4 text-slate-900 focus:border-slate-900 outline-none font-bold text-sm"
              />
            </label>
          </div>
        </div>

        {/* Packing Cost Summary */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-4 rounded-[24px] border-2 border-amber-300">
          <div className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>💼 {tr('packingCostBreakdown', 'PACKING COST BREAKDOWN')} ({tr('fromLabourCard', 'from Labour Cost card')})</span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className="text-[10px] font-bold text-amber-800 uppercase">{tr('labourCost', 'Labour Cost')}</span>
              <span className="text-sm font-black text-amber-900">LKR {Number(labourCostsTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className="text-[10px] font-bold text-amber-800 uppercase">{tr('bagCostPerUnit', 'Plastic Bag Cost (LKR)')} × {totalBagsQty.toFixed(2)} {stockReserved.stockUnit === 'kg' ? tr('bagsFromKg', 'bags (kg÷50)') : tr('bags', 'bags')}</span>
              <span className="text-sm font-black text-amber-900">LKR {(Number(bagCostPerUnit || 0) * totalBagsQty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t-2 border-amber-300 pt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className="text-[10px] font-black text-amber-900 uppercase">{tr('totalPackingCost', 'TOTAL PACKING COST')}</span>
              <span className="text-lg font-black text-amber-900">LKR {totalPackingCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Stock Summary */}
        {stockReserved.stockLevel && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-[24px] border-2 border-blue-200">
            <div className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4">{tr('stockSummary', 'STOCK SUMMARY')}</div>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-[10px] font-bold text-blue-800 uppercase">{tr('stockLevel', 'Stock Level')}</span>
                <span className="text-base font-black text-blue-900">
                  {stockReserved.stockLevel} {stockReserved.stockUnit === 'kg' ? tr('kg', 'KG') : tr('bags', 'BAGS')}
                </span>
              </div>
              {selectedLocations.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                  <span className="text-[10px] font-bold text-blue-800 uppercase">{tr('locations', 'Locations')}</span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {selectedLocations.map(loc => (
                      <span key={loc} className="inline-block px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-xs font-bold">
                        {loc.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stockReserved.estimatedPrice && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-[10px] font-bold text-blue-800 uppercase">{tr('totalEstimatedPrice', 'Total Estimated Price')}</span>
                  <span className="text-base font-black text-blue-900">
                    LKR {totalEstimatedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {stockReserved.fromDate && stockReserved.toDate && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-[10px] font-bold text-blue-800 uppercase">{tr('period', 'Period')}</span>
                  <span className="text-sm font-black text-blue-900">
                    {new Date(stockReserved.fromDate).toLocaleDateString()} - {new Date(stockReserved.toDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black rounded-[28px] uppercase tracking-widest text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
        >
          💾 {tr('saveStockReserved', 'Save Stock Reserved')}
        </button>
      </div>
    </AccordionCard>
  )
}
