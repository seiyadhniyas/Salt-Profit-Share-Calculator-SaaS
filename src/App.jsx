import React, {useEffect, useState, useRef} from 'react'
import InputSection from './components/InputSection.jsx'
import DisasterRecoveryCard from './components/DisasterRecoveryCard.jsx'
import StockReservedCard from './components/StockReservedCard.jsx'
import ResultSection from './components/ResultSection.jsx'
import DashboardSummary from './components/DashboardSummary.jsx'
import AuthModal from './components/AuthModal.jsx'
import AdminAuthModal from './components/AdminAuthModal.jsx'
import { computeAll, formatLKR, formatKg } from './utils/calculations.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveReport, saveReportToSupabase, getReportsFromSupabase, getSavedFilesFromSupabase, savePdfFileToSupabase } from './api/reports.js'
import { saveStockReservedToSupabase } from './api/stockReserved.js'
import { getBillingStatus, consumeTrialUse, createStripeCheckoutSession, requestCashPayment, getAdminPendingPayments, activatePaymentRequestAsAdmin } from './api/billing.js'
import { useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient.js'
import TenantSwitcher from './components/TenantSwitcher.jsx'
import { createTenant, listTenantsForUser } from './api/tenants.js'
import { getUserRole, canEdit } from './api/roles.js'
import RedesignedHeader from './components/RedesignedHeader.jsx'
import BottomAccessMenu from './components/BottomAccessMenu.jsx'
import AccordionCard from './components/AccordionCard.jsx'

const STORAGE_KEY = 'salt_profit_share_last'

export default function App(){
  if (!isSupabaseConfigured || !supabase) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#1e293b' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>Supabase Not Configured</h1>
        <p style={{ fontSize: 18, maxWidth: 480, textAlign: 'center' }}>
          Please set your Supabase credentials in a <code>.env</code> file at the project root.<br />
          Example:<br />
          <code>VITE_SUPABASE_URL=...</code><br />
          <code>VITE_SUPABASE_ANON_KEY=...</code>
        </p>
        <p style={{ marginTop: 32, color: '#ef4444', fontWeight: 600 }}>
          The app cannot function without these values.<br />
          See <a href="https://supabase.com/docs/guides/getting-started" target="_blank" rel="noopener noreferrer">Supabase Docs</a> for help.
        </p>
      </div>
    )
  }
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
    location: '',
    loanInaya: 0,
    loanShakira: 0,
    bothOwnersHaveLoans: false,
    extraExpenses: [],
    labourCosts: [],
  }

  const [lang, setLang] = useState('en')
  const [customLocations, setCustomLocations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customLocations') || '[]')
    } catch { return [] }
  })
  const [ownerNames, setOwnerNames] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ownerNames') || '[]')
      return Array.isArray(saved) && saved.length === 2 ? saved : ['', '']
    } catch { return ['', ''] }
  })
  const [contractorSharePercentage, setContractorSharePercentage] = useState(() => {
    try {
      return Number(localStorage.getItem('contractorSharePercentage')) || 50
    } catch { return 50 }
  })
  const [ownerCount, setOwnerCount] = useState(() => {
    try {
      return Number(localStorage.getItem('ownerCount')) || 2
    } catch { return 2 }
  })
  const [tenantId, setTenantId] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const [session, setSession] = useState(null)

  // Auth & Profile Sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load profile settings from Supabase
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.id) return
      
      const { data, error } = await supabase
        .from('profiles')
        .select('owner_names, custom_locations, contractor_share_percentage, owner_count')
        .eq('id', session.user.id)
        .single()

      if (data && !error) {
        if (data.owner_names) setOwnerNames(data.owner_names)
        if (data.custom_locations) setCustomLocations(data.custom_locations)
        if (data.contractor_share_percentage) setContractorSharePercentage(Number(data.contractor_share_percentage))
        if (data.owner_count) setOwnerCount(Number(data.owner_count))
      } else if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it with current state
        await supabase.from('profiles').insert([{
          id: session.user.id,
          owner_names: ownerNames,
          custom_locations: customLocations,
          contractor_share_percentage: contractorSharePercentage,
          owner_count: ownerCount
        }])
      }
    }
    loadProfile()
  }, [session])

  useEffect(() => {
    if (!session?.user?.id) return
    // Auto-select first tenant if available
    listTenantsForUser(session.user.id).then(ts => {
      if (ts?.length && !tenantId) setTenantId(ts[0].tenant_id)
    })
  }, [session, tenantId])

  useEffect(() => {
    if (session?.user?.id && tenantId) {
      getUserRole(session.user.id, tenantId).then(setUserRole)
    }
  }, [session, tenantId])

  // Sync back to Supabase on changes
  useEffect(() => {
    const syncTimeout = setTimeout(async () => {
      if (!session?.user?.id) return
      
      await supabase
        .from('profiles')
        .update({
          owner_names: ownerNames,
          custom_locations: customLocations,
          contractor_share_percentage: contractorSharePercentage,
          owner_count: ownerCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
    }, 1000) // Debounce 1s

    return () => clearTimeout(syncTimeout)
  }, [ownerNames, customLocations, contractorSharePercentage, ownerCount, session])

  // Disaster Recovery state
  const [showDisasterRecovery, setShowDisasterRecovery] = useState(false)
  const [disasterRecovery, setDisasterRecovery] = useState(() => {
    try {
      const saved = localStorage.getItem('disasterRecovery')
      return saved ? JSON.parse(saved) : {
        lossQuantity: '',
        lossUnit: 'bags',
        pondsReconstruction: '',
        hutReconstruction: '',
        electricityBills: '',
        compensationReceived: '',
        donationsReceived: '',
      }
    } catch {
      return {
        lossQuantity: '',
        lossUnit: 'bags',
        pondsReconstruction: '',
        hutReconstruction: '',
        electricityBills: '',
        compensationReceived: '',
        donationsReceived: '',
      }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('disasterRecovery', JSON.stringify(disasterRecovery))
    } catch (e) {}
  }, [disasterRecovery])

  // Persist customLocations to localStorage
  useEffect(() => {
    try { localStorage.setItem('customLocations', JSON.stringify(customLocations)) } catch(e){}
  }, [customLocations])

  // Persist ownerNames to localStorage
  useEffect(() => {
    try { localStorage.setItem('ownerNames', JSON.stringify(ownerNames)) } catch(e){}
  }, [ownerNames])

  // Persist contractorSharePercentage to localStorage
  useEffect(() => {
    try { localStorage.setItem('contractorSharePercentage', String(contractorSharePercentage)) } catch(e){}
  }, [contractorSharePercentage])

  useEffect(() => {
    try {
      localStorage.setItem('ownerCount', String(ownerCount))
    } catch (e) {}
  }, [ownerCount])

  const [inputs, setInputs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...defaultInputs, ...parsed }
      }
    } catch (e) {
      console.error('Error loading initial state', e)
    }
    return defaultInputs
  })

  // Stock Reserved state
  const [stockReserved, setStockReserved] = useState(() => {
    try {
      const saved = localStorage.getItem('stockReserved')
      return saved ? JSON.parse(saved) : {
        stockLevel: '',
        stockUnit: 'bags',
        estimatedPrice: '',
        selectedLocations: [],
        fromDate: '',
        toDate: '',
      }
    } catch {
      return {
        stockLevel: '',
        stockUnit: 'bags',
        estimatedPrice: '',
        selectedLocations: [],
        fromDate: '',
        toDate: '',
      }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('stockReserved', JSON.stringify(stockReserved))
    } catch (e) {}
  }, [stockReserved])

  // Stock source selection (for stock rotation system)
  const [stockSource, setStockSource] = useState('freshly-harvested')

  // Ref for scrolling to input section
  const inputSectionRef = useRef(null)

  // Auto-set contractorSharePercentage to 0% when Labour Costs are added
  useEffect(() => {
    const labourCosts = Array.isArray(inputs.labourCosts) ? inputs.labourCosts : []
    if (labourCosts.length > 0 && contractorSharePercentage !== 0) {
      setContractorSharePercentage(0)
    }
  }, [inputs.labourCosts])

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
        // Disaster Recovery
          disasterRecovery: 'Disaster Recovery Expenses',
          addDisasterRecovery: '+ Add Disaster Recovery Expenses',
          disasterExpenses: '+ Disaster Expenses',
        lossQuantity: 'Loss Quantity of Salt',
        lossQuantityPlaceholder: 'e.g. 100',
        bags: 'Bags',
        kg: 'kg',
        pondsReconstruction: 'Ponds Reconstruction (LKR)',
        pondsReconstructionPlaceholder: 'e.g. 50000',
        hutReconstruction: 'Hut Reconstruction (LKR)',
        hutReconstructionPlaceholder: 'e.g. 20000',
        electricityBills: 'Electricity Bills (LKR)',
        electricityBillsPlaceholder: 'e.g. 5000',
        compensationReceived: 'Compensation Received (LKR)',
        compensationReceivedPlaceholder: 'e.g. 10000',
        donationsReceived: 'Donations Received (LKR)',
        donationsReceivedPlaceholder: 'e.g. 5000',
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
      expenseShared5050: 'Owner & Contractor Shared 50%',
      addExpenses: '+ add expenses',
      remove: 'Remove',
      bothOwnersHaveLoans: 'Owners have loans',
      oneOwnerHasLoan: 'Owner has loan',
      saltNetWeight: 'Salt Net Weight',
      loanInaya: 'Loan (Inaya) - LKR',
      loanShakira: 'Loan (Shakira) - LKR',
      income: 'Income',
      downloadPDF: '📥 Download PDF',
      save: '💾 Save',
      loadReports: '📂 Load Reports',
      savedReports: 'Saved Reports',
      noSavedReports: 'You haven\'t saved any reports yet.',
      noSavedFiles: 'No downloadable files found.',
      selectLocation: 'Select location',
      addLandNameInDashboard: 'Add land name in Dashboard',
      enterValues: 'Enter values to see results',
      summary: 'Summary',
      calculationBreakdown: 'Calculation Breakdown',
      finalResults: 'Final Results',
      packedMinusDeducted: 'Packed - Deducted',
      netBags: 'Net Bags',
      initialPrice: 'Initial Price',
      netTimesPricePerBag: 'Net × Price/Bag',
      contractorSpent: 'Contractor Total Spent',
      contractorSpentFormula: 'Packing Wage × TotalPackedBags + Bag Cost × PackedBags + Other Expenses',
      contractorShare: 'Contractor Share',
      contractorShareOwnersFormula: 'InitialPrice/2 + Spent',
      contractorShareContractorFormula: '(InitialPrice - Spent)/2',
      contractorShareShared5050Formula: '(InitialPrice - Spent)/2 + (Spent / 2)',
      grandTotalReceived: 'Grand Total Received',
      grandTotalOwnersFormula: 'InitialPrice - TotalLoan',
      grandTotalContractorFormula: 'InitialPrice - Spent - TotalLoan',
      grandTotalShared5050Formula: 'InitialPrice - Spent/2 - TotalLoan',
      ownerPool: 'Owners Group Amount',
      ownerPoolOwnersFormula: 'GrandTotal - ContractorShare',
      ownerPoolContractorFormula: '(GrandTotal + TotalLoan)/2',
      ownerPoolShared5050Formula: '(InitialPrice - Spent)/2',
      societyServiceCharge: 'Society Service Charge',
      societyServiceReserved30: 'Society Service Reserved 30%',
      finalShare: 'Final Share',
      loan: 'Loan',
      lossDetected: 'Loss detected',
      zakatLabel: 'Zakat (5%)',
      afterZakatLabel: 'After Zakat',
      noResultsToSave: 'No results to save',
      couldNotCreatePdf: 'Could not create PDF',
      reportSavedLocalDemo: 'Report saved to local database (Demo mode)',
      reportSavedToSupabase: 'Report successfully saved to your cloud account!',
      saveFailed: 'Failed to save report.',
      saveError: 'Error saving report',
      activationPending: 'Your payment is pending verification. Full access will be enabled soon.',
      trialExpiredPayPrompt: 'Your weekly trial uses (3) have expired. Please upgrade to Premium for unlimited access.',
      premiumAuthRequired: 'Please sign in to buy Premium access or use trial credits.',
      adminActivationSuccess: 'User successfully activated!',
      adminActivationFailed: 'Failed to activate user',
      openDashboardMenu: 'Open Dashboard Menu',
      oneOffPremium: 'Upgrade to Unlimited Lifetime Access',
      buyPremiumBtn: 'Buy Lifetime Access',
      payViaCash: 'Request Cash/Bank Payment',
      trialUsesRemain: 'Trial uses remaining this week',
      premiumActive: 'Premium Access Active',
      logout: 'Sign Out',
      login: 'Sign In / Register',
      customLocations: 'Work Locations',
      ownerNames: 'Owner Names',
      contractorSharePercentage: 'Contractor Share Percentage',
      contractor: 'Contractor',
      owners: 'Owners',
      splitStandard: '50/50 split (standard)',
      contractorGetsMore: 'Contractor gets more',
      ownersGetMore: 'Owners get more',
      perOwnerShare: 'Per Owner Share',
      singleOwner: 'Single Owner',
      twoOwners: 'Two Owners',
      toggleOwnerCount: 'Tap to switch owner count',
      labourCosts: 'Labour Costs',
      addLabourCostEntry: '+ ADD LABOUR COST ENTRY',
      labourNameRole: 'Labour Name / Role',
      dateOfService: 'Date of Service',
      paymentFrequency: 'Payment Frequency',
      totalAmountLkr: 'Total Amount (LKR)',
      noRecordsInLabourLog: 'NO RECORDS IN LABOUR LOG',
      weekly: 'Weekly',
      fortnightly: 'Fortnightly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      stockReserved: 'Stock Reserved',
      quantityUnit: 'QUANTITY UNIT',
      stockLevel: 'STOCK LEVEL',
      stockLevelPlaceholder: '0',
      estimatedPriceLKR: 'ESTIMATED PRICE (LKR)',
      estimatedPricePlaceholder: '0.00',
      locationsMultiple: 'LOCATIONS (MULTIPLE)',
      selectLocationToAdd: '+ SELECT LOCATION TO ADD...',
      addNewLocation: '+ OR ADD NEW LOCATION',
      cancelManualEntry: '- CANCEL MANUAL ENTRY',
      enterLocationName: 'Enter location name',
      add: 'ADD',
      noLocationsAvailable: 'No locations available. Add locations in Dashboard.',
      fromDate: 'FROM DATE',
      toDate: 'TO DATE',
      packingCostBreakdown: 'PACKING COST BREAKDOWN',
      fromLabourCard: 'from Labour Cost card',
      labourCost: 'Labour Cost',
      totalPackingCost: 'TOTAL PACKING COST',
      stockSummary: 'STOCK SUMMARY',
      locations: 'Locations',
      totalEstimatedPrice: 'Total Estimated Price',
      period: 'Period',
      saveStockReserved: 'Save Stock Reserved',
      approxBagFormat: 'Approx {qty} bags (50kg/bag)',
      bagsFromKg: 'bags (kg÷50)',
      stockSource: 'STOCK SOURCE',
      soldReservedStock: 'Sold Reserved Stock',
      freshlyHarvested: 'Freshly Harvested',
      mixedStockReservedAndFresh: 'Mixed (Reserved + Fresh)',
    },
    ta: {
      title: 'உப்பு இலாபப் பங்கு கணக்கீடு',
      subtitle: 'உரிமையாளர்கள் மற்றும் ஒப்பந்தக்காரர்களுக்கான நிதி கணக்கீடு',
      documentDetails: "ஆவண விவரங்கள்",
      locationDay: 'இடம்',
      date: 'தேதி',
      buyerName: "வாங்குபவர் பெயர்",
      billNumber: 'பில் எண்',
      inputData: 'உள்ளீட்டு தரவு',
      reset: '🔄 மீட்டமை',
      totalSaltPackedBags: 'மொத்த உப்பு மூட்டைகள்',
        // Disaster Recovery
          disasterRecovery: 'பேரழிவு மீட்பு செலவுகள்',
          addDisasterRecovery: '+ பேரழிவு மீட்பு செலவுகளைச் சேர்க்கவும்',
          disasterExpenses: '+ பேரழிவு செலவுகள்',
        lossQuantity: 'உப்பு இழப்பு அளவு',
        lossQuantityPlaceholder: 'எ.கா. 100',
        bags: 'மூட்டைகள்',
        kg: 'கிலோ',
        pondsReconstruction: 'குளங்கள் புனரமைப்பு (LKR)',
        pondsReconstructionPlaceholder: 'எ.கா. 50000',
        hutReconstruction: 'கூரை புனரமைப்பு (LKR)',
        hutReconstructionPlaceholder: 'எ.கா. 20000',
        electricityBills: 'மின்சார கட்டணம் (LKR)',
        electricityBillsPlaceholder: 'எ.கா. 5000',
        compensationReceived: 'பெறப்பட்ட இழப்பீடு (LKR)',
        compensationReceivedPlaceholder: 'எ.கா. 10000',
        donationsReceived: 'பெறப்பட்ட நன்கொடைகள் (LKR)',
        donationsReceivedPlaceholder: 'எ.கா. 5000',
      deductedBags: 'கழிக்கப்பட்ட மூட்டைகள்',
      pricePerBag: 'மூட்டை ஒன்றின் விலை (LKR)',
      cashReceived: 'ரொக்கப் பணம் (LKR)',
      chequeReceived: 'காசோலை பணம் (LKR)',
      contractorExpenses: 'ஒப்பந்ததாரர் செலவுகள்',
      packingFeePerBag: 'மூட்டை கட்டும் கூலி (LKR)',
      bagCostPerUnit: 'பிளாஸ்டிக் பையின் விலை (LKR)',
      otherExpenses: 'இதர செலவுகள் (LKR)',
      otherExpensesReason: 'இதர செலவுகளுக்கான காரணம்',
      expenseResponsibility: 'செலவுப் பொறுப்பு',
      expenseOwners: 'உரிமையாளர்கள் செலுத்துதல்',
      expenseContractor: 'ஒப்பந்ததாரர் செலுத்துதல்',
      expenseShared5050: 'உரிமையாளர் & ஒப்பந்ததாரர் 50/50',
      addExpenses: '+ செலவுகளை சேர்க்க',
      remove: 'அகற்று',
      bothOwnersHaveLoans: 'உரிமையாளர்களுக்கு கடன் உள்ளது',
      oneOwnerHasLoan: 'உரிமையாளருக்கு கடன் உள்ளது',
      saltNetWeight: 'உப்பு நிகர எடை',
      loanInaya: 'கடன் (இனாயா) - LKR',
      loanShakira: 'கடன் (ஷகிரா) - LKR',
      income: 'வருமானம்',
      downloadPDF: '📥 PDF பதிவிறக்க',
      save: '💾 சேமி',
      loadReports: '📂 அறிக்கைகளை ஏற்றவும்',
      savedReports: 'சேமிக்கப்பட்ட அறிக்கைகள்',
      noSavedReports: 'நீங்கள் இன்னும் எந்த அறிக்கையையும் சேமிக்கவில்லை.',
      noSavedFiles: 'பதிவிறக்கம் செய்யக்கூடிய கோப்புகள் எதுவும் இல்லை.',
      selectLocation: 'இடத்தைத் தேர்ந்தெடுக்கவும்',
      addLandNameInDashboard: 'டாஷ்போர்டில் இடப் பெயரைச் சேர்க்கவும்',
      enterValues: 'முடிவுகளைக் காண தரவுகளை உள்ளிடவும்',
      summary: 'சுருக்கம்',
      calculationBreakdown: 'கணக்கீட்டு விவரம்',
      finalResults: 'இறுதி முடிவுகள்',
      packedMinusDeducted: 'மூட்டைகள் - கழிவுகள்',
      netBags: 'நிகர மூட்டைகள்',
      initialPrice: 'ஆரம்ப விலை',
      netTimesPricePerBag: 'நிகரம் × விலை',
      contractorSpent: 'ஒப்பந்ததாரரின் மொத்த செலவு',
      contractorSpentFormula: 'கட்டும் கூலி × மொத்த மூட்டைகள் + பை விலை × மூட்டைகள் + இதர செலவுகள்',
      contractorShare: 'ஒப்பந்ததாரர் பங்கு',
      contractorShareOwnersFormula: 'ஆரம்பவிலை/2 + செலவு',
      contractorShareContractorFormula: '(ஆரம்பவிலை - செலவு)/2',
      contractorShareShared5050Formula: '(ஆரம்பவிலை - செலவு)/2 + (செலவு / 2)',
      grandTotalReceived: 'மொத்த வரவு',
      grandTotalOwnersFormula: 'ஆரம்பவிலை - மொத்தகடன்',
      grandTotalContractorFormula: 'ஆரம்பவிலை - செலவு - மொத்தகடன்',
      grandTotalShared5050Formula: 'ஆரம்பவிலை - செலவு/2 - மொத்தகடன்',
      ownerPool: 'உரிமையாளர்களின் மொத்த தொகை',
      ownerPoolOwnersFormula: 'மொத்தம் - ஒப்பந்ததாரர் பங்கு',
      ownerPoolContractorFormula: '(மொத்தம் + மொத்தகடன்)/2',
      ownerPoolShared5050Formula: '(ஆரம்பவிலை - செலவு)/2',
      societyServiceCharge: 'சங்க சேவை கட்டணம்',
      societyServiceReserved30: 'சங்க சேவை ஒதுக்கீடு 30%',
      finalShare: 'இறுதி பங்கு',
      loan: 'கடன்',
      lossDetected: 'நஷ்டம் ஏற்பட்டுள்ளது',
      zakatLabel: 'ஜகாத் (5%)',
      afterZakatLabel: 'ஜகாத்திற்கு பின்',
      noResultsToSave: 'சேமிக்க முடிவுகள் இல்லை',
      couldNotCreatePdf: 'PDF ஐ உருவாக்க முடியவில்லை',
      reportSavedLocalDemo: 'அறிக்கை உள்ளூர் தரவுத்தளத்தில் சேமிக்கப்பட்டது (Demo mode)',
      reportSavedToSupabase: 'அறிக்கை உங்கள் மேகக்கணி கணக்கில் வெற்றிகரமாக சேமிக்கப்பட்டது!',
      saveFailed: 'அறிக்கையைச் சேமிக்க முடியவில்லை.',
      saveError: 'அறிக்கையைச் சேமிப்பதில் பிழை',
      activationPending: 'உங்கள் கட்டணம் சரிபார்ப்பில் உள்ளது. விரைவில் முழு அணுகல் வழங்கப்படும்.',
      trialExpiredPayPrompt: 'இந்த வாரத்திற்கான உங்கள் இலவச பயன்பாடுகள் (3) முடிந்துவிட்டன. வரம்பற்ற அணுகலுக்கு பிரீமியத்திற்கு மாறவும்.',
      premiumAuthRequired: 'பிரீமியம் அணுகலை வாங்க அல்லது இலவச பயன்பாடுகளைப் பயன்படுத்த தயவுசெய்து உள்நுழையவும்.',
      adminActivationSuccess: 'பயனர் வெற்றிகரமாக செயல்படுத்தப்பட்டார்!',
      adminActivationFailed: 'பயனரைச் செயல்படுத்த முடியவில்லை',
      openDashboardMenu: 'டாஷ்போர்டு மெனுவைத் திறக்கவும்',
      oneOffPremium: 'வரம்பற்ற வாழ்நாள் அணுகலுக்கு மாறவும்',
      buyPremiumBtn: 'வாழ்நாள் அணுகலை வாங்கவும்',
      payViaCash: 'ரொக்க / வங்கி கட்டணத்தைக் கோரவும்',
      trialUsesRemain: 'இந்த வாரத்தில் மீதமுள்ள இலவச பயன்பாடுகள்',
      premiumActive: 'பிரீமியம் அணுகல் செயல்பாட்டில் உள்ளது',
      logout: 'வெளியேறு',
      login: 'உள்நுழைய / பதிவு செய்ய',
      customLocations: 'பணி இடங்கள்',
      ownerNames: 'உரிமையாளர் பெயர்கள்',
      contractorSharePercentage: 'ஒப்பந்ததாரர் பங்கு சதவீதம்',
      contractor: 'ஒப்பந்ததாரர்',
      owners: 'உரிமையாளர்கள்',
      splitStandard: '50/50 பகிர்வு (தரநிலை)',
      contractorGetsMore: 'ஒப்பந்ததாரருக்கு அதிக பங்கு',
      ownersGetMore: 'உரிமையாளர்களுக்கு அதிக பங்கு',
      perOwnerShare: 'ஒரு உரிமையாளரின் பங்கு',
      singleOwner: 'ஒற்றை உரிமையாளர்',
      twoOwners: 'இரண்டு உரிமையாளர்கள்',
      toggleOwnerCount: 'உரிமையாளர் எண்ணிக்கையை மாற்ற தட்டவும்',
      labourCosts: 'தொழிலாளர் செலவுகள்',
      addLabourCostEntry: '+ தொழிலாளர் செலவுப் பதிவைச் சேர்க்கவும்',
      labourNameRole: 'தொழிலாளர் பெயர் / பதவி',
      dateOfService: 'பணி வழங்கப்பட்ட தேதி',
      paymentFrequency: 'கொடுப்பனவு இடைவெளி',
      totalAmountLkr: 'மொத்த தொகை (LKR)',
      noRecordsInLabourLog: 'தொழிலாளர் பதிவுகள் எதுவும் இல்லை',
      weekly: 'வாராந்திர',
      fortnightly: 'இரண்டு வாரங்களுக்கு ஒருமுறை',
      monthly: 'மாதாந்திர',
      quarterly: 'காலாண்டு',
      yearly: 'ஆண்டு',
      amount: 'மொத்த தொகை (LKR)',
      noRecordsLabourLog: 'தொழிலாளர் பதிவுகள் எதுவும் இல்லை',
      stockReserved: 'சேமிக்கப்பட்ட இருப்பு',
      quantityUnit: 'அளவு அலகு',
      stockLevel: 'உப்பு அளவு',
      stockLevelPlaceholder: '0',
      estimatedPriceLKR: 'மதிப்பிடப்பட்ட விலை (LKR)',
      estimatedPricePlaceholder: '0.00',
      locationsMultiple: 'இடங்கள் (பல)',
      selectLocationToAdd: '+ சேர்க்க இடத்தைத் தேர்ந்தெடுக்கவும்...',
      addNewLocation: '+ அல்லது புதிய இடத்தைச் சேர்க்கவும்',
      cancelManualEntry: '- கைமுறை உள்ளீட்டை ரத்து செய்க',
      enterLocationName: 'இடப் பெயரை உள்ளிடவும்',
      add: 'சேர்க்க',
      noLocationsAvailable: 'இடங்கள் கிடைக்கவில்லை. டாஷ்போர்டில் இடங்களைச் சேர்க்கவும்.',
      fromDate: 'தொடக்க தேதி',
      toDate: 'முடிவு தேதி',
      packingCostBreakdown: 'பதிவு செலவு உடைப்பு',
      fromLabourCard: 'தொழிலாளர் செலவு கார்டிலிருந்து',
      labourCost: 'தொழிலாளர் செலவு',
      totalPackingCost: 'மொத்த பதிவு செலவு',
      stockSummary: 'உப்பு சுருக்கம்',
      locations: 'இடங்கள்',
      totalEstimatedPrice: 'மொத்த மதிப்பிடப்பட்ட விலை',
      period: 'காலம்',
      saveStockReserved: 'சேமிக்கப்பட்ட இருப்பை பதிவு செய்க',
      approxBagFormat: 'சுமார் {qty} மூட்டைகள் (50கிலோ/மூட்டை)',
      bagsFromKg: 'மூட்டைகள் (கிலோ÷50)',
      stockSource: 'உப்பு மூலம்',
      soldReservedStock: 'சேமிக்கப்பட்ட இருப்பு',
      freshlyHarvested: 'புதிதாக அறுவடை செய்யப்பட்ட',
      mixedStockReservedAndFresh: 'கலவை (சேமிக்கப்பட்ட + புதிய)',
    },
    si: {
      title: 'ලුණු ලාභ බෙදාගැනීමේ ගණක යන්ත්‍රය',
      subtitle: 'අයිතිකරුවන් සහ කොන්ත්‍රාත්කරුවන් සඳහා මූල්‍ය ගණක යන්ත්‍රය',
      documentDetails: "ලේඛන විස්තර",
      locationDay: 'ස්ථානය',
      date: 'දිනය',
      buyerName: "ගැණුම්කරුගේ නම",
      billNumber: 'බිල්පත් අංකය',
      inputData: 'දත්ත ඇතුළත් කිරීම',
      reset: '🔄 නැවත සකසන්න',
      totalSaltPackedBags: 'මුළු ලුණු මලු ප්‍රමාණය',
        // Disaster Recovery
          disasterRecovery: 'ආපදා ප්‍රතිසාධන වියදම්',
          addDisasterRecovery: '+ ආපදා ප්‍රතිසාධන වියදම් එක් කරන්න',
          disasterExpenses: '+ ආපදා වියදම්',
        lossQuantity: 'ලුණු අලාභ ප්‍රමාණය',
        lossQuantityPlaceholder: 'උදා: 100',
        bags: 'මලු',
        kg: 'කිලෝග්‍රෑම්',
        pondsReconstruction: 'කලපු ප්‍රතිසංස්කරණය (LKR)',
        pondsReconstructionPlaceholder: 'උදා: 50000',
        hutReconstruction: 'මඩු ප්‍රතිසංස්කරණය (LKR)',
        hutReconstructionPlaceholder: 'උදා: 20000',
        electricityBills: 'විදුලි බිල්පත් (LKR)',
        electricityBillsPlaceholder: 'උදා: 5000',
        compensationReceived: 'ලැබුණු වන්දි (LKR)',
        compensationReceivedPlaceholder: 'උදා: 10000',
        donationsReceived: 'ලැබුණු ආධාර (LKR)',
        donationsReceivedPlaceholder: 'උදා: 5000',
      deductedBags: 'අඩු කළ මලු ප්‍රමාණය',
      pricePerBag: 'මල්ලක මිල (LKR)',
      cashReceived: 'අතේ ඇති මුදල් (LKR)',
      chequeReceived: 'චෙක්පත් මුදල් (LKR)',
      contractorExpenses: 'කොන්ත්‍රාත්කරුගේ වියදම්',
      packingFeePerBag: 'ඇසිරීමේ කුලිය (LKR)',
      bagCostPerUnit: 'ප්ලාස්ටික් මල්ලක මිල (LKR)',
      otherExpenses: 'වෙනත් වියදම් (LKR)',
      otherExpensesReason: 'වෙනත් වියදම් සඳහා හේතුව',
      expenseResponsibility: 'වියදම් පිළිබඳ වගකීම',
      expenseOwners: 'අයිතිකරුවන් ගෙවීම',
      expenseContractor: 'කොන්ත්‍රාත්කරු ගෙවීම',
      expenseShared5050: 'අයිතිකරු සහ කොන්ත්‍රාත්කරු 50% බැගින්',
      addExpenses: '+ වියදම් එක් කරන්න',
      remove: 'ඉවත් කරන්න',
      bothOwnersHaveLoans: 'ණය තිබේ',
      oneOwnerHasLoan: 'ණය තිබේ',
      loan: 'ණය',
      owner: 'අයිතිකරු',
      saltNetWeight: 'ලුණු ශුද්ධ බර',
      loanInaya: 'ණය (ඉනායා) - LKR',
      loanShakira: 'ණය (ෂකීරා) - LKR',
      income: 'ආදායම',
      downloadPDF: '📥 PDF බාගන්න',
      save: '💾 සුරකින්න',
      loadReports: '📂 වාර්තා පූරණය කරන්න',
      savedReports: 'සුරකින ලද වාර්තා',
      noSavedReports: 'ඔබ තවමත් කිසිදු වාර්තාවක් සුරැක නොමැත.',
      noSavedFiles: 'බාගත හැකි ගොනු කිසිවක් හමු නොවීය.',
      selectLocation: 'ස්ථානය තෝරන්න',
      addLandNameInDashboard: 'ඩෑෂ්බෝර්ඩ් එකෙහි ස්ථානයේ නම එක් කරන්න',
      enterValues: 'ප්‍රතිඵල දැකීමට දත්ත ඇතුළත් කරන්න',
      summary: 'සාරාංශය',
      calculationBreakdown: 'ගණනය කිරීමේ විස්තර',
      finalResults: 'අවසාන ප්‍රතිඵල',
      packedMinusDeducted: 'මුළු මලු - අඩු කළ මලු',
      netBags: 'ශුද්ධ මලු ප්‍රමාණය',
      initialPrice: 'මූලික මිල',
      netTimesPricePerBag: 'ශුද්ධ මලු × මල්ලක මිල',
      contractorSpent: 'කොන්ත්‍රාත්කරුගේ මුළු වියදම',
      contractorSpentFormula: 'ඇසිරීමේ කුලිය × මුළු මලු + මලු මිල × මලු + වෙනත් වියදම්',
      contractorShare: 'කොන්ත්‍රාත්කරුගේ කොටස',
      contractorShareOwnersFormula: 'මූලික මිල/2 + වියදම',
      contractorShareContractorFormula: '(මූලික මිල - වියදම)/2',
      contractorShareShared5050Formula: '(මූලික මිල - වියදම)/2 + (වියදම / 2)',
      grandTotalReceived: 'මුළු ලැබීම්',
      grandTotalOwnersFormula: 'මූලික මිල - මුළු ණය',
      grandTotalContractorFormula: 'මූලික මිල - වියදම - මුළු ණය',
      grandTotalShared5050Formula: 'මූලික මිල - වියදම/2 - මුළු ණය',
      ownerPool: 'අයිතිකරුවන්ගේ සමූහ මුදල',
      ownerPoolOwnersFormula: 'මුළු ලැබීම් - කොන්ත්‍රාත්කරුගේ කොටස',
      ownerPoolContractorFormula: '(මුළු ලැබීම් + මුළු ණය)/2',
      ownerPoolShared5050Formula: '(මූලික මිල - වියදම)/2',
      perOwnerShare: 'අයිතිකරුවෙකුට ලැබෙන කොටස',
      societyServiceCharge: 'සංගම් සේවා ගාස්තුව',
      societyServiceReserved30: 'සංගම් සේවා වෙන්කිරීම 30%',
      finalShare: 'අවසාන කොටස',
      lossDetected: 'අලාභයක් සිදුවී ඇත',
      zakatLabel: 'සකාත් (5%)',
      afterZakatLabel: 'සකාත් ගෙවීමෙන් පසු',
      noResultsToSave: 'සුරැකීමට ප්‍රතිඵල නොමැත',
      couldNotCreatePdf: 'PDF එකක් සෑදීමට නොහැකි විය',
      reportSavedLocalDemo: 'වාර්තාව සුරැකිණි (Demo mode)',
      reportSavedToSupabase: 'වාර්තාව සාර්ථකව සුරැකිණි!',
      saveFailed: 'වාර්තාව සුරැකීමට නොහැකි විය.',
      saveError: 'වාර්තාව සුරැකීමේදී දෝෂයක් ඇති විය',
      activationPending: 'ඔබේ ගෙවීම තහවුරු වෙමින් පවතී. ඉක්මනින් සම්පූර්ණ ප්‍රවේශය ලැබෙනු ඇත.',
      trialExpiredPayPrompt: 'මෙම සතිය සඳහා ඔබේ නොමිලේ භාවිතයන් 3 අවසන් වී ඇත. කරුණාකර ප්‍රීමියම් වෙත යොමු වන්න.',
      premiumAuthRequired: 'ප්‍රීමියම් ප්‍රවේශය ලබා ගැනීමට කරුණාකර ලොග් වන්න.',
      adminActivationSuccess: 'පරිශීලකයා සාර්ථකව සක්‍රීය කරන ලදි!',
      adminActivationFailed: 'පරිශීලකයා සක්‍රීය කිරීමට නොහැකි විය',
      openDashboardMenu: 'මෙනුව විවෘත කරන්න',
      oneOffPremium: 'ජීවිත කාලයම භාවිතා කිරීමට ලබා ගන්න',
      buyPremiumBtn: 'දැන් ලබා ගන්න',
      payViaCash: 'මුදල්/බැංකු ගෙවීමක් ඉල්ලන්න',
      trialUsesRemain: 'මෙම සතිය සඳහා ඉතිරිව ඇති නොමිලේ භාවිතයන්',
      premiumActive: 'ප්‍රීමියම් පහසුකම ක්‍රියාත්මකයි',
      logout: 'ලොග් අවුට් වන්න',
      login: 'ලොග් වන්න / ලියාපදිංචි වන්න',
      customLocations: 'ස්ථාන',
      ownerNames: 'අයිතිකරුවන්ගේ නම්',
      contractorSharePercentage: 'කොන්ත්‍රාත්කරුගේ කොටස (%)',
      contractor: 'කොන්ත්‍රාත්කරු',
      owners: 'අයිතිකරුවන්',
      splitStandard: '50/50 බෙදීම',
      contractorGetsMore: 'කොන්ත්‍රාත්කරුට වැඩි කොටසක්',
      ownersGetMore: 'අයිතිකරුවන්ට වැඩි කොටසක්',
      singleOwner: 'තනි අයිතිකරු',
      twoOwners: 'අයිතිකරුවන් දෙදෙනෙකු',
      toggleOwnerCount: 'අයිතිකරුවන් ගණන වෙනස් කරන්න',
      dashboard: 'සාරාංශය',
      labourCosts: 'සේවක වියදම්',
      addLabourCostEntry: '+ සේවක වියදමක් එක් කරන්න',
      labourNameRole: 'සේවක නම / භූමිකාව',
      dateOfService: 'සේවා දිනය',
      paymentFrequency: 'ගෙවීමේ වාර ගණන',
      amount: 'මුළු මුදල (LKR)',
      noRecordsInLabourLog: 'ලොග් එකෙහි කිසිදු සේවක වියදමක් නොමැත',
      weekly: 'සතිපතා',
      fortnightly: 'දෙසතියකට වරක්',
      monthly: 'මාසිකව',
      quarterly: 'කාර්තුවකට වරක්',
      yearly: 'වාර්ෂිකව',
      stockReserved: 'සංරක්ෂිත ලුණු',
      quantityUnit: 'ප්‍රමාණ ඒකක',
      stockLevel: 'ලුණු ප්‍රමාණය',
      stockLevelPlaceholder: '0',
      estimatedPriceLKR: 'ස්ථිර මිල (LKR)',
      estimatedPricePlaceholder: '0.00',
      locationsMultiple: 'ස්ථාන (බහුවිධ)',
      selectLocationToAdd: '+ එක් කිරීමට ස්ථානය තෝරන්න...',
      addNewLocation: '+ හෝ නව ස්ථානය එක් කරන්න',
      cancelManualEntry: '- සручно අත්‍යාવශ්‍යත සම්පાදනය අවලංඩු කරන්න',
      enterLocationName: 'ස්ථාන නම ඇතුළත් කරන්න',
      add: 'එක් කරන්න',
      noLocationsAvailable: 'ස්ථාන ලබා ගැනීමට නොහැකි විය. ඩෑෂ්බෝර්ඩ් එකෙහි ස්ථාන එක් කරන්න.',
      fromDate: 'ආරම්භක දිනය',
      toDate: 'අවසාන දිනය',
      packingCostBreakdown: 'ඇසිරීමේ මිල බිඩීම',
      fromLabourCard: 'සේවක වියදම් කාඩ්පත සිට',
      labourCost: 'සේවක වියදම',
      totalPackingCost: 'මුළු ඇසිරීමේ මිල',
      stockSummary: 'ලුණු සාරාංශය',
      locations: 'ස්ථාන',
      totalEstimatedPrice: 'මුළු ස්ථිර මිල',
      period: 'කාලය',
      saveStockReserved: 'සංරක්ෂිත ලුණු සුරකින්න',
      approxBagFormat: 'සుමාරු {qty} මලු (50kg/මල්ල)',
    }
  }

  const t = (key) => {
    if (key === 'lang') return lang
    return (translations[lang] && translations[lang][key]) || key
  }

  const [results, setResults] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportFromDate, setReportFromDate] = useState('')
  const [reportToDate, setReportToDate] = useState('')
  const rootRef = useRef()
  const printRef = useRef()
  const [reports, setReports] = useState([])
  const [savedFiles, setSavedFiles] = useState([])
  const [billingStatus, setBillingStatus] = useState(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingPaymentRequests, setPendingPaymentRequests] = useState([])
  const [adminActionBusy, setAdminActionBusy] = useState(false)
  const isProdSupabase = isSupabaseConfigured && Boolean(supabase)
  const ONE_OFF_PRICE_LKR = 30000
  const STRIPE_FEE_PERCENT = Number(import.meta.env.VITE_STRIPE_LKR_FEE_PERCENT || 3.4)
  const STRIPE_FEE_FIXED = Number(import.meta.env.VITE_STRIPE_LKR_FEE_FIXED || 90)

  const normalizedOwnerNames = Array.isArray(ownerNames)
    ? ownerNames.map(name => String(name || '').trim()).filter(Boolean)
    : []
  const activeOwnerNames = normalizedOwnerNames.length >= 2
    ? [normalizedOwnerNames[0], normalizedOwnerNames[1]]
    : normalizedOwnerNames.length === 1
      ? [normalizedOwnerNames[0], '']
      : ['', '']
  const estimatedStripeFee = ((ONE_OFF_PRICE_LKR * STRIPE_FEE_PERCENT) / 100) + STRIPE_FEE_FIXED
  const stripeFeePreview = {
    base: ONE_OFF_PRICE_LKR,
    fee: estimatedStripeFee,
    total: ONE_OFF_PRICE_LKR + estimatedStripeFee,
    baseFormatted: formatLKR(ONE_OFF_PRICE_LKR),
    feeFormatted: formatLKR(estimatedStripeFee),
    totalFormatted: formatLKR(ONE_OFF_PRICE_LKR + estimatedStripeFee),
  }

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
      }
    } catch (e) {
      console.error(e)
    }
  }, [session, isProdSupabase])

  const loadSavedFiles = useCallback(async (activeSession = session) => {
    if (isProdSupabase && !activeSession?.user?.id) {
      setSavedFiles([])
      return
    }
    try {
      const { files, error } = await getSavedFilesFromSupabase(activeSession)
      if (!error) {
        setSavedFiles(files || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [session, isProdSupabase])

  const refreshBillingStatus = useCallback(async (activeSession = session) => {
    if (!activeSession?.user?.id) {
      setBillingStatus(null)
      return
    }

    try {
      const status = await getBillingStatus(activeSession)
      setBillingStatus(status)
    } catch (error) {
      console.error(error)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      loadReports(session)
      loadSavedFiles(session)
      refreshBillingStatus(session)
      refreshAdminStatus(session)
    } else {
      setReports([])
      setSavedFiles([])
      setBillingStatus(null)
      setIsAdmin(false)
      setPendingPaymentRequests([])
    }
  }, [session])

  const refreshAdminStatus = useCallback(async (activeSession = session) => {
    if (!supabase || !activeSession?.user?.id) {
      setIsAdmin(false)
      setPendingPaymentRequests([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', activeSession.user.id)
        .maybeSingle()

      if (error) throw error

      const adminFlag = Boolean(data?.is_admin)
      setIsAdmin(adminFlag)

      if (adminFlag) {
        refreshPendingPaymentRequests(activeSession)
      } else {
        setPendingPaymentRequests([])
      }
    } catch (error) {
      console.error(error)
      setIsAdmin(false)
      setPendingPaymentRequests([])
    }
  }, [session])

  const refreshPendingPaymentRequests = useCallback(async (activeSession = session) => {
    if (!activeSession?.user?.id || !isAdmin) {
      setPendingPaymentRequests([])
      return
    }

    try {
      const resp = await getAdminPendingPayments(activeSession)
      if (resp?.ok) {
        setPendingPaymentRequests(resp.requests || [])
      }
    } catch (error) {
      console.error(error)
    }
  }, [session, isAdmin])

  const handleAdminActivatePaymentRequest = async (requestRow, adminNote) => {
    if (!requestRow?.id || !session?.user?.id) return
    
    try {
      setAdminActionBusy(true)
      await activatePaymentRequestAsAdmin({
        session,
        paymentRequestId: requestRow.id,
        adminNote,
      })

      alert(t('adminActivationSuccess'))
      await refreshPendingPaymentRequests(session)
      await refreshBillingStatus(session)
    } catch (error) {
      alert(`${t('adminActivationFailed')}: ${error?.message || error}`)
    } finally {
      setAdminActionBusy(false)
    }
  }

  const ensurePremiumAccess = async () => {
    if (!session?.user?.id) {
      alert(t('premiumAuthRequired'))
      handleOpenAuth('signin')
      return false
    }

    if (billingStatus?.full_access_enabled) {
      return true
    }

    if (billingStatus?.payment_status === 'payment_pending_verification') {
      alert(t('activationPending'))
      return false
    }

    const consumed = await consumeTrialUse(session)
    if (!consumed?.allowed) {
      setBillingStatus(prev => ({
        ...(prev || {}),
        trial_limit: consumed?.trial_limit ?? prev?.trial_limit ?? 3,
        trial_uses: consumed?.trial_uses ?? prev?.trial_uses ?? 3,
        full_access_enabled: consumed?.full_access_enabled ?? false,
        payment_status: consumed?.payment_status ?? 'trial',
      }))
      alert(t('trialExpiredPayPrompt'))
      return false
    }

    setBillingStatus(prev => ({
      ...(prev || {}),
      trial_limit: consumed?.trial_limit ?? prev?.trial_limit ?? 3,
      trial_uses: consumed?.trial_uses ?? consumed?.trial_uses_remain ?? 0,
      full_access_enabled: consumed?.full_access_enabled ?? false,
      payment_status: consumed?.payment_status ?? 'trial',
    }))

    return true
  }

  const handleStartCardPayment = async () => {
    if (!session?.user?.id) {
      alert(t('premiumAuthRequired'))
      handleOpenAuth('signin')
      return
    }

    try {
      setPaymentBusy(true)
      const resp = await createStripeCheckoutSession({
        session,
        origin: `${window.location.origin}${window.location.pathname}`,
      })
      if (resp?.url) {
        window.location.href = resp.url
      } else {
        alert('Stripe initialization failed.')
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setPaymentBusy(false)
    }
  }

  const handleRequestCashPayment = async (buyerNote) => {
    if (!session?.user?.id) return
    try {
      setPaymentBusy(true)
      await requestCashPayment({ session, amount: ONE_OFF_PRICE_LKR, buyerNote })
      alert('Cash payment request sent! We will verify your payment soon.')
      await refreshBillingStatus(session)
    } catch (error) {
      alert(error.message)
    } finally {
      setPaymentBusy(false)
    }
  }

  // compute on every input change or when contractor share percentage changes
  useEffect(()=>{
    try {
      const res = computeAll(inputs, { contractorSharePercentage, ownerCount, stockSource, stockReserved })
      setResults(res)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
    } catch (e) {
      console.error('Error in computeAll or localStorage:', e)
    }
  }, [inputs, contractorSharePercentage, ownerCount, stockSource, stockReserved])

  // Single-owner mode: ensure second owner loan does not affect persisted inputs/reports.
  useEffect(() => {
    if (ownerCount === 1 && Number(inputs.loanShakira || 0) !== 0) {
      setInputs(prev => ({ ...prev, loanShakira: 0 }))
    }
  }, [ownerCount, inputs.loanShakira])

  const reset = () => {
    // Check if location and date are provided (mandatory fields)
    if (!inputs.location || !inputs.date) {
      // Scroll to input section
      inputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      alert('Please fill in Location and Date in Document Details before resetting.')
      return
    }
    
    // Reset inputs but keep location and date for context
    setInputs(prev => ({
      ...defaultInputs,
      location: prev.location,
      date: prev.date,
      buyerName: '',
      billNumber: '',
    }))
    setResults(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch(e){}
  }

  const toggleLoans = (val) => {
    setInputs(prev => ({...prev, bothOwnersHaveLoans: !!val}))
  }

  const downloadPDF = async () => {
    const allowed = await ensurePremiumAccess()
    if (!allowed) return

    if (!results) return alert(t('noResultsToSave'))
    try {
      const element = document.getElementById('print-area')
      if (!element) return
      
      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      
      const fileName = `Report-${(inputs.location || 'Report').replace(/\s+/g, '-')}-${inputs.date || new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      // Auto-save to Supabase if session exists
      if (session?.user?.id) {
        const pdfBlob = pdf.output('blob')
        await savePdfFileToSupabase(pdfBlob, fileName, session)
        loadSavedFiles(session)
      }
    } catch (err) {
      console.error(err)
      alert(t('couldNotCreatePdf'))
    }
  }

  const saveCurrentReport = async () => {
    if (!results) return alert(t('noResultsToSave'))
    const allowed = await ensurePremiumAccess()
    if (!allowed) {
      return
    }

    try {
      const payload = {
        inputs,
        results,
        ownerNames,
        contractorSharePercentage,
        disasterRecovery,
      }
      if (isProdSupabase) {
        const resp = await saveReportToSupabase(payload, session)
        if (resp && resp.ok) {
          alert(t('reportSavedToSupabase'))
          await loadReports(session)
          await loadSavedFiles(session)
          return
        }
        alert(t('saveFailed'))
        return
      }

      // local/demo fallback when Supabase is not configured
      const resp2 = await saveReport(payload)
      if (resp2 && resp2.ok) {
        alert(t('reportSavedLocalDemo'))
      } else {
        alert(t('saveFailed'))
      }
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('auth')) {
        handleOpenAuth('signin')
        return
      }
      alert(`${t('saveError')}: ${e.message || e}`)
    }
  }

  const saveStockReserved = async () => {
    if (!session?.user?.id) {
      alert('Please sign in to save stock reserved records')
      handleOpenAuth('signin')
      return
    }

    if (!stockReserved.stockLevel || !stockReserved.estimatedPrice || !stockReserved.fromDate || !stockReserved.toDate) {
      alert('Please fill in Stock Level, Estimated Price, and Date Range to save')
      return
    }

    try {
      const totalEstimatedPrice = (Number(stockReserved.stockLevel) || 0) * (Number(stockReserved.estimatedPrice) || 0)
      const payload = {
        ...stockReserved,
        totalEstimatedPrice,
      }

      console.log('Attempting to save stock reserved to Supabase...', payload)
      const resp = await saveStockReservedToSupabase(payload, session)
      if (resp && resp.ok) {
        alert('Stock Reserved record saved successfully!')
        // Refresh local records if needed
        return true
      } else {
        console.error('Save failed:', resp.error)
        alert(`Failed to save: ${resp.error}`)
        return false
      }
    } catch (e) {
      console.error('Error saving stock reserved:', e)
      alert(`Error saving stock reserved: ${e.message || e}`)
      return false
    }
  }

  const handleOpenAuth = (mode = 'signin') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const handleAuthModeChange = (mode) => setAuthMode(mode)

  const handleAuthSuccess = (user) => {
    setAuthModalOpen(false)
    // Refresh session or any relevant state
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session)
      })
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 pb-14 ${lang === 'ta' ? 'text-xs lg:text-sm' : 'text-sm lg:text-base'}`}>
      <div ref={rootRef} className="container-max">
        <header className="relative mb-6 rounded-3xl border border-white/70 bg-[#fff9ff] px-4 pb-5 pt-12 shadow-sm backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-5">
          <div className="absolute left-3 top-3 sm:left-5 sm:top-4">
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)} 
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#fce4ec' }}
            >
              <option value="en">ENG</option>
              <option value="ta">தமிழ்</option>
              <option value="si">සිංහල</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:right-5 sm:top-4"
            aria-label={t('openDashboardMenu')}
          >
            <span className="text-lg leading-none">☰</span>
            <span className="hidden sm:inline">{t('dashboard')}</span>
          </button>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className={`font-bold leading-tight text-gray-800 ${lang === 'ta' ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}>
              {t('title')}
            </h1>
            <p className={`mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base ${lang === 'ta' ? 'text-xs sm:text-sm' : ''}`}>
              {t('subtitle')}
            </p>
          </div>
        </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <button
              type="button"
              onClick={() => setOwnerCount(ownerCount === 1 ? 2 : 1)}
              className="w-full mb-6 py-4 px-6 rounded-[28px] bg-white border-none android-shadow flex items-center justify-between group transition-all active:scale-[0.98] hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-xl shadow-lg transform group-hover:rotate-12 transition-transform">
                  {ownerCount === 1 ? '👤' : '👥'}
                </div>
                <div className="text-left">
                  <div className="text-base font-bold text-slate-900 tracking-tight">{ownerCount === 1 ? (t ? t('singleOwner') : 'Single Owner') : (t ? t('twoOwners') : 'Two Owners')}</div>
                  <div className="text-xs text-slate-500 font-medium opacity-80">{t ? t('toggleOwnerCount') : 'Tap to switch owner count'}</div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-inner">
                <span className="text-lg">⇄</span>
              </div>
            </button>

            <InputSection 
              inputs={inputs} 
              setInput={setInputs} 
              reset={() => {
                reset();
                setStockReserved({
                  stockLevel: '',
                  stockUnit: 'bags',
                  estimatedPrice: '',
                  selectedLocations: [],
                  fromDate: '',
                  toDate: '',
                });
              }} 
              toggleLoans={toggleLoans} 
              t={t} 
              lang={lang} 
              setLang={setLang} 
              customLocations={customLocations} 
              ownerNames={activeOwnerNames} 
              ownerCount={ownerCount} 
              stockReserved={stockReserved} 
              setStockReserved={setStockReserved}
              stockSource={stockSource} 
              setStockSource={setStockSource} 
              saveStockReserved={saveStockReserved}
              results={results}
              bagCostPerUnit={results?.bagCostPerUnit || inputs.bagCostPerUnit || 0}
            />

            {/* Disaster Recovery toggle and card */}
            <div className="mt-4 flex flex-col items-center w-full">
              <div className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
                <AccordionCard
                  title={t('disasterExpenses')}
                  icon={<span className="text-2xl">🌊</span>}
                  defaultOpen={showDisasterRecovery}
                  bgColor="#ffe4ef"
                >
                  <DisasterRecoveryCard
                    value={disasterRecovery}
                    onChange={(field, val) => setDisasterRecovery(prev => ({ ...prev, [field]: val }))}
                    t={t}
                  />
                </AccordionCard>
              </div>
            </div>
          </div>

          <div>
            {results ? (
                <div className="android-shadow rounded-[32px] p-6 bg-slate-900 text-white relative overflow-hidden group border border-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                <h3 className="text-base font-black text-sky-400 mb-5 uppercase tracking-widest">{t('summary')}</h3>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('netBags')}</span>
                    <strong className="text-base sm:text-xl font-mono text-white">{results.netBags}</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('saltNetWeight')}</span>
                    <strong className="text-base sm:text-xl font-mono text-white">{formatKg(results.netBags * 50)}</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('initialPrice')}</span>
                    <strong className="text-sm sm:text-xl font-mono text-white text-right">{formatLKR(results.initialPrice)}</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('contractorSpent')}</span>
                    <strong className="text-sm sm:text-xl font-mono text-white text-right">{formatLKR(results.contractorTotalSpent)}</strong>
                  </div>
                  <div className="my-6 border-t border-white/30 border-dashed"></div>
                  {/* Disaster Expenses Summary - always show if any data present */}
                  {(
                    Number(disasterRecovery.pondsReconstruction) ||
                    Number(disasterRecovery.hutReconstruction) ||
                    Number(disasterRecovery.electricityBills) ||
                    Number(disasterRecovery.compensationReceived) ||
                    Number(disasterRecovery.donationsReceived) ||
                    Number(disasterRecovery.lossQuantity)
                  ) ? (
                    <div className="flex justify-between items-center bg-rose-100/90 p-3 rounded-2xl border border-rose-200 my-4">
                      <span className="text-rose-700 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <span className="text-lg">🌊</span> {t('disasterExpenses')}
                      </span>
                      <strong className={`text-sm sm:text-lg font-mono text-right ${(() => {
                        const totalExp = (Number(disasterRecovery.pondsReconstruction) || 0) + (Number(disasterRecovery.hutReconstruction) || 0) + (Number(disasterRecovery.electricityBills) || 0)
                        const totalInc = (Number(disasterRecovery.compensationReceived) || 0) + (Number(disasterRecovery.donationsReceived) || 0)
                        const lossValue = (disasterRecovery.lossUnit === 'kg' ? (disasterRecovery.lossQuantity / 50) : (disasterRecovery.lossQuantity || 0)) * (inputs.pricePerBag || 0)
                        const net = totalInc - totalExp - lossValue
                        return net < 0 ? 'text-rose-600' : 'text-emerald-700'
                      })()}`}>
                        {(() => {
                          const totalExp = (Number(disasterRecovery.pondsReconstruction) || 0) + (Number(disasterRecovery.hutReconstruction) || 0) + (Number(disasterRecovery.electricityBills) || 0)
                          const totalInc = (Number(disasterRecovery.compensationReceived) || 0) + (Number(disasterRecovery.donationsReceived) || 0)
                          const lossValue = (disasterRecovery.lossUnit === 'kg' ? (disasterRecovery.lossQuantity / 50) : (disasterRecovery.lossQuantity || 0)) * (inputs.pricePerBag || 0)
                          const net = totalInc - totalExp - lossValue
                          return formatLKR(net)
                        })()}
                      </strong>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center px-1">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('contractorShare')}</span>
                    <strong className="text-sm sm:text-lg font-mono text-emerald-400 text-right">{formatLKR(results.contractorShare)}</strong>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{ownerCount === 1 ? t('ownerPool') : t('perOwnerShare')}</span>
                    <strong className="text-sm sm:text-lg font-mono text-sky-400 text-right">{formatLKR(results.generalSharePerOwner)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="android-card bg-slate-50 p-8 text-center border-none ring-1 ring-inset ring-slate-100 italic text-slate-400">
                <div className="text-4xl mb-3 opacity-20">📊</div>
                {t('enterValues')}
              </div>
            )}
          </div>
        </div>


        {/* Disaster Recovery P&L summary */}
        {showDisasterRecovery && (
          <div className="mt-12 mb-12">
            <div className="android-card border border-rose-300 bg-rose-50 p-8 shadow-xl">
              <h3 className="text-xl font-black text-rose-900 mb-6 flex items-center gap-3">
                <span className="text-2xl">🌊</span> {t('disasterRecovery')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/40 p-4 rounded-2xl border border-rose-100">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">{t('pondsReconstruction')}</div>
                  <div className="text-lg font-mono font-bold text-slate-900">{formatLKR(disasterRecovery.pondsReconstruction || 0)}</div>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-rose-100">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">{t('hutReconstruction')}</div>
                  <div className="text-lg font-mono font-bold text-slate-900">{formatLKR(disasterRecovery.hutReconstruction || 0)}</div>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-rose-100">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">{t('electricityBills')}</div>
                  <div className="text-lg font-mono font-bold text-slate-900">{formatLKR(disasterRecovery.electricityBills || 0)}</div>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-rose-100">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">{t('compensationReceived')}</div>
                  <div className="text-lg font-mono font-bold text-slate-900">{formatLKR(disasterRecovery.compensationReceived || 0)}</div>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-rose-100">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">{t('donationsReceived')}</div>
                  <div className="text-lg font-mono font-bold text-slate-900">{formatLKR(disasterRecovery.donationsReceived || 0)}</div>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-rose-100">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">{t('lossQuantity')}</div>
                  <div className="text-base font-bold text-slate-900">{disasterRecovery.lossQuantity || 0} {t(disasterRecovery.lossUnit || 'bags')}</div>
                  <div className="text-[10px] text-rose-600 font-medium">Value: {formatLKR((disasterRecovery.lossUnit === 'kg' ? (disasterRecovery.lossQuantity / 50) : disasterRecovery.lossQuantity) * (inputs.pricePerBag || 0))}</div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-rose-400/80">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-rose-800 uppercase">{t('totalExpenses', 'Total Expenses')}</span>
                  <span className="text-2xl font-mono font-black text-rose-900">
                    {formatLKR((Number(disasterRecovery.pondsReconstruction) || 0) + (Number(disasterRecovery.hutReconstruction) || 0) + (Number(disasterRecovery.electricityBills) || 0))}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-rose-800 uppercase">Total Income</span>
                  <span className="text-2xl font-mono font-black text-emerald-700">
                    {formatLKR((Number(disasterRecovery.compensationReceived) || 0) + (Number(disasterRecovery.donationsReceived) || 0))}
                  </span>
                </div>
                <div className="flex flex-col p-4 rounded-3xl bg-white shadow-inner">
                  <span className="text-xs font-bold text-slate-500 uppercase">Net Variance</span>
                  {(() => {
                    const totalExp = (Number(disasterRecovery.pondsReconstruction) || 0) + (Number(disasterRecovery.hutReconstruction) || 0) + (Number(disasterRecovery.electricityBills) || 0)
                    const totalInc = (Number(disasterRecovery.compensationReceived) || 0) + (Number(disasterRecovery.donationsReceived) || 0)
                    const lossValue = (disasterRecovery.lossUnit === 'kg' ? (disasterRecovery.lossQuantity / 50) : (disasterRecovery.lossQuantity || 0)) * (inputs.pricePerBag || 0)
                    const net = totalInc - totalExp - lossValue
                    return (
                      <div className="flex flex-col">
                        <span className={`text-2xl font-mono font-black ${net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatLKR(net)}
                        </span>
                        <span className="text-[10px] font-bold tracking-tighter uppercase opacity-60">
                          {net < 0 ? '⚠️ Total Loss' : '✅ Recovery Profit'}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {results && <ResultSection results={results} t={t} ownerNames={activeOwnerNames} ownerCount={ownerCount} />}

        {/* Hidden/off-screen printable area */}
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
              <div className="section">
                <div className="row"><div className="muted">{t('locationDay')}</div><div className="value">{inputs.location || '-'}</div></div>
                <div className="row"><div className="muted">{t('date')}</div><div className="value">{inputs.date || '-'}</div></div>
                <div className="row"><div className="muted">{t('buyerName')}</div><div className="value">{inputs.buyerName || '-'}</div></div>
                <div className="row"><div className="muted">{t('billNumber')}</div><div className="value">{inputs.billNumber || '-'}</div></div>
              </div>
              <div className="section" style={{ borderTop: '0.5pt solid #eee', paddingTop: '4pt' }}>
                <div className="row"><div className="muted">{t('netBags')}</div><div className="value">{results.netBags}</div></div>
                <div className="row"><div className="muted">{t('initialPrice')}</div><div className="value">{formatLKR(results.initialPrice)}</div></div>
                <div className="row"><div className="muted">{t('contractorSpent')}</div><div className="value">{formatLKR(results.contractorTotalSpent)}</div></div>
                <div className="row"><div className="muted">{t('contractorShare')}</div><div className="value">{formatLKR(results.contractorShare)}</div></div>
                <div className="row"><div className="muted">{ownerCount === 1 ? t('ownerPool') : t('perOwnerShare')}</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
              </div>

              <div className="section" style={{ borderTop: '0.5pt solid #eee', paddingTop: '4pt' }}>
                <h2>{t('finalResults')}</h2>
                <div className="row"><div className="muted">{activeOwnerNames[0] || t('owner') + ' 1'} - {t('finalShare')}</div><div className="value" style={{color: results.highlights.finalInayaNegative ? '#e11d48' : '#0ea5e9'}}>{formatLKR(results.finalInaya)}</div></div>
                {ownerCount === 2 && (
                  <div className="row"><div className="muted">{activeOwnerNames[1] || t('owner') + ' 2'} - {t('finalShare')}</div><div className="value" style={{color: results.highlights.finalShakiraNegative ? '#e11d48' : '#10b981'}}>{formatLKR(results.finalShakira)}</div></div>
                )}
                {results.loanInaya > 0 && <div className="row"><div className="muted">{activeOwnerNames[0]} {t('loan')}</div><div className="value">{formatLKR(results.loanInaya)}</div></div>}
                {ownerCount === 2 && results.loanShakira > 0 && <div className="row"><div className="muted">{activeOwnerNames[1]} {t('loan')}</div><div className="value">{formatLKR(results.loanShakira)}</div></div>}
              </div>

              <div className="section" style={{ borderTop: '0.5pt solid #eee', paddingTop: '4pt' }}>
                 <div className="row"><div className="muted">{activeOwnerNames[0]} {t('zakatLabel')}</div><div className="value">{formatLKR(results.zakatInaya)}</div></div>
                 <div className="row"><div className="muted">{activeOwnerNames[0]} {t('afterZakatLabel')}</div><div className="value">{formatLKR(results.finalInayaAfterZakat)}</div></div>
                 {ownerCount === 2 && (
                   <>
                     <div className="row"><div className="muted">{activeOwnerNames[1]} {t('zakatLabel')}</div><div className="value">{formatLKR(results.zakatShakira)}</div></div>
                     <div className="row"><div className="muted">{activeOwnerNames[1]} {t('afterZakatLabel')}</div><div className="value">{formatLKR(results.finalShakiraAfterZakat)}</div></div>
                   </>
                 )}
              </div>
            </div>
          </div>
        )}

      </div>



      <DashboardSummary
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        session={session}
        onOpenAuth={handleOpenAuth}
        onSignOut={handleSignOut}
        reports={reports}
        savedFiles={savedFiles}
        onLoadReports={() => loadReports(session)}
        onLoadSavedFiles={() => loadSavedFiles(session)}
        onDeleteReport={async (id) => {
          if (!session?.user?.id) return
          const { error } = await supabase.from('reports').delete().eq('id', id).eq('user_id', session.user.id)
          if (!error) loadReports(session)
        }}
        onDeleteFile={async (id) => {
          if (!session?.user?.id) return
          const { error } = await supabase.from('saved_files').delete().eq('id', id).eq('user_id', session.user.id)
          if (!error) loadSavedFiles(session)
        }}
        customLocations={customLocations}
        onAddLocation={(name) => setCustomLocations([...customLocations, name])}
        onDeleteLocation={(name) => setCustomLocations(customLocations.filter(l => l !== name))}
        ownerNames={ownerNames}
        setOwnerNames={setOwnerNames}
        contractorSharePercentage={contractorSharePercentage}
        onContractorSharePercentageChange={setContractorSharePercentage}
        t={t}
        billingStatus={billingStatus}
        onStartCardPayment={handleStartCardPayment}
        onRequestCashPayment={handleRequestCashPayment}
        stripeFeePreview={stripeFeePreview}
        paymentBusy={paymentBusy}
        isAdmin={isAdmin}
        pendingPaymentRequests={pendingPaymentRequests}
        onRefreshPendingPaymentRequests={refreshPendingPaymentRequests}
        onActivatePaymentRequest={handleAdminActivatePaymentRequest}
        adminActionBusy={adminActionBusy}
        onOpenAdminAuth={() => setAdminAuthModalOpen(true)}
      />

      <AuthModal
        open={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onModeChange={handleAuthModeChange}
        onSuccess={handleAuthSuccess}
        t={t}
      />

      <AdminAuthModal 
        open={adminAuthModalOpen}
        onClose={() => setAdminAuthModalOpen(false)}
      />

      <BottomAccessMenu
        onDownloadPDF={downloadPDF}
        onSave={saveCurrentReport}
        onCloud={() => {
          setMenuOpen(true);
          setTimeout(() => {
            const filesTab = document.querySelector('[data-tab="files"]');
            if (filesTab) filesTab.click();
          }, 100);
        }}
        onPL={() => {
          // Scroll to results section if available
          const resultsSection = document.querySelector('.android-shadow.rounded-[32px]');
          if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
        onDashboard={() => setMenuOpen(true)}
      />
    </div>
  )
}
