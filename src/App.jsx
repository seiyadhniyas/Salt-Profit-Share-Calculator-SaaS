import React, {useEffect, useState, useRef} from 'react'
import InputSection from './components/InputSection.jsx'
import ResultSection from './components/ResultSection.jsx'
import { computeAll, formatLKR } from './utils/calculations.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  }

  const [inputs, setInputs] = useState(defaultInputs)
  const [results, setResults] = useState(null)
  const rootRef = useRef()

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
    if(!rootRef.current) return
    const el = rootRef.current
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
            <div className="flex gap-3 mt-4 flex-wrap">
              <button 
                onClick={downloadPDF} 
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition"
              >
                📥 Download as PDF
              </button>
            </div>
          </div>

          <div>
            {results ? (
              <div className="bg-white shadow rounded-lg p-4">
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">Owner Pool:</span>
                    <strong className={results.highlights.ownerPoolNegative ? 'text-red-600' : 'text-gray-900'}>
                      {formatLKR(results.ownerPool)}
                    </strong>
                  </div>
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
      </div>
    </div>
  )
}
