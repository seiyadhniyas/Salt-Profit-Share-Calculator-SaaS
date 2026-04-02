import React, {useEffect, useState, useRef} from 'react'
import InputSection from './components/InputSection.jsx'
import ResultSection from './components/ResultSection.jsx'
import { computeAll, formatLKR } from './utils/calculations.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveReport, saveReportToSupabase } from './api/reports.js'

const STORAGE_KEY = 'salt_profit_share_last'

export default function App(){
  const defaultInputs = {
    packedBags: 0,
    deductedBags: 0,
    pricePerBag: 0,
    cashReceived: 0,
    chequeReceived: 0,
    packingFeePerBag: 0,
    bagCostPerUnit: 0,
    otherExpenses: 0,
    loanInaya: 0,
    loanShakira: 0,
    bothOwnersHaveLoans: false,
    extraExpenses: [],
  }

  const [inputs, setInputs] = useState(defaultInputs)
  const [results, setResults] = useState(null)
  const rootRef = useRef()
  const printRef = useRef()

  // load last from localStorage
  useEffect(()=>{
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if(raw){
        setInputs(JSON.parse(raw))
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // compute on every input change
  useEffect(()=>{
    const res = computeAll(inputs)
    setResults(res)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs)) } catch(e){}
  }, [inputs])

  const reset = () => {
    setInputs(defaultInputs)
    setResults(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch(e){}
  }

  const toggleLoans = (val) => {
    setInputs(prev => ({...prev, bothOwnersHaveLoans: !!val, loanInaya: prev.loanInaya || 0, loanShakira: prev.loanShakira || 0}))
  }

  const downloadPDF = async () => {
    const el = printRef.current || rootRef.current
    if(!el) return
    const canvas = await html2canvas(el, {scale: 2})
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgProps = pdf.getImageProperties(imgData)
    const imgWidth = pageWidth - 40
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width
    pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight)
    pdf.save('salt-profit-share.pdf')
  }

  const saveCurrentReport = async () => {
    if (!results) return alert('No results to save')
    try {
      const payload = { inputs, results }
      // try Supabase-backed function first
      const resp = await saveReportToSupabase(payload).catch(() => null)
      if (resp && resp.ok) {
        alert('Report saved to Supabase')
        return
      }

      // fallback to local function
      const resp2 = await saveReport(payload)
      if (resp2 && resp2.ok) {
        alert('Report saved (local demo)')
      } else {
        alert('Save failed')
      }
    } catch (e) {
      alert('Save error: ' + (e.message || e))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div ref={rootRef} className="container-max">
        <header className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-gray-800">Salt Profit Share Calculator</h1>
          <p className="text-md text-gray-600 mt-2">Financial calculator for owners and contractors</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InputSection inputs={inputs} setInput={setInputs} reset={reset} toggleLoans={toggleLoans} />
            {/* PDF button moved to bottom */}
          </div>

          <div>
            {results ? (
              <div className="shadow rounded-lg p-4" style={{ backgroundColor: '#f2d3ff' }}>
                <h3 className="text-lg font-bold text-gray-800 mb-3">Summary</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Bags:</span>
                    <strong className="text-gray-900">{results.netBags}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Initial Price:</span>
                    <strong className="text-gray-900">{formatLKR(results.initialPrice)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contractor Spent:</span>
                    <strong className="text-gray-900">{formatLKR(results.contractorTotalSpent)}</strong>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-gray-600">Contractor Share:</span>
                    <strong className="text-gray-900">{formatLKR(results.contractorShare)}</strong>
                  </div>
                  {/* Owner Pool removed from summary (shown in details) */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Per Owner Share:</span>
                    <strong className="text-gray-900">{formatLKR(results.generalSharePerOwner)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-4 text-center text-gray-500">
                Enter values to see summary
              </div>
            )}
          </div>
        </div>

        {results && <ResultSection results={results} />}

        {/* Hidden/off-screen printable area (captures Summary -> Final Results) */}
        {results && (
          <div id="print-area" ref={printRef} style={{ position: 'absolute', left: '-10000px', top: 0, padding: 20, background: '#fff' }}>
            <div style={{ maxWidth: 800 }}>
              <h2 style={{ fontSize: 22, marginBottom: 8 }}>Summary</h2>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>Net Bags:</div>
                  <div>{results.netBags}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>Initial Price:</div>
                  <div>{formatLKR(results.initialPrice)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>Contractor Spent:</div>
                  <div>{formatLKR(results.contractorTotalSpent)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <div>Contractor Share:</div>
                  <div>{formatLKR(results.contractorShare)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>Per Owner Share:</div>
                  <div>{formatLKR(results.generalSharePerOwner)}</div>
                </div>
              </div>
              <div style={{ height: 16 }}></div>
              <h2 style={{ fontSize: 22, marginBottom: 8 }}>Final Results</h2>
              <ResultSection results={results} />
            </div>
          </div>
        )}

        {/* Download button at page bottom */}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={downloadPDF} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded">
            📥 Download as PDF
          </button>
          <button onClick={saveCurrentReport} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded">
            💾 Save Report
          </button>
        </div>
      </div>
    </div>
  )
}
