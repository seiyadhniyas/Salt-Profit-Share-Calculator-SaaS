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
import { saveStockReservedToSupabase, getStockReservedRecords } from './api/stockReserved.js'
import { getBillingStatus, consumeTrialUse, createStripeCheckoutSession, requestCashPayment, getAdminPendingPayments, activatePaymentRequestAsAdmin } from './api/billing.js'
import { useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient.js'
import TenantSwitcher from './components/TenantSwitcher.jsx'
import { createTenant, listTenantsForUser } from './api/tenants.js'
import { getUserRole, canEdit } from './api/roles.js'
import RedesignedHeader from './components/RedesignedHeader.jsx'
import BottomAccessMenu from './components/BottomAccessMenu.jsx'
import AccordionCard from './components/AccordionCard.jsx'
import validateModule from './utils/validator.js'
import Toaster from './components/Toaster.jsx'
import { logEvent, sanitizeInputs } from './utils/eventLogger.js'
import AiEventsViewer from './components/AiEventsViewer.jsx'
import { getLocalSuggestions } from './utils/aiAssistClient.js'

const STORAGE_KEY = 'salt_profit_share_last'

export default function App(){
  // if (!isSupabaseConfigured || !supabase) {
  //   return (
  //     <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#1e293b' }}>
  //       <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>Supabase Not Configured</h1>
  //       <p style={{ fontSize: 18, maxWidth: 480, textAlign: 'center' }}>
  //         Please set your Supabase credentials in a <code>.env</code> file at the project root.<br />
  //         Example:<br />
  //         <code>VITE_SUPABASE_URL=...</code><br />
  //         <code>VITE_SUPABASE_ANON_KEY=...</code>
  //       </p>
  //       <p style={{ marginTop: 32, color: '#ef4444', fontWeight: 600 }}>
  //         The app cannot function without these values.<br />
  //         See <a href="https://supabase.com/docs/guides/getting-started" target="_blank" rel="noopener noreferrer">Supabase Docs</a> for help.
  //       </p>
  //     </div>
  //   )
  // }
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
    advancePayments: [],
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

  useEffect(() => {
    if (!session?.user?.id) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('dashboard') === '1') {
      setMenuOpen(true)
      const cleanUrl = `${window.location.origin}${window.location.pathname}`
      window.history.replaceState(null, '', cleanUrl)
    }
  }, [session])

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
      totalCurrentSaltSale: 'Total Current Salt Sale',
        // Disaster Recovery
          disasterRecovery: 'Disaster Recovery Expenses',
          addDisasterRecovery: 'Add Disaster Recovery Expenses',
          disasterExpenses: 'Disaster Expenses',
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
      addExpenses: 'add expenses',
      costResponsibility: 'COST RESPONSIBILITY',
      addOperationalCost: 'ADD OPERATIONAL COST',
      addAdvancePayment: 'ADD ADVANCE PAYMENT',
      noAdvancePayments: 'No advance payments recorded',
      advancePaymentsGiven: 'Contractor Advance Payment',
      paidBy: 'Paid by',
      advancePaid: 'Advance Paid',
      dateOfPayment: 'Date',
      advanceReasonPlaceholder: 'e.g., partial mobilization',
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
      downloadedFiles: 'Downloaded Files',
      downloadedFilesNote: 'PDF/Excel exports saved to cloud storage',
      noDownloadsYet: 'No downloads yet',
      downloadHistory: 'Download History',
      downloadHistoryDescription: 'Exported reports and downloadable files from your account.',
      noDownloadHistory: 'No downloads have been created yet. Save a report or export a PDF to create a history entry.',
      reportRevenueTotal: 'Aggregate from saved reports',
      cloudReportsNote: 'Secure P&L report history in the cloud',
      entries: 'ENTRIES',
      files: 'FILES',
      trialRemaining: 'Remaining Trial',
      pendingAdminApprovalNote: 'Awaiting admin approval',
      premiumPaidNote: 'Full access granted',
      vaultDescription: 'Saved sales records, P&L reports and download history.',
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
      totalDistributed: 'Total Distribution',
      labourDetails: 'Labour Details',
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
      guestMember: 'Guest Member',
      trialUses: 'Trial Uses',
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
      addLabourCostEntry: 'ADD LABOUR COST ENTRY',
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
      selectLocationToAdd: 'SELECT LOCATION TO ADD...',
      addNewLocation: 'OR ADD NEW LOCATION',
      cancelManualEntry: '- CANCEL MANUAL ENTRY',
      enterLocationName: 'Enter location name',
      add: 'ADD',
      noLocationsAvailable: 'No locations available. Add locations in Dashboard.',
      fromDate: 'FROM DATE',
      toDate: 'TO DATE',
      packingCostBreakdown: 'PACKING COST DETAILS',
      fromLabourCard: 'from Labour Cost section',
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
      freshAmount: 'New Salt from Harvest',
      reservedAmount: 'From Stored Inventory',
      freshlyHarvestedDesc: 'New salt from harvest',
      soldReservedStockDesc: 'From stored inventory',
      mixedStockDesc: 'Combination of both',
      // Auth translations
      memberAccess: 'Member Access',
      signIn: 'Sign In',
      createAccount: 'Create Account',
      register: 'Register',
      close: 'Close',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      backToSignIn: 'Back to Sign In',
      pleaseWait: 'Please wait...',
      sendResetInstructions: 'Send Reset Instructions',
      signInToDashboard: 'Sign In To Dashboard',
      authFooterNote: 'This dashboard is designed for lifetime members of the Saltern Welfare Society. Calculator logic stays unchanged after sign in.',
      supabaseNotConfigured: 'Supabase is not configured locally yet. Create a',
      supabaseNotConfiguredSuffix: 'from the example file.',
      authSupabaseMissing: 'Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your env file.',
      authPasswordsMismatch: 'Passwords do not match.',
      authAccountCreated: 'Account created successfully!',
      authConfirmationEmailSent: 'A confirmation email has been sent to',
      authVerifyThenSignIn: 'Please click the link in the email to verify your account, then sign in with your credentials.',
      authFailedTryAgain: 'Authentication failed. Please try again.',
      emailRequired: 'Email is required to reset password.',
      resetEmailSent: 'Password reset instructions sent to your email.',
      // Admin auth
      adminAuthRequired: 'Admin Authentication',
      adminAuthSuccess: 'Authentication Successful',
      adminDashboard: 'Admin Dashboard',
      redirectingToDashboard: 'Redirecting to dashboard...',
      secureVault: 'Secure Vault',
      cloudDataVault: 'Cloud Data Vault',
      memberManagement: 'Member Management',
      profileSettings: 'Profile Settings',
      paymentStatus: 'Payment Status',
      subscriptionStatus: 'Subscription Status',
      account: 'Account',
      signOut: 'Sign Out',
      pricingAndAccess: 'PRICING & ACCESS',
      oneOffPrice: 'ONE-OFF: LKR 30,000',
      lifetimeAccessPromo: 'PROMO: Full access for LKR 30,000 lifetime.',
      cardSurchargeNote: '*Card payments include LKR 1,100 surcharge.',
      payByCard: 'PAY BY CARD',
      cashOrBank: 'CASH / BANK',
      workLocations: 'WORK LOCATIONS',
      newLocationName: 'NEW LOCATION NAME',
      ownerNamesTitle: 'OWNER NAMES',
      owner1Name: 'Owner 1 Name',
      owner2Name: 'Owner 2 Name',
      pond: 'Pond',
      leeway: 'Leeway',
      saltern: 'Saltern',
      extraExpenses: 'Extra Expenses',
      labourCostsTotal: 'Labour Costs (Total)',
      amount: 'Amount',
      adminAccess: 'Admin Access',
      signInRegister: 'Sign In / Register',
      setup: 'Setup',
      locationDateBuyer: 'Location, Date & Buyer',
      revenue: 'Revenue',
      bagsPriceSource: 'Bags, Price & Source',
      costs: 'Costs',
      expensesFees: 'Expenses & Fees',
      labour: 'Labour',
      serviceLog: 'Service Log',
      inventory: 'Inventory',
      stockReservedSub: 'Stock Reserved',
      disaster: 'Disaster',
      recoveryCosts: 'Recovery Costs',
      setupData: 'Setup Data',
      revenueData: 'Revenue Data',
      costsData: 'Costs Data',
      labourData: 'Labour Data',
      inventoryData: 'Inventory Data',
      disasterData: 'Disaster Data',
      // Contact Form Translations
      contactUs: 'Contact Us',
      fullName: 'Full Name',
      fullNameRequired: 'Please enter your full name',
      enterFullName: 'Enter your full name',
      enterEmail: 'Enter your email address',
      phoneNumber: 'Phone Number',
      phoneRequired: 'Please enter your phone number',
      enterPhone: 'Enter your phone number',
      phone: 'Phone',
      company: 'Company/Business Name',
      enterCompany: 'Enter company/business name (optional)',
      preferredContactMethod: 'Preferred Contact Method',
      whatsapp: 'WhatsApp',
      message: 'Message (Optional)',
      enterMessage: 'Tell us about your inquiry...',
      note: 'Note',
      adminWillVerify: 'Our team will verify your details and contact you within 24 hours to discuss your payment options.',
      adminWillContact: 'Our admin team will contact you within 24 hours.',
      cancel: 'Cancel',
      submit: 'Submit',
      submitting: 'Submitting...',
      submitError: 'Error submitting form. Please try again.',
      thankYou: 'Thank You!',
      contactFormSubmitted: 'Your request has been submitted successfully.',
      missing_location: 'Please select a Location.',
      missing_date: 'Please enter a Date.',
      missing_packedBags: 'Enter total packed bags (must be > 0).',
      missing_pricePerBag: 'Enter price per bag (must be > 0).',
      missing_reserved_stock: "No reserved stock available. Add details in 'Stock Reserved' card first.",
      recommended_costs: 'Consider adding packing fee, bag cost, or other expenses for accurate results.',
      recommended_labour: 'No labour entries found. Add labour costs if applicable.',
      missing_mixed_amounts: 'Provide both Fresh and Reserved amounts for Mixed stock.',
      done: 'Done',
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
      totalCurrentSaltSale: 'மொத்த தற்போதைய உப்பு விற்பனை',
        // Disaster Recovery
          disasterRecovery: 'பேரழிவு மீட்பு செலவுகள்',
          addDisasterRecovery: 'பேரழிவு மீட்பு செலவுகளைச் சேர்க்கவும்',
          disasterExpenses: 'பேரழிவு செலவுகள்',
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
      addExpenses: 'செலவுகளை சேர்க்க',
      costResponsibility: 'செலவு பொறுப்பு',
      addOperationalCost: 'செயல்பாட்டு செலவைச் சேர்க்கவும்',
      addAdvancePayment: 'முன்கட்டணத்தை சேர்க்கவும்',
      noAdvancePayments: 'முன்கட்டணங்கள் பதிவாகவில்லை',
      advancePaymentsGiven: 'ஒப்பந்ததாரருக்கான முன்கட்டணம்',
      paidBy: 'இயற்றியவர்',
      advancePaid: 'முன்கட்டணம்',
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
      downloadedFiles: 'பதிவிறக்கப்பட்ட கோப்புகள்',
      downloadedFilesNote: 'PDF/Excel ஏற்றுமதி கோப்புகள் மேக சேமிப்பில் சேமிக்கப்பட்டன',
      noDownloadsYet: 'இன்னும் பதிவிறக்கங்கள் இல்லை',
      downloadHistory: 'பதிவு வரலாறு',
      downloadHistoryDescription: 'உங்கள் கணக்கில் ஏற்றுமதி செய்யப்பட்ட அறிக்கைகள் மற்றும் பதிவிறக்கக் கோப்புகள்.',
      noDownloadHistory: 'இன்னும் எந்த பதிவிறக்கம் வரலாறும் உருவாக்கப்படவில்லை. வரலாறை உருவாக்க ஒரு அறிக்கையை சேமிக்கவும் அல்லது PDF ஐ ஏற்றுமதி செய்யவும்.',
      reportRevenueTotal: 'சேமிக்கப்பட்ட அறிக்கைகளில் இருந்து சராசரி',
      cloudReportsNote: 'மேகத்தில் பாதுகாப்பான P&L அறிக்கை வரலாறு',
      entries: 'நூல்கள்',
      files: 'கோப்புகள்',
      trialRemaining: 'மீதமுள்ள சோதனை',
      pendingAdminApprovalNote: 'உங்கள் கட்டணம் நிர்வாகி அனுமதிக்கப்படுவதற்காக காத்திருக்கிறது',
      premiumPaidNote: 'முழு அணுகல் வழங்கப்பட்டது',
      vaultDescription: 'சேமிக்கப்பட்ட விற்பனை பதிவுகள், P&L அறிக்கைகள் மற்றும் பதிவிறக்கம் வரலாறு.',
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
      totalDistributed: 'மொத்த விநியோகம்',
      labourDetails: 'தொழிலாளர் விவரங்கள்',
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
      guestMember: 'பார்வையாளர் உறுப்பினர்',
      trialUses: 'சோதனை பயன்பாடுகள்',
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
      addLabourCostEntry: 'தொழிலாளர் செலவுப் பதிவைச் சேர்க்கவும்',
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
      selectLocationToAdd: 'சேர்க்க இடத்தைத் தேர்ந்தெடுக்கவும்...',
      addNewLocation: 'அல்லது புதிய இடத்தைச் சேர்க்கவும்',
      cancelManualEntry: '- கைமுறை உள்ளீட்டை ரத்து செய்க',
      enterLocationName: 'இடப் பெயரை உள்ளிடவும்',
      add: 'சேர்க்க',
      noLocationsAvailable: 'இடங்கள் கிடைக்கவில்லை. டாஷ்போர்டில் இடங்களைச் சேர்க்கவும்.',
      fromDate: 'தொடக்க தேதி',
      toDate: 'முடிவு தேதி',
      packingCostBreakdown: 'பொதி கட்டும் செலவு விவரங்கள்',
      fromLabourCard: 'தொழிலாளர் செலவுப் பிரிவிலிருந்து',
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
      freshAmount: 'அறுவடையில் இருந்து புதிய உப்பு',
      reservedAmount: 'சேமிக்கப்பட்ட இருப்பில் இருந்து',
      freshlyHarvestedDesc: 'அறுவடையில் இருந்து புதிய உப்பு',
      soldReservedStockDesc: 'சேமிக்கப்பட்ட இருப்பில் இருந்து',
      mixedStockDesc: 'இரண்டின் கலவையும்',
      // Auth translations
      memberAccess: 'உறுப்பினர் அணுகல்',
      signIn: 'உள்நுழைய',
      createAccount: 'கணக்கை உருவாக்கு',
      register: 'பதிவு செய்ய',
      close: 'மூடு',
      email: 'மின்னஞ்சல்',
      password: 'கடவுச்சொல்',
      confirmPassword: 'கடவுச்சொல்லை உறுதிப்படுத்து',
      forgotPassword: 'கடவுச்சொல்லை மறந்துவிட்டீர்களா?',
      backToSignIn: 'உள்நுழைவுக்கு திரும்பு',
      pleaseWait: 'தயவுசெய்து காத்திருங்கள்...',
      sendResetInstructions: 'மீட்டமை வழிமுறைகளை அனுப்பு',
      signInToDashboard: 'டாஷ்போர்டுக்கு உள்நுழைய',
      authFooterNote: 'இந்த டாஷ்போர்ட் சால்டர்ன் வெல்ஃபேர் சொசைட்டியின் வாழ்நாள் உறுப்பினர்களுக்கு வடிவமைக்கப்பட்டது. உள்நுழைவுக்குப் பிறகு கணக்கீட்டு தர்க்கம் மாறாமல் இருக்கும்.',
      supabaseNotConfigured: 'சூபாபேஸ் இன்னும் உள்ளூரில் கட்டமைக்கப்படவில்லை. உதாரண கோப்பில் இருந்து ஒன்றை உருவாக்கவும்',
      supabaseNotConfiguredSuffix: 'உதாரண கோப்பில் இருந்து.',
      authSupabaseMissing: 'சூபாபேஸ் சான்றுகள் இல்லை. உங்கள் env கோப்பில் VITE_SUPABASE_URL மற்றும் VITE_SUPABASE_ANON_KEY ஐச் சேர்க்கவும்.',
      authPasswordsMismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை.',
      authAccountCreated: 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது!',
      authConfirmationEmailSent: 'உறுதிப்படுத்தும் மின்னஞ்சல் அனுப்பப்பட்டது:',
      authVerifyThenSignIn: 'மின்னஞ்சலில் உள்ள இணைப்பை அழுத்தி கணக்கை உறுதி செய்து பின்னர் உள்நுழைக.',
      authFailedTryAgain: 'அங்கீகாரம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
      emailRequired: 'கடவுச்சொல்லை மீட்டமைக்க மின்னஞ்சல் தேவை.',
      resetEmailSent: 'கடவுச்சொல் மீட்டமை வழிமுறைகள் உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டன.',
      // Admin auth
      adminAuthRequired: 'நிர்வாகி அங்கீகாரம்',
      adminAuthSuccess: 'அங்கீகாரம் வெற்றிகரமாக முடிந்தது',
      adminDashboard: 'நிர்வாகி டாஷ்போர்ட்',
      redirectingToDashboard: 'டாஷ்போர்டுக்கு திருப்பி அனுப்பப்படுகிறது...',
      secureVault: 'பாதுகாப்பான பெட்டகம்',
      cloudDataVault: 'மேகக்கணி தரவு பெட்டகம்',
      memberManagement: 'உறுப்பினர் மேலாண்மை',
      profileSettings: 'சுயவிவர அமைப்புகள்',
      paymentStatus: 'கட்டண நிலை',
      subscriptionStatus: 'சந்தா நிலை',
      account: 'கணக்கு',
      signOut: 'வெளியேறு',
      pricingAndAccess: 'விலை மற்றும் அணுகல்',
      oneOffPrice: 'ஒரு முறை: LKR 30,000',
      lifetimeAccessPromo: 'சலுகை: வாழ்நாள் முழுவதும் முழு அணுகல் LKR 30,000.',
      cardSurchargeNote: '*அட்டை கொடுப்பனவுகளில் LKR 1,100 கூடுதல் கட்டணம் அடங்கும்.',
      payByCard: 'அட்டை மூலம் பணம் செலுத்துங்கள்',
      cashOrBank: 'ரொக்க / வங்கி',
      workLocations: 'பணி இடங்கள்',
      newLocationName: 'புதிய இடத்தின் பெயர்',
      ownerNamesTitle: 'உரிமையாளர் பெயர்கள்',
      owner1Name: 'உரிமையாளர் 1 பெயர்',
      owner2Name: 'உரிமையாளர் 2 பெயர்',
      pond: 'குளம்',
      leeway: 'லீவே (Leeway)',
      saltern: 'சால்டர்ன் (Saltern)',
      extraExpenses: 'கூடுதல் செலவுகள்',
      labourCostsTotal: 'தொழிலாளர் செலவுகள் (மொத்தம்)',
      adminAccess: 'நிர்வாக அணுகல்',
      signInRegister: 'உள்நுழைய / பதிவு செய்ய',
      setup: 'அமைப்பு',
      locationDateBuyer: 'இடம், தேதி மற்றும் வாங்குபவர்',
      revenue: 'வருவாய்',
      bagsPriceSource: 'மூட்டைகள், விலை மற்றும் மூலம்',
      costs: 'செலவுகள்',
      expensesFees: 'செலவுகள் மற்றும் கட்டணங்கள்',
      labour: 'தொழிலாளர்',
      serviceLog: 'பணிப் பதிவு',
      inventory: 'இருப்பு',
      stockReservedSub: 'சேமிக்கப்பட்ட இருப்பு',
      disaster: 'பேரழிவு',
      recoveryCosts: 'மீட்பு செலவுகள்',
      setupData: 'அமைப்பு தரவு',
      revenueData: 'வருவாய் தரவு',
      costsData: 'செலவு தரவு',
      labourData: 'தொழிலாளர் தரவு',
      inventoryData: 'இருப்பு தரவு',
      disasterData: 'பேரழிவு தரவு',
      // Contact Form Translations
      contactUs: 'எங்களைத் தொடர்பு கொள்ளுங்கள்',
      fullName: 'முழு பெயர்',
      fullNameRequired: 'தயவு செய்து உங்கள் முழு பெயரை உள்ளிடவும்',
      enterFullName: 'உங்கள் முழு பெயரை உள்ளிடவும்',
      enterEmail: 'உங்கள் மின்னஞ்சல் முகவரியை உள்ளிடவும்',
      phoneNumber: 'தொலைபேசி எண்',
      phoneRequired: 'தயவு செய்து உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்',
      enterPhone: 'உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்',
      phone: 'தொலைபேசி',
      company: 'நிறுவனம்/வணிக பெயர்',
      enterCompany: 'நிறுவனம்/வணிக பெயரை உள்ளிடவும் (விருப்பம்)',
      preferredContactMethod: 'விருப்பமான தொடர்பு முறை',
      whatsapp: 'WhatsApp',
      message: 'செய்தி (விருப்பம்)',
      enterMessage: 'உங்கள் விசாரணையைப் பற்றி எங்களுக்கு சொல்லுங்கள்...',
      note: 'குறிப்பு',
      adminWillVerify: 'எங்கள் குழு உங்கள் விவரங்களை சரிபார்த்து 24 மணிநேரத்தில் உங்களைத் தொடர்பு கொள்ளும்.',
      adminWillContact: 'எங்கள் நிர்வாகக் குழு 24 மணிநேரத்தில் உங்களைத் தொடர்பு கொள்ளும்.',
      cancel: 'ரத்து செய்',
      submit: 'சமர்ப்பி',
      submitting: 'சமர்ப்பிக்கப்பட்டு வருகிறது...',
      submitError: 'படிவத்தை சமர்ப்பிக்கும் போது பிழை ஏற்பட்டது. மீண்டும் முயற்சி செய்யவும்.',
      thankYou: 'நன்றி!',
      contactFormSubmitted: 'உங்கள் கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டுவிட்டது.',
      missing_location: 'இடத்தைத் தேர்ந்தெடுக்கவும்.',
      missing_date: 'தயவு செய்து தேதி உள்ளிடவும்.',
      missing_packedBags: 'மொத்த மூட்டைகள் (0-இற்கு மேல்) என்பதைக் குறிப்பிடவும்.',
      missing_pricePerBag: 'மூட்டை ஒன்றின் விலையை (LKR) உள்ளிடவும்.',
      missing_reserved_stock: "காப்பிடப்பட்ட சரக்குகள் இல்லை. 'Stock Reserved' கார்டில் விவரங்களை சேர்க்கவும்.",
      recommended_costs: 'துல்லியமான முடிவுகளுக்கு கட்டப்படுதல்/பை செலவுகளைச் சேர்க்க பரிந்துரைக்கப்படுகிறது.',
      recommended_labour: 'தொழிலாளர் செலவுகள் இல்லை. தேவையானால் சேர்க்கவும்.',
      missing_mixed_amounts: 'Mixed தேர்விற்கு Fresh மற்றும் Reserved அளவுகளை இரண்டையும் வழங்கவும்.',
      done: 'முடிந்தது',
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
      totalCurrentSaltSale: 'මුළු වත්මන් ලුණු විකිණීම',
        // Disaster Recovery
          disasterRecovery: 'ආපදා ප්‍රතිසාධන වියදම්',
          addDisasterRecovery: 'ආපදා ප්‍රතිසාධන වියදම් එක් කරන්න',
          disasterExpenses: 'ආපදා වියදම්',
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
      addExpenses: 'වියදම් එක් කරන්න',
      costResponsibility: 'වියදම් පිළිබඳ වගකීම',
      addOperationalCost: 'ක්‍රියාකාරක වියදමක් එක් කරන්න',
      addAdvancePayment: 'පෙර ගෙවීමක් එක් කරන්න',
      noAdvancePayments: 'පෙර ගෙවීම් සටහන් වී නැත',
      advancePaymentsGiven: 'කොන්ත්‍රාත්කරුට දෙන පෙර ගෙවීම',
      paidBy: 'ගෙවන මිනිස්සු',
      advancePaid: 'පෙර ගෙවීම්',
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
      downloadedFiles: 'බාගත් ගොනු',
      downloadedFilesNote: 'PDF/Excel නිකුත්කිරීම් cloud ගබඩාවට සුරැකිණි',
      noDownloadsYet: 'තවමත් බාගත කිරීම් නැත',
      downloadHistory: 'බාගැනීමේ ඉතිහාසය',
      downloadHistoryDescription: 'ඔබගේ ගිණුමෙන් අපනයනය කළ වාර්තා සහ බාගත කළ හැකි ගොනු.',
      noDownloadHistory: 'තවමත් බාගැනීමේ ඉතිහාසයක් තැනී නොමැත. ඉතිහාසයක් තැනීමට වාර්තාවක් සුරකින්න හෝ PDF/Excel ගොනුවක් අපනයනය කරන්න.',
      reportRevenueTotal: 'සුරකින ලද වාර්තා වලින් එකතු කළ ප්‍රමාණය',
      cloudReportsNote: 'මේඝයේ ආරක්ෂිත P&L වාර්තාවේ ඉතිහාසය',
      entries: 'එන්ට්‍රිස්',
      files: 'ගොනු',
      trialRemaining: 'ඉතිරි ප්‍රයෝගිකය',
      pendingAdminApprovalNote: 'සංග්‍රහණය අදාළ පරිපාලක අනුමැතිය සඳහා බලමින් පවතී',
      premiumPaidNote: 'සම්පූර්ණ ප්‍රවේශය ලබා දී ඇත',
      vaultDescription: 'සුරැකුණු විකිණීම් වාර්තා, P&L වාර්තා සහ බාගැනීමේ ඉතිහාසය.',
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
      totalDistributed: 'මුළු බෙදා හැරීම',
      labourDetails: 'සේවක විස්තර',
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
      guestMember: 'අමුත්තන් සාමාජිකයෙක්',
      trialUses: 'නිහාල් භාවිතයන්',
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
      addLabourCostEntry: 'සේවක වියදමක් එක් කරන්න',
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
      selectLocationToAdd: 'එක් කිරීමට ස්ථානය තෝරන්න...',
      addNewLocation: 'හෝ නව ස්ථානය එක් කරන්න',
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
      approxBagFormat: 'සමීප වශයෙන් මලු {qty} (50kg/මල්ල)',
      bagsFromKg: 'මලු (kg÷50)',
      stockSource: 'ලුණු ප‍්‍රභවය',
      soldReservedStock: 'ගබඩා කර ඇති තොග',
      freshlyHarvested: 'අලුත් අස්වැන්න',
      mixedStockReservedAndFresh: 'මිශ්‍ර තොග (ගබඩා කළ + අලුත්)',
      freshAmount: 'අස්වැන්නෙන් ලැබුණු අලුත් ලුණු',
      reservedAmount: 'ගබඩා කර ඇති තොගයෙන්',
      freshlyHarvestedDesc: 'අස්වැන්නෙන් ලැබුණු අලුත් ලුණු',
      soldReservedStockDesc: 'ගබඩා කර ඇති තොගයෙන්',
      mixedStockDesc: 'දෙකෙහිම එකතුව',
      // Auth translations
      memberAccess: 'සාමාජික ප්‍රවේශය',
      signIn: 'ලොග් වන්න',
      createAccount: 'ගිණුම් එකක් සාදන්න',
      register: 'ලියාපදිංචි වන්න',
      close: 'වසන්න',
      email: 'ඊමේල්',
      password: 'මුරපදය',
      confirmPassword: 'මුරපදය තහවුරු කරන්න',
      forgotPassword: 'මුරපදය අමතක වුණා ද?',
      backToSignIn: 'ලොග් වීමට නැවත යන්න',
      pleaseWait: 'කරුණාකර රැඳී සිටින්න...',
      sendResetInstructions: 'නැවත සකසුම් උපදෙස් එවන්න',
      signInToDashboard: 'ඩෑෂ්බෝර්ඩ් එකට ලොග් වන්න',
      authFooterNote: 'මෙම ඩෑෂ්බෝර්ඩ් එක සෝල්ටර්න් වෙල්ෆෙයා සොසයිටියේ ජීවිත කාලීන සාමාජිකයින් සඳහා නිර්මාණය කර ඇත. ලොග් වීමෙන් පසු ගණකයන්ත්‍රයේ තර්කය වෙනස් නොවේ.',
      supabaseNotConfigured: 'සුපාබේස් තවමත් දේශීයව වින්‍යාස කර නොමැත. උදාහරණ ගොනුවෙන් එකක් සාදන්න',
      supabaseNotConfiguredSuffix: 'උදාහරණ ගොනුවෙන්.',
      authSupabaseMissing: 'සුපාබේස් අක්තපත්‍ර නොමැත. ඔබේ env ගොනුවට VITE_SUPABASE_URL සහ VITE_SUPABASE_ANON_KEY එකතු කරන්න.',
      authPasswordsMismatch: 'මුරපද නොගැලපේ.',
      authAccountCreated: 'ගිණුම් සාර්ථකව නිර්මාණය විය!',
      authConfirmationEmailSent: 'තහවුරු කිරීමේ ඊමේල් එකක් එවන ලදී:',
      authVerifyThenSignIn: 'ඊමේල් එකේ සම්බන්ධතාවය ක්ලික් කර ගිණුම් තහවුරු කර ඊළඟට ලොග් වන්න.',
      authFailedTryAgain: 'සත්‍යාපනය අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.',
      emailRequired: 'මුරපදය නැවත සකස් කිරීමට ඊමේල් අවශ්‍යයි.',
      resetEmailSent: 'මුරපදය නැවත සකස් කිරීමේ උපදෙස් ඔබේ ඊමේල් එකට එවන ලදී.',
      // Admin auth
      adminAuthRequired: 'පරිපාලක සත්‍යාපනය',
      adminAuthSuccess: 'සත්‍යාපනය සාර්ථකයි',
      adminDashboard: 'පරිපාලක ඩෑෂ්බෝර්ඩ්',
      redirectingToDashboard: 'ඩෑෂ්බෝර්ඩ් එකට යොමු කරමින්...',
      secureVault: 'ආරක්ෂිත සේප්පුව',
      cloudDataVault: 'වලාකුළු දත්ත සේප්පුව',
      memberManagement: 'සාමාජික කළමනාකරණය',
      profileSettings: 'පැතිකඩ සැකසුම්',
      paymentStatus: 'ගෙවීම් තත්ත්වය',
      subscriptionStatus: 'දායකත්ව තත්ත්වය',
      account: 'ගිණුම',
      signOut: 'ලොග් අවුට් වන්න',
      pricingAndAccess: 'මිල ගණන් සහ ප්‍රවේශය',
      oneOffPrice: 'එක් වරක්: LKR 30,000',
      lifetimeAccessPromo: 'ප්‍රොමෝ: ජීවිත කාලයටම සම්පූර්ණ ප්‍රවේශය LKR 30,000.',
      cardSurchargeNote: '*කාඩ්පත් ගෙවීම් සඳහා LKR 1,100 අමතක අමතර ගාස්තුවක් ඇතුළත් වේ.',
      payByCard: 'කාඩ්පතෙන් ගෙවන්න',
      cashOrBank: 'මුදල් / බැංකු',
      workLocations: 'වැඩ කරන ස්ථාන',
      newLocationName: 'නව ස්ථාන නම',
      ownerNamesTitle: 'අයිතිකරුවන්ගේ නම්',
      owner1Name: 'අයිතිකරු 1 නම',
      owner2Name: 'අයිතිකරු 2 නම',
      pond: 'පොකුණ (Pond)',
      leeway: 'ලීවේ (Leeway)',
      saltern: 'ලුණු ලේවාය (Saltern)',
      extraExpenses: 'අමතර වියදම්',
      labourCostsTotal: 'සේවක වියදම් (මුළු)',
      adminAccess: 'පරිපාලක ප්‍රවේශය',
      signInRegister: 'ලොග් වන්න / ලියාපදිංචි වන්න',
      setup: 'සැකසුම්',
      locationDateBuyer: 'ස්ථානය, දිනය සහ ගැණුම්කරු',
      revenue: 'ආදායම',
      bagsPriceSource: 'මලු, මිල සහ ප්‍රභවය',
      costs: 'වියදම්',
      expensesFees: 'වියදම් සහ ගාස්තු',
      labour: 'සේවක',
      serviceLog: 'සේවා ලේඛනය',
      inventory: 'තොග',
      stockReservedSub: 'සුරක්ෂිත තොග',
      disaster: 'ආපදා',
      recoveryCosts: 'ප්‍රතිසාධන වියදම්',
      setupData: 'සැකසුම් දත්ත',
      revenueData: 'ආදායම් දත්ත',
      costsData: 'වියදම් දත්ත',
      labourData: 'සේවක දත්ත',
      inventoryData: 'තොග දත්ත',
      disasterData: 'ආපදා දත්ත',
      // Contact Form Translations
      contactUs: 'අපට සම්බන්ධ වන්න',
      fullName: 'සම්පූර්ණ නම',
      fullNameRequired: 'කරුණාකර ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න',
      enterFullName: 'ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න',
      enterEmail: 'ඔබගේ ඊමේල් ලිපිනය ඇතුළත් කරන්න',
      phoneNumber: 'දුරකතන අංකය',
      phoneRequired: 'කරුණාකර ඔබගේ දුරකතන අංකය ඇතුළත් කරන්න',
      enterPhone: 'ඔබගේ දුරකතන අංකය ඇතුළත් කරන්න',
      phone: 'දුරකතනය',
      company: 'සමාගම/ව්‍යාපාර හි නම',
      enterCompany: 'සමාගම/ව්‍යාපාර හි නම ඇතුළත් කරන්න (විකල්පක)',
      preferredContactMethod: 'කැමති සම්බන්ධතා ක්‍රමය',
      whatsapp: 'WhatsApp',
      message: 'පණිවිඩය (විකල්පක)',
      enterMessage: 'ඔබගේ ප්‍රශ්න ගැන අපට කියන්න...',
      note: 'සටහන',
      adminWillVerify: 'අපගේ කණ්ඩායම ඔබගේ විස්තර සත්‍යාපනය කර 24 ගණනාවට තුළ ඔබ සම්බන්ධ වනු ඇත.',
      adminWillContact: 'අපගේ පරිපාලක කණ්ඩායම 24 ගණනාවට තුළ ඔබ සම්බන්ධ වනු ඇත.',
      cancel: 'අවලංඝනය කරන්න',
      submit: 'ඉදිරිපත් කරන්න',
      submitting: 'ඉදිරිපත් කරමින් පවතී...',
      submitError: 'ෆෝරම ඉදිරිපත් කිරීමේ දී දෝෂ ඇතිවිය. කරුණාකර නැවත උත්සාහ කරන්න.',
      thankYou: 'ස්තූතියි!',
      contactFormSubmitted: 'ඔබගේ ඉල්ලීමය සফලව ඉදිරිපත් කරන ලදි.',
      missing_location: 'කරුණාකර ස්ථානය තෝරන්න.',
      missing_date: 'කරුණාකර දිනය ඇතුලත් කරන්න.',
      missing_packedBags: 'මුළු මලු ප්‍රමාණය ඇතුලත් කරන්න (0ට වඩා වැඩියෙන්).',
      missing_pricePerBag: 'මොට්ටියකට මිල (LKR) ඇතුලත් කරන්න.',
      missing_reserved_stock: "සුරකින්නා වූ ගබඩා නොමැත. 'Stock Reserved' කාඩ් එකේ විස්තර එකතු කරන්න.",
      recommended_costs: 'නිවැරදි ප්‍රතිඵල සඳහා packing fee, bag cost හෝ වෙනත් වියදම් එකතු කරන්න.',
      recommended_labour: 'වැඩ ගාස්තු නොමැත. අවශ්‍ය නම් එකතු කරන්න.',
      missing_mixed_amounts: 'Mixed තෝරන විට Fresh සහ Reserved ප්‍රමාණ දෙකම ලබා දෙන්න.',
      done: 'අවසන්',
    },
  }

  const t = (key) => {
    if (key === 'lang') return lang
    return (translations[lang] && translations[lang][key]) || key
  }

  const [toasts, setToasts] = useState([])
  const showToast = (message, type = 'info', timeout = 6000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts(prev => ([...prev, { id, message, type }]))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), timeout)
  }
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

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
  const [activeModule, setActiveModule] = useState(null)
  const [aiEventsOpen, setAiEventsOpen] = useState(false)
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

  const loadStockReserved = useCallback(async (activeSession = session) => {
    if (!isProdSupabase || !activeSession?.user?.id) return

    try {
      const resp = await getStockReservedRecords(activeSession)
      if (resp.ok && resp.records?.length > 0) {
        const latest = resp.records[0]
        setStockReserved({
          stockLevel: latest.stock_level,
          stockUnit: latest.stock_unit,
          estimatedPrice: latest.estimated_price,
          selectedLocations: latest.selected_locations || [],
          fromDate: latest.from_date,
          toDate: latest.to_date,
        })
      }
    } catch (e) {
      console.error('Error loading stock reserved:', e)
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
      loadStockReserved(session)
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
    // Guest member (not signed in) - limit to 3 uses via localStorage
    if (!session?.user?.id) {
      const guestUsesKey = 'guest_trial_uses'
      const guestUses = parseInt(localStorage.getItem(guestUsesKey) || '0', 10)
      
      if (guestUses >= 3) {
        const confirmPay = window.confirm(
          `You have used your 3 guest trial uses.\n\n` +
          `To continue saving reports:\n` +
          `✓ Sign in to use trial credits\n` +
          `✓ Pay for lifetime access (LKR 30,000)\n\n` +
          `Would you like to sign in or explore payment options?`
        )
        if (confirmPay) {
          handleOpenAuth('signin')
        }
        return false
      }
      
      // Increment guest use counter
      localStorage.setItem(guestUsesKey, String(guestUses + 1))
      return true
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

  const handleRequestCashPayment = async (contactFormData) => {
    if (!session?.user?.id) return
    try {
      setPaymentBusy(true)
      
      // Handle both old format (string buyerNote) and new format (contact form object)
      let buyerNote = ''
      if (typeof contactFormData === 'string') {
        buyerNote = contactFormData
      } else if (typeof contactFormData === 'object' && contactFormData) {
        // Build message from contact form data
        buyerNote = `
Name: ${contactFormData.fullName}
Phone: ${contactFormData.phoneNumber}
Company: ${contactFormData.company || 'N/A'}
Preferred Contact: ${contactFormData.preferredContactMethod}
Message: ${contactFormData.message || 'N/A'}
        `.trim()
      }
      
      await requestCashPayment({ session, amount: ONE_OFF_PRICE_LKR, buyerNote })
      // Success notification is shown in the ContactFormModal
    } catch (error) {
      throw error
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

  const reset = (force = false) => {
    // Check if location and date are provided (mandatory fields)
    if (!force && (!inputs.location || !inputs.date)) {
      // Scroll to input section
      inputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      alert('Please fill in Location and Date in Document Details before resetting.')
      return
    }
    
    // Reset inputs
    setInputs(prev => ({
      ...defaultInputs,
      location: force ? '' : prev.location,
      date: force ? '' : prev.date,
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

  const downloadCSV = async () => {
    const allowed = await ensurePremiumAccess()
    if (!allowed) return

    if (!results) return alert(t('noResultsToSave'))
    try {
      const csvData = []
      
      // Title
      csvData.push([t('title')])
      csvData.push(['Generated on', new Date().toLocaleDateString()])
      csvData.push([''])

      // Document Details Section
      csvData.push(['DOCUMENT DETAILS'])
      csvData.push(['Location', inputs.location || '-'])
      csvData.push(['Date', inputs.date || '-'])
      csvData.push(['Buyer Name', inputs.buyerName || '-'])
      csvData.push(['Bill Number', inputs.billNumber || '-'])
      csvData.push([''])

      // Revenue & Expenses Summary
      csvData.push(['SALT SALE SUMMARY'])
      csvData.push(['Packed Bags', inputs.packedBags || 0])
      csvData.push(['Deducted Bags', inputs.deductedBags || 0])
      csvData.push(['Net Bags', results.netBags || 0])
      csvData.push(['Price Per Bag (LKR)', inputs.pricePerBag || 0])
      csvData.push(['Initial Price (LKR)', results.initialPrice || 0])
      csvData.push([''])

      // Operational Costs Section
      csvData.push(['OPERATIONAL COSTS'])
      csvData.push(['Packing Fee Per Bag (LKR)', inputs.packingFeePerBag || 0])
      csvData.push(['Plastic Bag Cost (LKR)', inputs.bagCostPerUnit || 0])
      csvData.push(['Fixed Overheads (LKR)', inputs.otherExpenses || 0])
      
      if (results.extraExpensesTotal > 0) {
        csvData.push(['Extra Expenses (LKR)', results.extraExpensesTotal])
      }
      
      if (results.labourCostsTotal > 0) {
        csvData.push(['Labour Costs Total (LKR)', results.labourCostsTotal])
      }
      
      csvData.push(['Total Contractor Spent (LKR)', results.contractorTotalSpent || 0])
      csvData.push([''])

      // Settlement
      csvData.push(['NET SETTLEMENT'])
      csvData.push(['Physical Cash (LKR)', inputs.cashReceived || 0])
      csvData.push(['Bank Cheques (LKR)', inputs.chequeReceived || 0])
      csvData.push([''])

      // Profit Share Calculations
      csvData.push(['PROFIT SHARE CALCULATIONS'])
      csvData.push(['Contractor Share %', contractorSharePercentage || 0])
      csvData.push(['Expense Payment Mode', inputs.expensePayment === 'owners' ? 'Owners Responsibility' : inputs.expensePayment === 'contractor' ? 'Contractor Responsibility' : '50/50 Shared'])
      csvData.push([''])

      csvData.push(['GRAND TOTALS'])
      csvData.push(['Grand Total Received (LKR)', results.grandTotalReceived || 0])
      csvData.push(['Contractor Share (Gross) (LKR)', results.contractorShare || 0])
      csvData.push(['Contractor Advance Payment (LKR)', results.advancesTotal || 0])
      csvData.push(['Contractor Share (Net after Advances) (LKR)', results.contractorNetShare || 0])
      csvData.push(['Owners Group Amount (LKR)', results.ownerPool || 0])
      csvData.push(['Per Owner Share (LKR)', results.generalSharePerOwner || 0])
      csvData.push([''])

      // Owner Distribution
      if (ownerCount === 1) {
        csvData.push(['SINGLE OWNER DISTRIBUTION'])
        csvData.push(['Owner 1 Name', ownerNames[0] || 'Owner 1'])
        csvData.push(['Owner 1 Share Before Loan (LKR)', results.generalSharePerOwner || 0])
        if (inputs.bothOwnersHaveLoans) {
          csvData.push(['Owner 1 Loan (LKR)', inputs.loanInaya || 0])
          csvData.push(['Owner 1 Final Share (LKR)', results.finalInaya || 0])
        }
      } else {
        csvData.push(['TWO OWNERS DISTRIBUTION'])
        csvData.push(['Owner 1 Name', ownerNames[0] || 'Owner 1'])
        csvData.push(['Owner 1 Share Before Loan (LKR)', results.generalSharePerOwner || 0])
        if (inputs.bothOwnersHaveLoans) {
          csvData.push(['Owner 1 Loan (LKR)', inputs.loanInaya || 0])
        }
        csvData.push(['Owner 1 Final Share (LKR)', results.finalInaya || 0])
        
        csvData.push([''])
        csvData.push(['Owner 2 Name', ownerNames[1] || 'Owner 2'])
        csvData.push(['Owner 2 Share Before Loan (LKR)', results.generalSharePerOwner || 0])
        if (inputs.bothOwnersHaveLoans) {
          csvData.push(['Owner 2 Loan (LKR)', inputs.loanShakira || 0])
        }
        csvData.push(['Owner 2 Final Share (LKR)', results.finalShakira || 0])
      }
      csvData.push([''])

      // Zakat Information (if applicable)
      if (results.zakatInaya > 0 || results.zakatShakira > 0) {
        csvData.push(['ZAKAT CALCULATIONS'])
        if (ownerCount === 1) {
          csvData.push(['Owner 1 Zakat (LKR)', results.zakatInaya || 0])
          csvData.push(['Owner 1 After Zakat (LKR)', results.finalInayaAfterZakat || 0])
        } else {
          csvData.push(['Owner 1 Zakat (LKR)', results.zakatInaya || 0])
          csvData.push(['Owner 1 After Zakat (LKR)', results.finalInayaAfterZakat || 0])
          csvData.push(['Owner 2 Zakat (LKR)', results.zakatShakira || 0])
          csvData.push(['Owner 2 After Zakat (LKR)', results.finalShakiraAfterZakat || 0])
        }
        csvData.push([''])
      }

      // Society Service Charge (if applicable)
      if (results.societyServiceCharge > 0) {
        csvData.push(['SOCIETY SERVICE CHARGES'])
        csvData.push(['Service Charge Amount (LKR)', results.societyServiceCharge || 0])
        csvData.push(['Reserved 30% (LKR)', (results.societyServiceCharge * 0.30) || 0])
        csvData.push([''])
      }

      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => {
          const cellStr = String(cell || '')
          // Quote cells that contain commas
          return cellStr.includes(',') ? `"${cellStr}"` : cellStr
        }).join(',')
      ).join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      const fileName = `Report-${(inputs.location || 'Report').replace(/\s+/g, '-')}-${inputs.date || new Date().toISOString().split('T')[0]}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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
        await loadStockReserved(session)
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
  const handleCloseActiveModule = async () => {
    if (!activeModule) return setActiveModule(null)
    const issues = validateModule(activeModule, { inputs, stockReserved, ownerNames: activeOwnerNames, customLocations, ownerCount, stockSource })
    const sanitizedInputs = sanitizeInputs(inputs)
    const sanitizedStock = sanitizeInputs(stockReserved)
    if (issues && issues.length > 0) {
      issues.slice(0, 3).forEach(issue => {
        const translated = t(issue.messageKey)
        const message = (translated === issue.messageKey) ? issue.fallback : translated
        showToast(message, issue.type === 'warning' ? 'warning' : issue.type === 'error' ? 'error' : 'info')
      })

      const requestId = Date.now() + Math.floor(Math.random() * 1000)

      // Determine whether any issue should block closing the overlay
      // Only treat setup's missing location/date as blocking; all other pricing cards are non-blocking.
      const blockingKeys = [] // ['missing_location', 'missing_date'] - disabled blocking for now
      const hasBlocking = activeModule === 'setup' && issues.some(i => blockingKeys.includes(i.messageKey))

      // Log validation event (differentiate blocking vs non-blocking)
      try {
        await logEvent({
          type: hasBlocking ? 'validation_failure' : 'validation_warning',
          module: activeModule,
          action: hasBlocking ? 'close_attempt' : 'close_with_warnings',
          sessionUserId: session?.user?.id || null,
          lang,
          issues: issues.slice(0, 10),
          inputs: sanitizedInputs,
          stockReserved: sanitizedStock,
          requestId
        })
      } catch (e) {
        console.error('logEvent error', e)
      }

      // Request AI suggestions. For blocking issues we wait and surface suggestions before returning.
      const assistPayload = { module: activeModule, issues: issues.slice(0, 10), inputs: sanitizedInputs, lang, requestId }
      try {
        await logEvent({ type: 'assist_requested', module: activeModule, action: hasBlocking ? 'request' : 'request_non_blocking', sessionUserId: session?.user?.id || null, lang, issues: issues.slice(0, 5), requestId })
      } catch (e) {
        console.error('logEvent error', e)
      }

      if (hasBlocking) {
        try {
          const resp = await fetch('/.netlify/functions/aiAssist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assistPayload)
          })
          const data = await resp.json()
          if (data && data.ok) {
            if (data.source === 'rules' && Array.isArray(data.suggestions)) {
              data.suggestions.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
              await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules', sessionUserId: session?.user?.id || null, lang, suggestions: data.suggestions, requestId })
            } else if (data.source === 'llm') {
              const assistant = data.assistant || ''
              if (assistant) showToast(assistant, 'info', 12000)
              await logEvent({ type: 'assist_provided', module: activeModule, action: 'llm', sessionUserId: session?.user?.id || null, lang, assistant, requestId })
            }
          } else {
            // Server returned a non-ok response; fallback to client-side deterministic suggestions
            try {
              const fallback = getLocalSuggestions(issues, lang)
              fallback.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
              await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_fallback', sessionUserId: session?.user?.id || null, lang, suggestions: fallback, requestId })
            } catch (e) {
              console.error('fallback assist error', e)
            }
          }
        } catch (e) {
            console.error('AI assist error', e)
            // fallback to local suggestions on network/error
            try {
              const fallback = getLocalSuggestions(issues, lang)
              fallback.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
              await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_fallback', sessionUserId: session?.user?.id || null, lang, suggestions: fallback, requestId })
            } catch (e2) {
              console.error('fallback assist error', e2)
            }
        }

        return
      }

      // Non-blocking: fire-and-forget AI assist, close the overlay
      ;(async () => {
        try {
          const resp = await fetch('/.netlify/functions/aiAssist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assistPayload)
          })
          const data = await resp.json()
          if (data && data.ok) {
            if (data.source === 'rules' && Array.isArray(data.suggestions)) {
              data.suggestions.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
              await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_non_blocking', sessionUserId: session?.user?.id || null, lang, suggestions: data.suggestions, requestId })
            } else if (data.source === 'llm') {
              const assistant = data.assistant || ''
              if (assistant) showToast(assistant, 'info', 12000)
              await logEvent({ type: 'assist_provided', module: activeModule, action: 'llm_non_blocking', sessionUserId: session?.user?.id || null, lang, assistant, requestId })
            }
          } else {
            // server returned non-ok; fallback
            const fallback = getLocalSuggestions(issues, lang)
            fallback.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
            await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_fallback_non_blocking', sessionUserId: session?.user?.id || null, lang, suggestions: fallback, requestId })
          }
        } catch (e) {
          console.error('AI assist error (non-blocking)', e)
          try {
            const fallback = getLocalSuggestions(issues, lang)
            fallback.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
            await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_fallback_non_blocking', sessionUserId: session?.user?.id || null, lang, suggestions: fallback, requestId })
          } catch (e2) {
            console.error('fallback assist error', e2)
          }
        }
      })()

      try {
        await logEvent({
          type: 'module_closed',
          module: activeModule,
          action: 'close_with_warnings',
          sessionUserId: session?.user?.id || null,
          lang,
          inputs: sanitizedInputs,
          stockReserved: sanitizedStock
        })
      } catch (e) {
        console.error('logEvent error', e)
      }

      setActiveModule(null)
      return
    }

    // Log successful close
    try {
      await logEvent({
        type: 'module_closed',
        module: activeModule,
        action: 'close_success',
        sessionUserId: session?.user?.id || null,
        lang,
        inputs: sanitizedInputs,
        stockReserved: sanitizedStock
      })
    } catch (e) {
      console.error('logEvent error', e)
    }

    setActiveModule(null)
  }

  const handleRequestHelp = async () => {
    if (!activeModule) return
    const issues = validateModule(activeModule, { inputs, stockReserved, ownerNames: activeOwnerNames, customLocations, ownerCount, stockSource }) || []
    const sanitizedInputs = sanitizeInputs(inputs)
    const sanitizedStock = sanitizeInputs(stockReserved)
    const requestId = Date.now() + Math.floor(Math.random() * 1000)

    try {
      await logEvent({ type: 'assist_requested', module: activeModule, action: 'manual_request', sessionUserId: session?.user?.id || null, lang, issues: issues.slice(0, 10), inputs: sanitizedInputs, stockReserved: sanitizedStock, requestId })
    } catch (e) {
      console.error('logEvent error', e)
    }

    try {
      const resp = await fetch('/.netlify/functions/aiAssist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: activeModule, issues: issues.slice(0, 10), inputs: sanitizedInputs, lang, requestId })
      })
      const data = await resp.json()
      if (data && data.ok) {
        if (data.source === 'rules' && Array.isArray(data.suggestions)) {
          data.suggestions.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
          await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_manual', sessionUserId: session?.user?.id || null, lang, suggestions: data.suggestions, requestId })
        } else if (data.source === 'llm') {
          const assistant = data.assistant || ''
          if (assistant) showToast(assistant, 'info', 12000)
          await logEvent({ type: 'assist_provided', module: activeModule, action: 'llm_manual', sessionUserId: session?.user?.id || null, lang, assistant, requestId })
        }
      } else {
        // Fallback to client-side suggestions when server returns non-ok
        const fallback = getLocalSuggestions(issues, lang)
        fallback.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
        await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_fallback_manual', sessionUserId: session?.user?.id || null, lang, suggestions: fallback, requestId })
      }
    } catch (e) {
      console.error('AI assist error', e)
      // Fallback to client-side deterministic suggestions
      try {
        const fallback = getLocalSuggestions(issues, lang)
        fallback.slice(0, 3).forEach(s => showToast(s.suggestion || s, 'info', 10000))
        await logEvent({ type: 'assist_provided', module: activeModule, action: 'rules_fallback_manual', sessionUserId: session?.user?.id || null, lang, suggestions: fallback, requestId })
      } catch (e2) {
        console.error('fallback assist error', e2)
        showToast(t('assistFailed') || 'AI assist failed', 'warning')
      }
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-1 sm:p-4 pb-8 ${lang === 'ta' ? 'text-xs lg:text-sm' : 'text-sm lg:text-base'}`}>
      <div ref={rootRef} className="container-max">
        <header className="relative mb-6 rounded-3xl border border-white/70 bg-[#fff9ff] px-1 sm:px-6 pb-5 pt-6 shadow-sm backdrop-blur-sm sm:pb-6 sm:pt-2">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 pt-0 sm:px-0">
            <div className="flex items-center">
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

            <div className="flex justify-center items-center">
            </div>

            <div className="flex items-center justify-end gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAiEventsOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  aria-label="AI Events"
                >
                  <span className="text-lg leading-none">🧾</span>
                  <span className="hidden sm:inline">Events</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                aria-label={t('openDashboardMenu')}
              >
                <span className="text-lg leading-none">☰</span>
                <span className="hidden sm:inline">{t('dashboard')}</span>
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className={`font-bold leading-tight text-gray-800 ${lang === 'ta' ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}>
              {t('title')}
            </h1>
            <p className={`mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base ${lang === 'ta' ? 'text-xs sm:text-sm' : ''}`}>
              {t('subtitle')}
            </p>
          </div>
        </header>

        <AiEventsViewer isOpen={aiEventsOpen} onClose={() => setAiEventsOpen(false)} isAdmin={isAdmin} session={session} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <button
              type="button"
              onClick={() => setOwnerCount(ownerCount === 1 ? 2 : 1)}
              className="w-full mb-6 py-4 px-6 rounded-[28px] border-none android-shadow flex items-center justify-between group transition-all active:scale-[0.98] hover:opacity-95"
              style={{ backgroundColor: '#511600' }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg transform group-hover:rotate-12 transition-transform"
                  style={{ backgroundColor: '#ffedd5' }}
                >
                  {ownerCount === 1 ? '👤' : '👥'}
                </div>
                <div className="text-left">
                  <div className="text-base font-bold text-white tracking-tight">{ownerCount === 1 ? (t ? t('singleOwner') : 'Single Owner') : (t ? t('twoOwners') : 'Two Owners')}</div>
                  <div className="text-xs text-white/70 font-medium opacity-80">{t ? t('toggleOwnerCount') : 'Tap to switch owner count'}</div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-200/20 flex items-center justify-center text-orange-200 group-hover:bg-orange-200 group-hover:text-[#511600] transition-all shadow-inner">
                <span className="text-lg">⇄</span>
              </div>
            </button>

            <div className="flex justify-center my-4">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset all data?')) {
                    reset(true);
                    setStockReserved({ stockLevel: '', stockUnit: 'bags', estimatedPrice: '', selectedLocations: [], fromDate: '', toDate: '' });
                    setDisasterRecovery({
                      lossQuantity: '',
                      lossUnit: 'bags',
                      pondsReconstruction: '',
                      hutReconstruction: '',
                      electricityBills: '',
                      compensationReceived: '',
                      donationsReceived: '',
                    });
                  }
                }}
                className="px-8 py-3 bg-rose-600 text-white rounded-full font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>🔄</span> Reset All
              </button>
            </div>

            {/* Phase 1 Dashboard Grid Prototype */}
            <div className="grid grid-cols-2 gap-2 mb-8">
              {[
                { 
                  id: 'setup', 
                  title: t('setup'), 
                  sub: t('locationDateBuyer'), 
                  icon: '📋', 
                  color: 'bg-[#cdebf9]', 
                  num: '1',
                  filled: Boolean(inputs.location || inputs.date)
                },
                { 
                  id: 'revenue', 
                  title: t('revenue'), 
                  sub: t('bagsPriceSource'), 
                  icon: '💵', 
                  color: 'bg-[#ffe4c4]', 
                  num: '2',
                  filled: Boolean(inputs.packedBags > 0 || inputs.pricePerBag > 0)
                },
                { 
                  id: 'costs', 
                  title: t('costs'), 
                  sub: t('expensesFees'), 
                  icon: '🏭', 
                  color: 'bg-[#ffffd8]', 
                  num: '3',
                  filled: Boolean(inputs.packingFeePerBag > 0 || inputs.bagCostPerUnit > 0 || inputs.otherExpenses > 0 || (inputs.extraExpenses && inputs.extraExpenses.length > 0))
                },
                { 
                  id: 'labour', 
                  title: t('labour'), 
                  sub: t('serviceLog'), 
                  icon: '👷', 
                  color: 'bg-[#fad8fa]', 
                  num: '4',
                  filled: Boolean(inputs.labourCosts && inputs.labourCosts.length > 0)
                },
                { 
                  id: 'inventory', 
                  title: t('inventory'), 
                  sub: t('stockReservedSub'), 
                  icon: '📦', 
                  color: 'bg-[#ecffb1]', 
                  num: '2a',
                  filled: Boolean(stockReserved.stockLevel > 0)
                },
                { 
                  id: 'disaster', 
                  title: t('disaster'), 
                  sub: t('recoveryCosts'), 
                  icon: '🌊', 
                  color: 'bg-[#ffe4ee]', 
                  num: '3a',
                  filled: Boolean(disasterRecovery.lossQuantity > 0 || disasterRecovery.pondsReconstruction > 0)
                }
              ].map(module => (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`relative p-3 rounded-[32px] ${module.color} border-none android-shadow flex flex-col items-start text-left active:scale-95 transition-all group overflow-hidden h-[140px]`}
                >
                  <div className="absolute top-4 right-5 z-20">
                    <span className="text-xl font-black text-slate-900/20 group-hover:text-slate-900/40 transition-colors">
                      {module.num}
                    </span>
                  </div>
                  {module.filled && (
                    <div className="absolute bottom-2 right-2 z-20 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm animate-in zoom-in duration-300">
                      ✓
                    </div>
                  )}
                  <div className="absolute -top-2 -right-2 w-20 h-20 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-900/5 flex items-center justify-center text-2xl mb-3 z-10">
                    {module.icon}
                  </div>
                  <div className="z-10">
                    <div className="text-base font-bold text-slate-900 uppercase">{module.title}</div>
                    <div className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5 line-clamp-1 uppercase">{module.sub}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Module Overlay */}
            {activeModule && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
                <div 
                  className="w-full h-[92vh] sm:h-[85vh] sm:max-w-4xl bg-[#f8fafc] rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
                  style={{overflow: 'hidden'}}
                >
                  <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-xl">
                        {activeModule === 'setup' ? '📋' : activeModule === 'revenue' ? '💵' : activeModule === 'costs' ? '🏭' : activeModule === 'labour' ? '👷' : activeModule === 'inventory' ? '📦' : '🌊'}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t(activeModule + 'Data')}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRequestHelp}
                        title="Get Help"
                        className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors text-sm font-semibold"
                      >
                        💡 {(t && t('getHelp') && t('getHelp') !== 'getHelp') ? t('getHelp') : 'Get Help'}
                      </button>
                      <button 
                        onClick={handleCloseActiveModule}
                        className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    <InputSection 
                      inputs={inputs} 
                      setInput={setInputs} 
                      reset={() => {
                        reset();
                        setStockReserved({ stockLevel: '', stockUnit: 'bags', estimatedPrice: '', selectedLocations: [], fromDate: '', toDate: '' });
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
                      activeModule={activeModule}
                      bagCostPerUnit={results?.bagCostPerUnit || inputs.bagCostPerUnit || 0}
                      contractorSharePercentage={contractorSharePercentage}
                      disasterRecovery={disasterRecovery}
                      setDisasterRecovery={setDisasterRecovery}
                    />
                  </div>

                  <div className="p-6 bg-white border-t border-slate-200 sm:mb-0" style={{ marginBottom: '34px' }}>
                    <button 
                      onClick={handleCloseActiveModule}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg active:scale-[0.98] transition-all uppercase"
                    >
                      {t('done')}
                    </button>
                  </div>
                  <Toaster toasts={toasts} onClose={removeToast} />
                </div>
              </div>
            )}

            <div className="hidden">
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
              contractorSharePercentage={contractorSharePercentage}
            />
            </div>

          </div>

          <div>
            {results ? (
                <div className="android-shadow rounded-[32px] p-6 bg-slate-900 text-white relative overflow-hidden group border border-white/10">
                <div className="absolute top-4 right-5 z-20">
                  <span className="text-xl font-black text-white/20 group-hover:text-white/40 transition-colors">
                    5
                  </span>
                </div>
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
                    <strong className="text-sm sm:text-lg font-mono text-emerald-400 text-right">{formatLKR(results.contractorNetShare)}</strong>
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


        {results && <div className="mt-5 mb-20 sm:mb-24 lg:mb-32"><ResultSection results={results} t={t} ownerNames={activeOwnerNames} ownerCount={ownerCount} inputs={inputs} /></div>}

        {/* Hidden/off-screen printable area */}
        {results && (
          <div id="print-area" ref={printRef} style={{ position: 'absolute', left: '-10000px', top: 0, padding: '12pt 12pt', background: '#fff', width: '210mm', boxSizing: 'border-box' }}>
            <style>{`
              #print-area { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.2; color: #000; }
              #print-area h1 { font-size: 14pt; margin: 0 0 8pt 0; font-weight: 700; text-align: center; }
              #print-area h2 { font-size: 11pt; margin: 8pt 0 4pt 0; font-weight: 700; border-bottom: 0.5pt solid #999; padding-bottom: 2pt; }
              #print-area .section { margin-bottom: 8pt; }
              #print-area .row { display: flex; justify-content: space-between; gap: 12pt; margin-bottom: 3pt; padding: 0 4pt; }
              #print-area .label { color: #333; font-size: 8.5pt; flex: 1; }
              #print-area .value { font-weight: 700; font-size: 8.5pt; text-align: right; white-space: nowrap; }
              #print-area .subrow { display: flex; justify-content: space-between; gap: 12pt; margin-bottom: 2pt; padding: 0 8pt; margin-left: 8pt; }
              #print-area .sublabel { color: #666; font-size: 8pt; flex: 1; }
              #print-area .subvalue { font-weight: 600; font-size: 8pt; text-align: right; }
            `}</style>
            
            <h1>{t('title')}</h1>
            
            <div className="section">
              <h2>📋 DOCUMENT DETAILS</h2>
              <div className="row"><div className="label">{t('locationDay')}</div><div className="value">{inputs.location || '-'}</div></div>
              <div className="row"><div className="label">{t('date')}</div><div className="value">{inputs.date || '-'}</div></div>
              <div className="row"><div className="label">{t('buyerName')}</div><div className="value">{inputs.buyerName || '-'}</div></div>
              <div className="row"><div className="label">{t('billNumber')}</div><div className="value">{inputs.billNumber || '-'}</div></div>
            </div>

            <div className="section">
              <h2>💵 SALT SALE SUMMARY</h2>
              <div className="row"><div className="label">{t('totalSaltPackedBags')}</div><div className="value">{inputs.packedBags || 0}</div></div>
              <div className="row"><div className="label">{t('deductedBags')}</div><div className="value">{inputs.deductedBags || 0}</div></div>
              <div className="row"><div className="label">{t('netBags')}</div><div className="value">{results.netBags}</div></div>
              <div className="row"><div className="label">{t('pricePerBag')} (LKR)</div><div className="value">{formatLKR(inputs.pricePerBag || 0)}</div></div>
              <div className="row"><div className="label">{t('initialPrice')} (LKR)</div><div className="value">{formatLKR(results.initialPrice)}</div></div>
            </div>

            <div className="section">
              <h2>🏭 OPERATIONAL COSTS</h2>
              <div className="row"><div className="label">{t('packingFeePerBag')} (LKR)</div><div className="value">{formatLKR(inputs.packingFeePerBag || 0)}</div></div>
              <div className="row"><div className="label">{t('bagCostPerUnit')} (LKR)</div><div className="value">{formatLKR(inputs.bagCostPerUnit || 0)}</div></div>
              <div className="row"><div className="label">{t('otherExpenses')} (LKR)</div><div className="value">{formatLKR(inputs.otherExpenses || 0)}</div></div>
              {results.extraExpensesTotal > 0 && (
                <div className="row"><div className="label">Extra Expenses (LKR)</div><div className="value">{formatLKR(results.extraExpensesTotal)}</div></div>
              )}
              {results.labourCostsTotal > 0 && (
                <div className="row"><div className="label">Labour Costs Total (LKR)</div><div className="value">{formatLKR(results.labourCostsTotal)}</div></div>
              )}
              <div className="row" style={{ fontWeight: 'bold', borderTop: '0.5pt solid #ddd', paddingTop: '2pt', marginTop: '2pt' }}>
                <div className="label">{t('contractorSpent')}</div><div className="value">{formatLKR(results.contractorTotalSpent)}</div>
              </div>
            </div>

            <div className="section">
              <h2>💰 NET SETTLEMENT</h2>
              <div className="row"><div className="label">Physical Cash (LKR)</div><div className="value">{formatLKR(inputs.cashReceived || 0)}</div></div>
              <div className="row"><div className="label">Bank Cheques (LKR)</div><div className="value">{formatLKR(inputs.chequeReceived || 0)}</div></div>
            </div>

            <div className="section">
              <h2>📊 PROFIT SHARE CALCULATIONS</h2>
              <div className="row"><div className="label">Contractor Share %</div><div className="value">{contractorSharePercentage || 0}%</div></div>
              <div className="row"><div className="label">Expense Payment Mode</div><div className="value">{inputs.expensePayment === 'owners' ? 'Owners' : inputs.expensePayment === 'contractor' ? 'Contractor' : '50/50'}</div></div>
              <div className="row"><div className="label">{t('grandTotalReceived')} (LKR)</div><div className="value">{formatLKR(results.grandTotalReceived || 0)}</div></div>
              <div className="row"><div className="label">{t('contractorShare')} (Gross) (LKR)</div><div className="value">{formatLKR(results.contractorShare)}</div></div>
              <div className="row"><div className="label">Contractor Advance Payment (LKR)</div><div className="value">{formatLKR(results.advancesTotal || 0)}</div></div>
              <div className="row"><div className="label">{t('contractorShare')} (Net after Advances) (LKR)</div><div className="value">{formatLKR(results.contractorNetShare)}</div></div>
              <div className="row"><div className="label">Owners Group Amount (LKR)</div><div className="value">{formatLKR(results.ownerPool || 0)}</div></div>
              <div className="row"><div className="label">{ownerCount === 1 ? t('ownerPool') : t('perOwnerShare')} (LKR)</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
            </div>

            <div className="section">
              <h2>👥 OWNER DISTRIBUTION & FINAL RESULTS</h2>
              <div style={{ marginBottom: '6pt' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '3pt' }}>{activeOwnerNames[0] || t('owner') + ' 1'}</div>
                <div className="row"><div className="label">Share Before Loan (LKR)</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
                {inputs.bothOwnersHaveLoans && (
                  <div className="row"><div className="label">Loan (LKR)</div><div className="value">{formatLKR(inputs.loanInaya || 0)}</div></div>
                )}
                <div className="row" style={{ fontWeight: 'bold', color: results.highlights.finalInayaNegative ? '#e11d48' : '#0ea5e9' }}>
                  <div className="label">{t('finalShare')} (LKR)</div><div className="value">{formatLKR(results.finalInaya)}</div>
                </div>
                {results.zakatInaya > 0 && (
                  <>
                    <div className="row"><div className="label">Zakat (LKR)</div><div className="value">{formatLKR(results.zakatInaya)}</div></div>
                    <div className="row"><div className="label">After Zakat (LKR)</div><div className="value">{formatLKR(results.finalInayaAfterZakat)}</div></div>
                  </>
                )}
              </div>

              {ownerCount === 2 && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '3pt' }}>{activeOwnerNames[1] || t('owner') + ' 2'}</div>
                  <div className="row"><div className="label">Share Before Loan (LKR)</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
                  {inputs.bothOwnersHaveLoans && (
                    <div className="row"><div className="label">Loan (LKR)</div><div className="value">{formatLKR(inputs.loanShakira || 0)}</div></div>
                  )}
                  <div className="row" style={{ fontWeight: 'bold', color: results.highlights.finalShakiraNegative ? '#e11d48' : '#10b981' }}>
                    <div className="label">{t('finalShare')} (LKR)</div><div className="value">{formatLKR(results.finalShakira)}</div>
                  </div>
                  {results.zakatShakira > 0 && (
                    <>
                      <div className="row"><div className="label">Zakat (LKR)</div><div className="value">{formatLKR(results.zakatShakira)}</div></div>
                      <div className="row"><div className="label">After Zakat (LKR)</div><div className="value">{formatLKR(results.finalShakiraAfterZakat)}</div></div>
                    </>
                  )}
                </div>
              )}
            </div>

            {(Number(disasterRecovery.pondsReconstruction) || Number(disasterRecovery.hutReconstruction) || Number(disasterRecovery.electricityBills) || Number(disasterRecovery.compensationReceived) || Number(disasterRecovery.donationsReceived) || Number(disasterRecovery.lossQuantity)) && (
              <div className="section">
                <h2>🌊 DISASTER RECOVERY EXPENSES</h2>
                {Number(disasterRecovery.lossQuantity) > 0 && (
                  <div className="row"><div className="label">Loss Quantity</div><div className="value">{disasterRecovery.lossQuantity} {disasterRecovery.lossUnit}</div></div>
                )}
                <div className="row"><div className="label">Ponds Reconstruction (LKR)</div><div className="value">{formatLKR(disasterRecovery.pondsReconstruction || 0)}</div></div>
                <div className="row"><div className="label">Hut Reconstruction (LKR)</div><div className="value">{formatLKR(disasterRecovery.hutReconstruction || 0)}</div></div>
                <div className="row"><div className="label">Electricity Bills (LKR)</div><div className="value">{formatLKR(disasterRecovery.electricityBills || 0)}</div></div>
                <div className="row"><div className="label">Compensation Received (LKR)</div><div className="value">{formatLKR(disasterRecovery.compensationReceived || 0)}</div></div>
                <div className="row"><div className="label">Donations Received (LKR)</div><div className="value">{formatLKR(disasterRecovery.donationsReceived || 0)}</div></div>
              </div>
            )}

            <div style={{ marginTop: '12pt', paddingTop: '12pt', borderTop: '1pt solid #000', fontSize: '8pt', color: '#666', textAlign: 'center' }}>
              {t('generatedOn')} {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
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
        t={t}
      />

      <BottomAccessMenu
        onDownloadPDF={downloadPDF}
        onDownloadExcel={downloadCSV}
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
