import React, {useEffect, useState, useRef} from 'react'
import InputSection from './components/InputSection.jsx'
import ResultSection from './components/ResultSection.jsx'
import { computeAll, formatLKR } from './utils/calculations.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveReport, saveReportToSupabase, getReportsFromSupabase } from './api/reports.js'
import { useCallback } from 'react'

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
    otherExpensesReason: '',
    expensePayment: 'owners',
    location: 'puthoor-2',
    loanInaya: 0,
    loanShakira: 0,
    bothOwnersHaveLoans: false,
    extraExpenses: [],
  }

  const [lang, setLang] = useState('en')

  const translations = {
    en: {
      title: 'Salt Profit Share Calculator',
      subtitle: 'Financial calculator for owners and contractors',
      documentDetails: "Document Details",
      locationDay: 'Location',
      date: 'Date',
      buyerName: "Buyer's Name",
      billNumber: 'Bill Number',
      inputData: 'Input Data',
      reset: '🔄 Reset',
      totalSaltPackedBags: 'Total Salt Packed Bags',
      deductedBags: 'Deducted Bags',
      pricePerBag: 'Price per Bag (LKR)',
      cashReceived: 'Cash Received (LKR)',
      chequeReceived: 'Cheque Received (LKR)',
      contractorExpenses: 'Contractor Expenses',
      packingFeePerBag: 'Packing Fee per Bag (LKR)',
      bagCostPerUnit: 'Plastic Bag Cost (LKR)',
      otherExpenses: 'Other Expenses (LKR)',
      otherExpensesReason: 'Other Expenses Reason',
      expenseResponsibility: 'Expense Responsibility',
      expenseOwners: 'Owners Pay Expenses',
      expenseContractor: 'Contractor Pays Expenses',
      addExpenses: '+ add expenses',
      remove: 'Remove',
      bothOwnersHaveLoans: 'Both owners have loans',
      loanInaya: 'Loan (Inaya) - LKR',
      loanShakira: 'Loan (Shakira) - LKR',
      income: 'Income',
      downloadPDF: '📥 Download PDF',
      save: '💾 Save',
      loadReports: '📂 Load Reports',
      savedReports: 'Saved Reports',
      noReportsLoaded: 'No reports loaded.',
      summary: 'Summary',
      netBags: 'Net Bags',
      initialPrice: 'Initial Price',
      contractorSpent: 'Contractor Spent',
      contractorShare: 'Contractor Share',
      perOwnerShare: 'Per Owner Share',
      calculationBreakdown: 'Calculation Details',
      grandTotalReceived: 'Grand Total Received',
      ownerPool: 'Owner Pool (Received - Contractor)',
      finalResults: 'Final Amount',
      inayaFinalShare: 'Inaaya Final Share',
      shakiraFinalShare: 'Shakira Final Share',
      totalDistributed: 'Total Distributed',
        enterValues: 'Enter values to see summary',
        toggleLoansHint: 'Toggle checkbox above to add loans',
        extraExpenses: 'Extra Expenses',
      locationLabel: 'Location',
      load: 'Load',
      inayaZakat: 'Inaya Zakat (5%)',
      shakiraZakat: 'Shakira Zakat (5%)',
      inayaAfterZakat: 'Inaya After Zakat',
      shakiraAfterZakat: 'Shakira After Zakat',
    },
    ta: {
      title: 'உப்பு இலாப பகிர்வு கணக்கீடு',
      subtitle: 'உரிமையாளர்கள் மற்றும் ஒப்பந்ததாரர்களுக்கான நிதிக் கணக்கெழுத்து',
      documentDetails: 'ஆவண விவரங்கள்',
      locationDay: 'இலக்கம்',
      date: 'தேதி',
      buyerName: 'வாங்குபவரின் பெயர்',
      billNumber: 'பில் எண்',
      inputData: 'உள்ளீட்டு தரவு',
      reset: '🔄 மீட்டமை',
      totalSaltPackedBags: 'மொத்த உப்பு நிரப்பப்பட்ட பைகள்',
      deductedBags: 'குறைவிடப்பட்ட பைகள்',
      pricePerBag: 'ஒரு பையின் விலை (LKR)',
      cashReceived: 'பெற்ற பணம் (LKR)',
      chequeReceived: 'பெற்ற காசோலை (LKR)',
      contractorExpenses: 'ஒப்பந்ததாரரின் செலவுகள்',
      packingFeePerBag: 'ஒரு பையின் பொதியிடும் வசூல் (LKR)',
      bagCostPerUnit: 'பிளாஸ்டிக் பையின் விலை (LKR)',
      otherExpenses: 'பிற செலவுகள் (LKR)',
      otherExpensesReason: 'பிற செலவுகளுக்கான காரணம்',
      expenseResponsibility: 'செலவு பொறுப்பு',
      expenseOwners: 'உரிமையாளர்கள் செலவுகளை செலுத்துகிறார்கள்',
      expenseContractor: 'ஒப்பந்ததாரர் செலவுகளை செலுத்துகிறார்',
      addExpenses: '+ செலவுகளை சேர்க்க',
      remove: 'அகற்று',
      bothOwnersHaveLoans: 'இரு உரிமையாளர்களுக்கும் கடன் உள்ளது',
      loanInaya: 'கடன் (இனயா) - LKR',
      loanShakira: 'கடன் (ஷாக்கீரா) - LKR',
      income: 'வருவாய்',
      downloadPDF: '📥 PDF பதிவிறக்கு',
      save: '💾 சேமி',
      loadReports: '📂 பதிவேற்றப்பட்ட அறிக்கைகள்',
      savedReports: 'சேமிக்கப்பட்ட அறிக்கைகள்',
      noReportsLoaded: 'பதிவுகள் இல்லை.',
      summary: 'சுருக்கம்',
      netBags: 'நிகர பைகள்',
      initialPrice: 'ஆரம்ப விலை',
      contractorSpent: 'ஒப்பந்ததாரர் செலவிட்டது',
      contractorShare: 'ஒப்பந்ததாரர் பகுதி',
      perOwnerShare: 'ஒரு உரிமையாளருக்கான பகுதி',
      calculationBreakdown: 'கணக்கீட்டு விவரம்',
      grandTotalReceived: 'மொத்த பெறப்பட்ட தொகை',
      ownerPool: 'உரிமையாளர் குவிப்பு (பெறப்பட்டது - ஒப்பந்ததாரர்)',
      finalResults: 'இறுதி தொகை',
      inayaFinalShare: 'இனாயா இறுதி பகுதி',
      shakiraFinalShare: 'ஷாக்கீரா இறுதி பகுதி',
      totalDistributed: 'மொத்த வீதம்',
      extraExpenses: 'மேலும் செலவுகள்',
      toggleLoansHint: 'கடன்களைச் சேர்க்க மேல் குறிப்பு பெட்டியை அழுத்தவும்',
      locationLabel: 'இலக்கம்',
      load: 'ஏற்று',
      inayaZakat: 'இனாயாவின் ஜக்கத் (5%)',
      shakiraZakat: 'ஷாக்கீராவின் ஜக்கத் (5%)',
      inayaAfterZakat: 'ஜக்கத்திற்குப் பிறகு இனாயா',
      shakiraAfterZakat: 'ஜக்கத்திற்குப் பிறகு ஷாக்கீரா',
    }
  }

  const t = (key) => (translations[lang] && translations[lang][key]) || key

  const [inputs, setInputs] = useState(defaultInputs)
  const [results, setResults] = useState(null)
  const rootRef = useRef()
  const printRef = useRef()
  const [reports, setReports] = useState([])

  const loadReports = useCallback(async () => {
    try {
      const r = await getReportsFromSupabase().catch(() => null)
      if (r && r.ok) {
        setReports(r.reports || [])
      } else {
        // try fallback endpoint
        const r2 = await fetch('/.netlify/functions/getReports').then(res => res.json()).catch(() => null)
        if (r2 && r2.ok) setReports(r2.reports || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

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
    let imgWidth = pageWidth - 40
    let imgHeight = (imgProps.height * imgWidth) / imgProps.width
    const maxHeight = pageHeight - 40
    if (imgHeight > maxHeight) {
      const ratio = maxHeight / imgHeight
      imgHeight = imgHeight * ratio
      imgWidth = imgWidth * ratio
    }
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

  const loadAndApplyReport = (report) => {
    try {
      const payload = report.payload || (report.inserted && report.inserted[0] && report.inserted[0].payload) || report
      if (payload && payload.inputs) setInputs(prev => ({ ...prev, ...payload.inputs }))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 ${lang === 'ta' ? 'text-sm' : ''}`}>
      <div ref={rootRef} className="container-max">
        <header className="mb-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <h1 className="text-4xl font-bold text-gray-800">{t('title')}</h1>
          </div>
          <p className="text-md text-gray-600 mt-2">{t('subtitle')}</p>
        </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InputSection inputs={inputs} setInput={setInputs} reset={reset} toggleLoans={toggleLoans} t={t} lang={lang} setLang={setLang} />
            {/* PDF button moved to bottom */}
          </div>

          <div>
            {results ? (
              <div className="shadow rounded-lg p-4" style={{ backgroundColor: '#f2d3ff' }}>
                <h3 className="text-lg font-bold text-gray-800 mb-3">{t('summary')}</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('netBags')}:</span>
                    <strong className="text-gray-900">{results.netBags}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('initialPrice')}:</span>
                    <strong className="text-gray-900">{formatLKR(results.initialPrice)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('contractorSpent')}:</span>
                    <strong className="text-gray-900">{formatLKR(results.contractorTotalSpent)}</strong>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-gray-600">{t('contractorShare')}:</span>
                    <strong className="text-gray-900">{formatLKR(results.contractorShare)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('perOwnerShare')}:</span>
                    <strong className="text-gray-900">{formatLKR(results.generalSharePerOwner)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-4 text-center text-gray-500">
                {t('enterValues')}
              </div>
            )}
          </div>
        </div>

        {results && <ResultSection results={results} t={t} />}

        {/* Hidden/off-screen printable area (captures Summary -> Final Results) */}
        {results && (
          <div id="print-area" ref={printRef} style={{ position: 'absolute', left: '-10000px', top: 0, padding: 12, background: '#fff' }}>
            <style>{`
              #print-area { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.15; color: #000; }
              #print-area h2 { font-size: 14pt; margin: 6pt 0; font-weight: 700 }
              #print-area .section { margin-bottom: 8pt; }
              #print-area .row { display: flex; justify-content: space-between; gap: 8pt; margin-bottom: 4pt; }
              #print-area .muted { color: #444; font-size: 10.5pt }
              #print-area .value { font-weight: 700 }
            `}</style>
            <div style={{ width: '100%', maxWidth: 560 }}>
              <div className="section">
                <h2>{t('documentDetails')}</h2>
                <div className="row"><div className="muted">{t('locationLabel') || 'Location'}</div><div className="value">{inputs.location === 'puthoor-2' ? 'Puthoor 2 (N & S)' : inputs.location}</div></div>
                <div className="row"><div className="muted">{t('date')}</div><div className="value">{inputs.date || '-'}</div></div>
                <div className="row"><div className="muted">{t('buyerName')}</div><div className="value">{inputs.buyerName || '-'}</div></div>
                <div className="row"><div className="muted">{t('billNumber')}</div><div className="value">{inputs.billNumber || '-'}</div></div>
              </div>

                <div className="section">
                <h2>{t('summary')}</h2>
                <div className="row"><div className="muted">{t('netBags')}</div><div className="value">{results.netBags}</div></div>
                <div className="row"><div className="muted">{t('initialPrice')}</div><div className="value">{formatLKR(results.initialPrice)}</div></div>
                <div className="row"><div className="muted">{t('contractorSpent')}</div><div className="value">{formatLKR(results.contractorTotalSpent)}</div></div>
                <div className="row"><div className="muted">{t('otherExpensesReason')}</div><div className="value">{inputs.otherExpensesReason || '-'}</div></div>
                <div className="row"><div className="muted">{t('expenseResponsibility')}</div><div className="value">{(inputs.expensePayment === 'contractor') ? t('expenseContractor') : t('expenseOwners')}</div></div>
                {/* list manual extra expenses if any */}
                {(inputs.extraExpenses || []).length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div className="muted" style={{ marginBottom: 4 }}>{t('extraExpenses')}</div>
                    {(inputs.extraExpenses || []).map(e => (
                      <div key={e.id} className="row"><div className="muted">{e.label}</div><div className="value">{formatLKR(e.amount)}</div></div>
                    ))}
                  </div>
                )}
                <div className="row"><div className="muted">{t('contractorShare')}</div><div className="value">{formatLKR(results.contractorShare)}</div></div>
                <div className="row"><div className="muted">{t('perOwnerShare')}</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
              </div>

              <div className="section">
                <h2>{t('calculationBreakdown')}</h2>
                <div className="row"><div className="muted">{t('grandTotalReceived')}</div><div className="value">{formatLKR(results.grandTotalReceived)}</div></div>
                <div className="row"><div className="muted">{t('ownerPool')}</div><div className="value">{formatLKR(results.ownerPool)}</div></div>
                <div className="row"><div className="muted">{t('perOwnerShare')}</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
              </div>

              <div className="section">
                <h2>Total Distributed</h2>
                <div className="row"><div className="muted">{t('inayaFinalShare')}</div><div className="value">{formatLKR(results.finalInaya)}</div></div>
                <div className="row"><div className="muted">{t('inayaZakat')}</div><div className="value">{formatLKR(results.zakatInaya)}</div></div>
                <div className="row"><div className="muted">{t('inayaAfterZakat')}</div><div className="value">{formatLKR(results.finalInayaAfterZakat)}</div></div>

                <div style={{ height: 6 }}></div>

                <div className="row"><div className="muted">{t('shakiraFinalShare')}</div><div className="value">{formatLKR(results.finalShakira)}</div></div>
                <div className="row"><div className="muted">{t('shakiraZakat')}</div><div className="value">{formatLKR(results.zakatShakira)}</div></div>
                <div className="row"><div className="muted">{t('shakiraAfterZakat')}</div><div className="value">{formatLKR(results.finalShakiraAfterZakat)}</div></div>

                <div className="row" style={{ borderTop: '1px solid #ddd', paddingTop: 6 }}>
                  <div className="muted">{t('totalDistributed')}</div>
                  <div className="value">{formatLKR(results.finalInaya + results.finalShakira)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download button at page bottom */}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={downloadPDF} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded">
            {t('downloadPDF')}
          </button>
          <button onClick={saveCurrentReport} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded">
            {t('save')}
          </button>
          <button onClick={loadReports} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded">
            {t('loadReports')}
          </button>
        </div>

        {/* Reports list */}
        <div className="mt-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">{t('savedReports')}</h3>
            {reports.length === 0 ? (
              <div className="text-sm text-gray-500">{t('noReportsLoaded')}</div>
            ) : (
              <ul className="space-y-2">
                {reports.map(r => (
                  <li key={r.id || r.inserted?.[0]?.id || Math.random()} className="p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">ID: {r.id || (r.inserted && r.inserted[0] && r.inserted[0].id) || r.inserted?.[0]?.id}</div>
                        <div className="text-xs text-gray-600">{r.created_at || (r.inserted && r.inserted[0] && r.inserted[0].created_at) || ''}</div>
                        <div className="text-xs text-gray-700 mt-1">Date: {((r.payload && r.payload.inputs && r.payload.inputs.date) || (r.inserted && r.inserted[0] && r.inserted[0].payload && r.inserted[0].payload.inputs && r.inserted[0].payload.inputs.date) || '')}</div>
                        <div className="text-xs text-gray-700">Bill #: {((r.payload && r.payload.inputs && r.payload.inputs.billNumber) || (r.inserted && r.inserted[0] && r.inserted[0].payload && r.inserted[0].payload.inputs && r.inserted[0].payload.inputs.billNumber) || '')}</div>
                      </div>
                      <div>
                        <button onClick={() => loadAndApplyReport(r)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">{t('load')}</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
