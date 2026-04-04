import React, {useEffect, useState, useRef} from 'react'
import InputSection from './components/InputSection.jsx'
import ResultSection from './components/ResultSection.jsx'
import DashboardSummary from './components/DashboardSummary.jsx'
import AuthModal from './components/AuthModal.jsx'
import { computeAll, formatLKR, formatKg } from './utils/calculations.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveReport, saveReportToSupabase, getReportsFromSupabase, getSavedFilesFromSupabase, savePdfFileToSupabase } from './api/reports.js'
import { useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient.js'

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
      pricePerBag: 'Salt Price per Bag (LKR)',
      cashReceived: 'Cash Received (LKR)',
      chequeReceived: 'Cheque Received (LKR)',
      contractorExpenses: 'Contractor Expenses',
      packingFeePerBag: 'pack wage per bag (LKR)',
      bagCostPerUnit: 'Plastic Bag Cost (LKR)',
      otherExpenses: 'Other Expenses (LKR)',
      otherExpensesReason: 'Other Expenses Reason',
      expenseResponsibility: 'Expense Responsibility',
      expenseOwners: 'Owners Pay Expenses',
      expenseContractor: 'Contractor Pays Expenses',
      addExpenses: '+ add expenses',
      remove: 'Remove',
      bothOwnersHaveLoans: 'Owners have loans',
      saltNetWeight: 'Salt Net Weight',
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
      ownerPool: 'Owners Group Amount',
      finalResults: 'Final Amount',
      inayaFinalShare: 'Inaaya Final Share',
      shakiraFinalShare: 'Shakira Final Share',
      totalDistributed: 'Total Distributed',
      productionSnapshot: 'Production Snapshot',
      latestNetBags: 'Latest Net Bags',
      latestSaltWeight: 'Latest Salt Weight',
      latestInitialPrice: 'Latest Initial Price',
      reportPeriod: 'Report Period',
      fromDate: 'From Date',
      toDate: 'To Date',
      clearFilter: 'Clear',
      pnlReport: 'P&L Report',
      grossSales: 'Gross Sales',
      totalExpenses: 'Operating Expenses',
      totalLoans: 'Loans',
      netProfit: 'Net Profit',
      noReportsInPeriod: 'No reports in this period.',
        enterValues: 'Enter values to see summary',
        toggleLoansHint: 'Toggle checkbox above to add loans',
        cashAutoHint: 'Auto-filled from Net Bags × Price per Bag; edit to override',
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
      locationDay: 'இடம்',
      date: 'தேதி',
      buyerName: 'வாங்குபவரின் பெயர்',
      billNumber: 'பில் எண்',
      inputData: 'உள்ளீட்டு தரவு',
      reset: '🔄 மீட்டமை',
      totalSaltPackedBags: 'மொத்த உப்பு நிரப்பப்பட்ட பைகள்',
      deductedBags: 'குறைவிடப்பட்ட பைகள்',
      pricePerBag: 'உப்பின் விலை (LKR)',
      cashReceived: 'பெற்ற பணம் (LKR)',
      chequeReceived: 'பெற்ற காசோலை (LKR)',
      contractorExpenses: 'ஒப்பந்ததாரரின் செலவுகள்',
      packingFeePerBag: 'ஒரு மூட்டைக்கான கூலி (LKR)',
      bagCostPerUnit: 'பிளாஸ்டிக் பையின் விலை (LKR)',
      otherExpenses: 'பிற செலவுகள் (LKR)',
      otherExpensesReason: 'பிற செலவுகளுக்கான காரணம்',
      expenseResponsibility: 'செலவு பொறுப்பு',
      expenseOwners: 'உரிமையாளர்கள் செலவுகளை செலுத்துகிறார்கள்',
      expenseContractor: 'ஒப்பந்ததாரர் செலவுகளை செலுத்துகிறார்',
      addExpenses: '+ செலவுகளை சேர்க்க',
      remove: 'அகற்று',
      bothOwnersHaveLoans: 'உரிமையாளர்களுக்கு கடன் உள்ளது',
      saltNetWeight: 'உப்பு நிகர எடை',
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
      ownerPool: 'உரிமையாளர்கள் குழு தொகை',
      finalResults: 'இறுதி தொகை',
      inayaFinalShare: 'இனாயா இறுதி பகுதி',
      shakiraFinalShare: 'ஷாக்கீரா இறுதி பகுதி',
      totalDistributed: 'மொத்த வீதம்',
      productionSnapshot: 'உற்பத்தி சுருக்கம்',
      latestNetBags: 'கடைசி நிகர பைகள்',
      latestSaltWeight: 'கடைசி உப்பு எடை',
      latestInitialPrice: 'கடைசி ஆரம்ப விலை',
      reportPeriod: 'அறிக்கை காலம்',
      fromDate: 'தொடக்க தேதி',
      toDate: 'முடிவு தேதி',
      clearFilter: 'அழி',
      pnlReport: 'இலாப / இழப்பு அறிக்கை',
      grossSales: 'மொத்த விற்பனை',
      totalExpenses: 'மொத்த செலவுகள்',
      totalLoans: 'கடன்கள்',
      netProfit: 'நிகர இலாபம்',
      noReportsInPeriod: 'இந்த காலத்தில் அறிக்கைகள் இல்லை.',
      extraExpenses: 'மேலும் செலவுகள்',
      toggleLoansHint: 'கடன்களைச் சேர்க்க மேல் குறிப்பு பெட்டியை அழுத்தவும்',
      cashAutoHint: 'நிகர பைகள் × ஒரு பையின் விலை மூலம் தானாக நிரப்பப்படுகிறது; மாற்ற வேண்டும் என்றால் மாற்றுங்கள்',
      locationLabel: 'இடம்',
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
  const [session, setSession] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportFromDate, setReportFromDate] = useState('')
  const [reportToDate, setReportToDate] = useState('')
  const rootRef = useRef()
  const printRef = useRef()
  const [reports, setReports] = useState([])
  const [savedFiles, setSavedFiles] = useState([])
  const isProdSupabase = isSupabaseConfigured && Boolean(supabase)

  const loadReports = useCallback(async (activeSession = session) => {
    if (isProdSupabase && !activeSession?.user?.id) {
      setReports([])
      return
    }

    try {
      const r = await getReportsFromSupabase(activeSession).catch(() => null)
      if (r && r.ok) {
        setReports(r.reports || [])
      } else if (!isProdSupabase) {
        // try fallback endpoint
        const fallbackUrl = activeSession?.user?.id
          ? `/.netlify/functions/getReportsSupabase?userId=${encodeURIComponent(activeSession.user.id)}`
          : '/.netlify/functions/getReports'
        const r2 = await fetch(fallbackUrl).then(res => res.json()).catch(() => null)
        if (r2 && r2.ok) setReports(r2.reports || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [session])

  const loadSavedFiles = useCallback(async (activeSession = session) => {
    if (isProdSupabase && !activeSession?.user?.id) {
      setSavedFiles([])
      return
    }

    try {
      const r = await getSavedFilesFromSupabase(activeSession).catch(() => null)
      if (r && r.ok) {
        setSavedFiles(r.files || [])
      } else {
        setSavedFiles([])
      }
    } catch (e) {
      console.error(e)
      setSavedFiles([])
    }
  }, [session])

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data?.session || null)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null)
      if (!nextSession) {
        setReports([])
      }
    })

    return () => {
      alive = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    loadReports(session)
    loadSavedFiles(session)
  }, [session, loadReports, loadSavedFiles])

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
    setInputs(prev => ({...prev, bothOwnersHaveLoans: !!val}))
  }

  const createPrintablePdfBlob = async () => {
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
    const pdfBlob = pdf.output('blob')
    return pdfBlob instanceof Blob ? pdfBlob : new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
  }

  const downloadPDF = async () => {
    const pdfBlob = await createPrintablePdfBlob()
    if (!pdfBlob) return
    const downloadUrl = URL.createObjectURL(pdfBlob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = 'salt-profit-share.pdf'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(downloadUrl)
  }

  const savePdfToStorage = async () => {
    if (!results) return alert('No results to save')
    if (isProdSupabase && !session?.user?.id) {
      handleOpenAuth('signin')
      return
    }

    try {
      const pdfBlob = await createPrintablePdfBlob()
      if (!pdfBlob) {
        alert('Could not create PDF')
        return
      }

      if (isProdSupabase) {
        const safeDate = inputs.date || new Date().toISOString().slice(0, 10)
        const safeBill = (inputs.billNumber || 'report').toString().replace(/[^a-zA-Z0-9-_]+/g, '-')
        const safeBuyer = (inputs.buyerName || 'buyer').toString().replace(/[^a-zA-Z0-9-_]+/g, '-')
        const fileName = `salt-profit-share-${safeDate}-${safeBill}-${safeBuyer}.pdf`
        const resp = await savePdfFileToSupabase({
          blob: pdfBlob,
          session,
          payload: { inputs, results },
          fileName,
        })
        if (resp && resp.ok) {
          alert('PDF saved to Supabase Storage')
          await loadSavedFiles(session)
          return
        }
        alert('PDF save failed')
        return
      }

      await downloadPDF()
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('auth')) {
        handleOpenAuth('signin')
        return
      }
      alert('PDF save error: ' + (e.message || e))
    }
  }

  const saveCurrentReport = async () => {
    if (!results) return alert('No results to save')
    if (isProdSupabase && !session?.user?.id) {
      handleOpenAuth('signin')
      return
    }

    try {
      const payload = { inputs, results }
      if (isProdSupabase) {
        const resp = await saveReportToSupabase(payload, session)
        if (resp && resp.ok) {
          alert('Report saved to Supabase')
          await loadReports(session)
          await loadSavedFiles(session)
          return
        }
        alert('Save failed')
        return
      }

      // local/demo fallback when Supabase is not configured
      const resp2 = await saveReport(payload)
      if (resp2 && resp2.ok) {
        alert('Report saved (local demo)')
      } else {
        alert('Save failed')
      }
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('auth')) {
        handleOpenAuth('signin')
        return
      }
      alert('Save error: ' + (e.message || e))
    }
  }

  const handleOpenAuth = (mode = 'signin') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setReports([])
    setSavedFiles([])
    setMenuOpen(false)
  }

  const loadAndApplyReport = (report) => {
    try {
      const payload = report.payload || (report.inserted && report.inserted[0] && report.inserted[0].payload) || report
      if (payload && payload.inputs) setInputs(prev => ({ ...prev, ...payload.inputs }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleLoadReportsClick = async () => {
    if (isProdSupabase && !session?.user?.id) {
      handleOpenAuth('signin')
      return
    }

    await loadReports(session)
  }

  const handleOpenSavedFile = (file) => {
    const url = file?.storage_url || null
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const getReportPayload = (report) => report?.payload || report?.inserted?.[0]?.payload || report || {}

  const getReportDate = (report) => {
    const payload = getReportPayload(report)
    const rawDate = payload?.inputs?.date || report?.created_at || payload?.created_at || null
    if (!rawDate) return null

    const parsed = rawDate.length === 10 ? new Date(`${rawDate}T00:00:00`) : new Date(rawDate)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const buildPnlMetrics = (report) => {
    const payload = getReportPayload(report)
    const inputs = payload.inputs || {}
    const results = payload.results || {}
    const packedBags = Number(inputs.packedBags) || 0
    const bagCostPerUnit = Number(inputs.bagCostPerUnit) || 0
    const packingFeePerBag = Number(inputs.packingFeePerBag) || 0
    const otherExpenses = Number(inputs.otherExpenses) || 0
    const extraExpensesTotal = Array.isArray(inputs.extraExpenses)
      ? inputs.extraExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : 0
    const totalOperatingExpenses = (packingFeePerBag * packedBags) + (bagCostPerUnit * packedBags) + otherExpenses + extraExpensesTotal
    const grossSales = Number(results.initialPrice) || 0
    const totalLoans = (Number(results.loanInaya) || 0) + (Number(results.loanShakira) || 0)
    const grossMargin = grossSales - totalOperatingExpenses
    const netProfit = grossMargin - totalLoans

    return {
      grossSales,
      totalOperatingExpenses,
      totalLoans,
      grossMargin,
      netProfit,
    }
  }

  const filteredReports = reports.filter((report) => {
    const reportDate = getReportDate(report)
    if (!reportDate) return false

    if (reportFromDate) {
      const from = new Date(`${reportFromDate}T00:00:00`)
      if (reportDate < from) return false
    }

    if (reportToDate) {
      const to = new Date(`${reportToDate}T23:59:59.999`)
      if (reportDate > to) return false
    }

    return true
  })

  const pnlSummary = filteredReports.reduce((summary, report) => {
    const metrics = buildPnlMetrics(report)
    summary.count += 1
    summary.grossSales += metrics.grossSales
    summary.totalOperatingExpenses += metrics.totalOperatingExpenses
    summary.totalLoans += metrics.totalLoans
    summary.grossMargin += metrics.grossMargin
    summary.netProfit += metrics.netProfit
    return summary
  }, {
    count: 0,
    grossSales: 0,
    totalOperatingExpenses: 0,
    totalLoans: 0,
    grossMargin: 0,
    netProfit: 0,
  })

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 ${lang === 'ta' ? 'text-xs lg:text-sm' : ''}`}>
      <div ref={rootRef} className="container-max">
        <header className="relative mb-6 rounded-3xl border border-white/70 bg-white/80 px-4 pb-5 pt-16 shadow-sm backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:right-6 sm:top-5"
            aria-label="Open dashboard menu"
          >
            <span className="text-lg leading-none">☰</span>
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-800 sm:text-4xl lg:text-5xl">
              {t('title')}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
              {t('subtitle')}
            </p>
          </div>
        </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InputSection inputs={inputs} setInput={setInputs} reset={reset} toggleLoans={toggleLoans} t={t} lang={lang} setLang={setLang} />
            {/* PDF button moved to bottom */}
          </div>

          <div>
            {results ? (
                <div className="shadow-xl rounded-2xl p-5" style={{ backgroundColor: '#f2d3ff' }}>
                <h3 className="text-lg font-bold text-gray-800 mb-3">{t('summary')}</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('netBags')}:</span>
                    <strong className="text-gray-900">{results.netBags}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('saltNetWeight')}:</span>
                    <strong className="text-gray-900">{formatKg(results.netBags * 50)}</strong>
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
          <div id="print-area" ref={printRef} style={{ position: 'absolute', left: '-10000px', top: 0, padding: '12pt 12pt', background: '#fff' }}>
            <style>{`
              #print-area { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.1; color: #000; }
              #print-area h1 { font-size: 13pt; margin: 0 0 8pt 0; font-weight: 700; text-align: center; }
              #print-area h2 { font-size: 11pt; margin: 4pt 0; font-weight: 700 }
              #print-area .section { margin-bottom: 6pt; }
              #print-area .row { display: flex; justify-content: space-between; gap: 8pt; margin-bottom: 2pt; }
              #print-area .muted { color: #444; font-size: 8.5pt }
              #print-area .value { font-weight: 700; font-size: 9pt }
            `}</style>
            <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '0' }}>
              <h1>{t('title')}</h1>
              <div style={{ width: '100%', maxWidth: 540, margin: '0 auto' }}>
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
                <div className="row"><div className="muted">{t('saltNetWeight')}</div><div className="value">{formatKg(results.netBags * 50)}</div></div>
                <div className="row"><div className="muted">{t('pricePerBag')}</div><div className="value">{formatLKR(inputs.pricePerBag)}</div></div>
                <div className="row"><div className="muted">{t('initialPrice')}</div><div className="value">{formatLKR(results.initialPrice)}</div></div>
                <div className="row"><div className="muted">{t('cashReceived')}</div><div className="value">{formatLKR(inputs.cashReceived)}</div></div>
                <div className="row"><div className="muted">{t('chequeReceived')}</div><div className="value">{formatLKR(inputs.chequeReceived)}</div></div>
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

                <div style={{ height: '6pt' }}></div>

                <div className="row"><div className="muted">{t('shakiraFinalShare')}</div><div className="value">{formatLKR(results.finalShakira)}</div></div>
                <div className="row"><div className="muted">{t('shakiraZakat')}</div><div className="value">{formatLKR(results.zakatShakira)}</div></div>
                <div className="row"><div className="muted">{t('shakiraAfterZakat')}</div><div className="value">{formatLKR(results.finalShakiraAfterZakat)}</div></div>

                <div className="row" style={{ borderTop: '1px solid #ddd', paddingTop: '4pt', marginTop: '8pt' }}>
                  <div className="muted">{t('totalDistributed')}</div>
                  <div className="value">{formatLKR(results.finalInaya + results.finalShakira)}</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Download button at page bottom */}
        <div className="mt-6 mb-8 flex flex-wrap justify-center gap-3 pb-4">
          <button onClick={downloadPDF} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded">
            {t('downloadPDF')}
          </button>
          <button onClick={savePdfToStorage} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded">
            ☁️ Save PDF
          </button>
          <button onClick={saveCurrentReport} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded">
            {t('save')}
          </button>
          <button onClick={handleLoadReportsClick} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded">
            {t('loadReports')}
          </button>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              aria-label="Close dashboard menu"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Menu</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">Member Dashboard</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Close
                </button>
              </div>
              <div className="p-4">
                <DashboardSummary
                  session={session}
                  reports={reports}
                  savedFiles={savedFiles}
                  filteredReports={filteredReports}
                  pnlSummary={pnlSummary}
                  reportFromDate={reportFromDate}
                  reportToDate={reportToDate}
                  onReportFromDateChange={setReportFromDate}
                  onReportToDateChange={setReportToDate}
                  onClearReportFilters={() => {
                    setReportFromDate('')
                    setReportToDate('')
                  }}
                  onOpenAuth={() => handleOpenAuth('signin')}
                  onSignOut={handleSignOut}
                  onLoadReport={loadAndApplyReport}
                  onLoadSavedFile={handleOpenSavedFile}
                />
              </div>
            </aside>
          </div>
        )}

        <AuthModal
          open={authModalOpen}
          mode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onModeChange={setAuthMode}
          onSuccess={() => setAuthModalOpen(false)}
        />
      </div>
    </div>
  )
}
