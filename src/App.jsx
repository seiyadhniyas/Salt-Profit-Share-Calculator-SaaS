import React, {useEffect, useState, useRef} from 'react'
import InputSection from './components/InputSection.jsx'
import DisasterRecoveryCard from './components/DisasterRecoveryCard.jsx'
import ResultSection from './components/ResultSection.jsx'
import DashboardSummary from './components/DashboardSummary.jsx'
import AuthModal from './components/AuthModal.jsx'
import AdminAuthModal from './components/AdminAuthModal.jsx'
import { computeAll, formatLKR, formatKg } from './utils/calculations.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveReport, saveReportToSupabase, getReportsFromSupabase, getSavedFilesFromSupabase, savePdfFileToSupabase } from './api/reports.js'
import { getBillingStatus, consumeTrialUse, createStripeCheckoutSession, requestCashPayment, getAdminPendingPayments, activatePaymentRequestAsAdmin } from './api/billing.js'
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
    location: '',
    loanInaya: 0,
    loanShakira: 0,
    bothOwnersHaveLoans: false,
    extraExpenses: [],
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

  // Disaster Recovery state
  const [disasterRecovery, setDisasterRecovery] = useState({
    lossQuantity: '',
    lossUnit: 'bags',
    pondsReconstruction: '',
    hutReconstruction: '',
    electricityBills: '',
    compensationReceived: '',
    donationsReceived: '',
  })

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
      oneOwnerHasLoan: 'Owner has loan',
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
      dashboard: 'Dashboard',
      openDashboardMenu: 'Open dashboard menu',
      closeDashboardMenu: 'Close dashboard menu',
      menu: 'Menu',
      memberDashboard: 'Member Dashboard',
      signOut: 'Sign out',
      signInRegister: 'Sign in / Register',
      dashboardSubtitle: 'Quick producer summary for salt calculations, report sync, and saved performance snapshots.',
      account: 'Account',
      guestMember: 'Guest member',
      notSignedIn: 'Not signed in',
      connectedSupabaseAuth: 'Connected through Supabase Auth',
      popupAuthReady: 'Popup auth is ready when you need it',
      bagsUnit: 'bags',
      weightLabel: 'Weight',
      initialPriceLabel: 'Initial price',
      workLocations: 'Work Locations',
      workLocationsHelp: 'Add your work locations here to use them in reports',
      enterLocationName: 'Enter location name',
      add: 'Add',
      deleteLocation: 'Delete location',
      profitShare: 'Profit Share',
      contractorSharePercentage: 'Contractor share percentage',
      contractor: 'Contractor',
      owners: 'Owners',
      splitStandard: '50/50 split (standard)',
      contractorGetsMore: 'Contractor gets more',
      ownersGetMore: 'Owners get more',
      ownerNames: 'Owner Names',
      ownerNamesHelp: "Customize your partners' names to display in reports",
      owner: 'Owner',
      clearOwnerName: 'Clear owner name',
      reportsWillShow: 'Reports will show',
      reports: 'Reports',
      noOwnersSet: 'No owners set',
      recently: 'Recently',
      noReportsYet: 'No reports yet',
      lastSync: 'Last sync',
      saveReportToPopulate: 'Save a report to populate the list',
      hideDetails: 'Hide details',
      showDetails: 'Show details',
      clear: 'Clear',
      grossMargin: 'Gross margin',
      billNumberShort: 'Bill #',
      savedFiles: 'Saved Files',
      noSavedFilesYet: 'No saved files yet.',
      created: 'Created',
      size: 'Size',
      action: 'Action',
      unnamedFile: 'Unnamed file',
      open: 'Open',
      file: 'File',
      id: 'ID',
      memberAccess: 'Member Access',
      signIn: 'Sign in',
      createAccount: 'Create account',
      close: 'Close',
      register: 'Register',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Repeat password',
      supabaseNotConfigured: 'Supabase is not configured locally yet. Create a',
      supabaseNotConfiguredSuffix: 'from the example file.',
      pleaseWait: 'Please wait...',
      signInToDashboard: 'Sign in to dashboard',
      authFooterNote: 'This dashboard is designed for lifetime members of the Saltern Welfare Society. Calculator logic stays unchanged after sign in.',
      authSupabaseMissing: 'Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to your env file.',
      authPasswordsMismatch: 'Passwords do not match.',
      authAccountCreated: 'Account created successfully!',
      authConfirmationEmailSent: 'A confirmation email has been sent to',
      authVerifyThenSignIn: 'Please click the link in the email to verify your account, then sign in with your credentials.',
      authFailedTryAgain: 'Authentication failed. Please try again.',
      expenseItemDefaultLabel: 'Expense',
      selectLocation: 'Select a location',
      addLandNameInDashboard: 'Add land name in Dashboard',
      otherExpensesReasonPlaceholder: 'Brief reason for other expenses',
      packedMinusDeducted: 'Packed - Deducted',
      netTimesPricePerBag: 'Net × Price/Bag',
      contractorSpentFormula: 'Packing Wage × TotalPackedBags + Bag Cost × PackedBags + Other Expenses',
      contractorShareOwnersFormula: 'InitialPrice/2 + Spent',
      contractorShareContractorFormula: '(InitialPrice - Spent)/2',
      grandTotalOwnersFormula: 'InitialPrice - TotalLoan',
      grandTotalContractorFormula: 'InitialPrice - Spent - TotalLoan',
      ownerPoolOwnersFormula: 'GrandTotal - ContractorShare',
      ownerPoolContractorFormula: '(GrandTotal + TotalLoan)/2',
      societyServiceCharge: 'Society Service Charge',
      societyServiceReserved30: 'Society Service Reserved 30%',
      finalShare: 'Final Share',
      loan: 'Loan',
      lossDetected: 'Loss detected',
      zakatLabel: 'Zakat (5%)',
      afterZakatLabel: 'After Zakat',
      noResultsToSave: 'No results to save',
      couldNotCreatePdf: 'Could not create PDF',
      pdfSavedToSupabaseStorage: 'PDF saved to Supabase Storage',
      pdfSaveFailed: 'PDF save failed',
      pdfSaveError: 'PDF save error',
      reportSavedToSupabase: 'Report saved to Supabase',
      saveFailed: 'Save failed',
      reportSavedLocalDemo: 'Report saved (local demo)',
      saveError: 'Save error',
      savePdf: '☁️ Save PDF',
      totalDistributedTitle: 'Total Distributed',
      billingAccess: 'Billing & Access',
      trialStatus: 'Trial Status',
      fullVersionActive: 'Full version is active',
      freeTrialUsed: 'Free trial used',
      trialRemaining: 'Remaining',
      activationPending: 'Payment received. Admin verification pending for activation.',
      stripeFeeGlance: 'Stripe Fee Glance (Sri Lankan Cards)',
      oneOffPrice: 'One-off Price',
      estimatedCardFee: 'Estimated Card Fee',
      estimatedTotal: 'Estimated Total',
      feeDisclaimer: 'Actual Stripe fees may vary by issuer and card type.',
      payByCard: 'Pay by Card (Stripe)',
      submitCashRequest: 'Submit Cash Payment Request',
      paymentSuccessPending: 'Payment completed. Admin has been notified. Activation will be enabled after verification.',
      paymentCancelled: 'Payment was cancelled. You can try again any time.',
      trialExpiredPayPrompt: 'Free trial is over. Please complete the one-off payment to continue premium actions.',
      premiumAuthRequired: 'Please sign in to use trial and payment features.',
      paymentRequestSubmitted: 'Cash payment request submitted. Admin has been notified for verification.',
      checkoutStartFailed: 'Unable to start payment checkout',
      cashRequestFailed: 'Unable to submit cash payment request',
      adminDashboard: 'Admin Dashboard',
      refreshPending: 'Refresh Pending',
      adminPendingHelp: 'Review pending/captured payments and activate user access with one click.',
      noPendingPaymentRequests: 'No pending payment requests.',
      paymentMethod: 'Method',
      amount: 'Amount',
      status: 'Status',
      activateNow: 'Activate Now',
      adminActivationSuccess: 'Payment verified. User access activated.',
      adminActivationFailed: 'Activation failed',
      approvalModalTitle: 'Approve & Activate Payment',
      approvalModalSubtitle: 'Add verification note before activating full access.',
      adminVerificationNote: 'Admin Verification Note',
      adminVerificationNotePlaceholder: 'Example: Bank transfer slip checked and matched with account records.',
      adminNoteRequired: 'Admin note is required before activation.',
      cancel: 'Cancel',
      confirmActivate: 'Confirm & Activate',
      adminAuthRequired: 'Admin Authentication',
      adminAuthSuccess: 'Authentication Successful',
      adminAccess: 'Admin Access',
      adminLoginPrompt: 'Sign in with admin credentials to access the admin dashboard.',
      // Disaster Recovery
      disasterRecovery: 'Disaster Recovery Expenses',
      addDisasterRecovery: '+ Add Disaster Recovery Expenses',
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
      oneOwnerHasLoan: 'உரிமையாளருக்கு கடன் உள்ளது',
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
      dashboard: 'டாஷ்போர்டு',
      openDashboardMenu: 'டாஷ்போர்டு மெனுவை திற',
      closeDashboardMenu: 'டாஷ்போர்டு மெனுவை மூடு',
      menu: 'மெனு',
      memberDashboard: 'உறுப்பினர் டாஷ்போர்டு',
      signOut: 'வெளியேறு',
      signInRegister: 'உள்நுழை / பதிவு செய்',
      dashboardSubtitle: 'உப்பு கணக்கீடுகள், அறிக்கை ஒத்திசைவு மற்றும் சேமிக்கப்பட்ட செயல்திறன் சுருக்கங்களை விரைவாக பாருங்கள்.',
      account: 'கணக்கு',
      guestMember: 'விருந்தினர் உறுப்பினர்',
      notSignedIn: 'உள்நுழையவில்லை',
      connectedSupabaseAuth: 'Supabase அங்கீகாரத்துடன் இணைக்கப்பட்டது',
      popupAuthReady: 'தேவைப்படும் போது பாப்அப் உள்நுழைவு தயார்',
      bagsUnit: 'பைகள்',
      weightLabel: 'எடை',
      initialPriceLabel: 'ஆரம்ப விலை',
      workLocations: 'வேலை இடங்கள்',
      workLocationsHelp: 'அறிக்கைகளில் பயன்படுத்த வேலை இடங்களை இங்கே சேர்க்கவும்',
      enterLocationName: 'இடப் பெயரை உள்ளிடவும்',
      add: 'சேர்',
      deleteLocation: 'இடத்தை நீக்கு',
      profitShare: 'இலாப பங்கு',
      contractorSharePercentage: 'ஒப்பந்ததாரர் பங்கு சதவீதம்',
      contractor: 'ஒப்பந்ததாரர்',
      owners: 'உரிமையாளர்கள்',
      splitStandard: '50/50 பகிர்வு (தரநிலை)',
      contractorGetsMore: 'ஒப்பந்ததாரருக்கு அதிக பங்கு',
      ownersGetMore: 'உரிமையாளர்களுக்கு அதிக பங்கு',
      ownerNames: 'உரிமையாளர் பெயர்கள்',
      ownerNamesHelp: 'அறிக்கைகளில் காட்டப் பங்குதாரர் பெயர்களை தனிப்பயனாக்கவும்',
      owner: 'உரிமையாளர்',
      clearOwnerName: 'உரிமையாளர் பெயரை அழி',
      reportsWillShow: 'அறிக்கையில் காட்டப்படும் பெயர்கள்',
      reports: 'அறிக்கைகள்',
      noOwnersSet: 'உரிமையாளர் பெயர்கள் அமைக்கப்படவில்லை',
      recently: 'அண்மையில்',
      noReportsYet: 'இன்னும் அறிக்கைகள் இல்லை',
      lastSync: 'கடைசி ஒத்திசைவு',
      saveReportToPopulate: 'பட்டியலை நிரப்ப ஒரு அறிக்கையை சேமிக்கவும்',
      hideDetails: 'விவரங்களை மறை',
      showDetails: 'விவரங்களை காட்டு',
      clear: 'அழி',
      grossMargin: 'மொத்த மார்ஜின்',
      billNumberShort: 'பில் #',
      savedFiles: 'சேமித்த கோப்புகள்',
      noSavedFilesYet: 'இன்னும் சேமித்த கோப்புகள் இல்லை.',
      created: 'உருவாக்கப்பட்டது',
      size: 'அளவு',
      action: 'செயல்',
      unnamedFile: 'பெயரற்ற கோப்பு',
      open: 'திற',
      file: 'கோப்பு',
      id: 'அடையாளம்',
      memberAccess: 'உறுப்பினர் அணுகல்',
      signIn: 'உள்நுழை',
      createAccount: 'கணக்கு உருவாக்கு',
      close: 'மூடு',
      register: 'பதிவு செய்',
      email: 'மின்னஞ்சல்',
      emailPlaceholder: 'you@example.com',
      password: 'கடவுச்சொல்',
      passwordPlaceholder: 'குறைந்தது 6 எழுத்துகள்',
      confirmPassword: 'கடவுச்சொல் உறுதிப்படுத்து',
      confirmPasswordPlaceholder: 'கடவுச்சொல்லை மீண்டும் உள்ளிடவும்',
      supabaseNotConfigured: 'Supabase இன்னும் உள்ளூராக அமைக்கப்படவில்லை. எடுத்துக்காட்டு கோப்பில் இருந்து',
      supabaseNotConfiguredSuffix: 'எனும் கோப்பை உருவாக்கவும்.',
      pleaseWait: 'தயவு செய்து காத்திருக்கவும்...',
      signInToDashboard: 'டாஷ்போர்டுக்கு உள்நுழை',
      authFooterNote: 'இந்த டாஷ்போர்டு உப்பு நில நலச் சங்கத்தின் வாழ்நாள் உறுப்பினர்களுக்காக வடிவமைக்கப்பட்டது. உள்நுழைந்த பிறகும் கணக்கீட்டு தர்க்கம் மாறாது.',
      authSupabaseMissing: 'Supabase விவரங்கள் இல்லை. env கோப்பில் VITE_SUPABASE_URL மற்றும் VITE_SUPABASE_ANON_KEY அல்லது VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY சேர்க்கவும்.',
      authPasswordsMismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை.',
      authAccountCreated: 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது!',
      authConfirmationEmailSent: 'உறுதிப்படுத்தும் மின்னஞ்சல் அனுப்பப்பட்டது:',
      authVerifyThenSignIn: 'மின்னஞ்சலில் உள்ள இணைப்பை அழுத்தி கணக்கை உறுதி செய்து பின்னர் உள்நுழைக.',
      authFailedTryAgain: 'அங்கீகாரம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
      expenseItemDefaultLabel: 'செலவு',
      selectLocation: 'இடத்தை தேர்வு செய்க',
      addLandNameInDashboard: 'டாஷ்போர்டில் நிலப் பெயரை சேர்க்கவும்',
      otherExpensesReasonPlaceholder: 'பிற செலவுக்கான சுருக்கமான காரணம்',
      packedMinusDeducted: 'நிரப்பியது - கழிக்கப்பட்டது',
      netTimesPricePerBag: 'நிகரம் × பை விலை',
      contractorSpentFormula: 'பேக்கிங் கூலி × மொத்தப் பைகள் + பைச் செலவு × பைகள் + பிற செலவுகள்',
      contractorShareOwnersFormula: 'ஆரம்பவிலை/2 + செலவு',
      contractorShareContractorFormula: '(ஆரம்பவிலை - செலவு)/2',
      grandTotalOwnersFormula: 'ஆரம்பவிலை - மொத்தகடன்',
      grandTotalContractorFormula: 'ஆரம்பவிலை - செலவு - மொத்தகடன்',
      ownerPoolOwnersFormula: 'மொத்தம் - ஒப்பந்ததாரர் பங்கு',
      ownerPoolContractorFormula: '(மொத்தம் + மொத்தகடன்)/2',
      societyServiceCharge: 'சங்க சேவை கட்டணம்',
      societyServiceReserved30: 'சங்க சேவை ஒதுக்கீடு 30%',
      finalShare: 'இறுதி பங்கு',
      loan: 'கடன்',
      lossDetected: 'இழப்பு கண்டறியப்பட்டது',
      zakatLabel: 'ஜக்கத் (5%)',
      afterZakatLabel: 'ஜக்கத்துக்குப் பிறகு',
      noResultsToSave: 'சேமிக்க முடிவுகள் இல்லை',
      couldNotCreatePdf: 'PDF உருவாக்க முடியவில்லை',
      pdfSavedToSupabaseStorage: 'PDF Supabase சேமிப்பகத்தில் சேமிக்கப்பட்டது',
      pdfSaveFailed: 'PDF சேமிப்பு தோல்வி',
      pdfSaveError: 'PDF சேமிப்பு பிழை',
      reportSavedToSupabase: 'அறிக்கை Supabase-ல் சேமிக்கப்பட்டது',
      saveFailed: 'சேமித்தல் தோல்வி',
      reportSavedLocalDemo: 'அறிக்கை சேமிக்கப்பட்டது (உள்ளூர் டெமோ)',
      saveError: 'சேமிப்பு பிழை',
      savePdf: '☁️ PDF சேமி',
      totalDistributedTitle: 'மொத்த பகிர்வு',
      billingAccess: 'கட்டணம் மற்றும் அணுகல்',
      trialStatus: 'சோதனை நிலை',
      fullVersionActive: 'முழு பதிப்பு செயல்பாட்டில் உள்ளது',
      freeTrialUsed: 'இலவச சோதனை பயன்படுத்தியது',
      trialRemaining: 'மீதமுள்ளது',
      activationPending: 'கட்டணம் பெறப்பட்டது. செயற்படுத்த நிர்வாக சரிபார்ப்பு நிலுவையில் உள்ளது.',
      stripeFeeGlance: 'Stripe கட்டண சுருக்கம் (இலங்கை கார்டுகள்)',
      oneOffPrice: 'ஒருமுறை கட்டணம்',
      estimatedCardFee: 'கணிக்கப்பட்ட கார்டு கட்டணம்',
      estimatedTotal: 'கணிக்கப்பட்ட மொத்தம்',
      feeDisclaimer: 'உண்மையான Stripe கட்டணம் கார்டு மற்றும் வங்கி வழங்குநரின்படி மாறலாம்.',
      payByCard: 'கார்டு மூலம் கட்டணம் செலுத்து (Stripe)',
      submitCashRequest: 'பண கட்டண கோரிக்கையை சமர்ப்பிக்கவும்',
      paymentSuccessPending: 'கட்டணம் வெற்றிகரமாக முடிந்தது. நிர்வாகிக்கு அறிவிக்கப்பட்டது. சரிபார்ப்புக்குப் பிறகு செயற்படுத்தப்படும்.',
      paymentCancelled: 'கட்டணம் ரத்து செய்யப்பட்டது. எப்போதும் மீண்டும் முயற்சி செய்யலாம்.',
      trialExpiredPayPrompt: 'இலவச சோதனை முடிந்தது. தொடர ஒருமுறை கட்டணத்தை முடிக்கவும்.',
      premiumAuthRequired: 'சோதனை மற்றும் கட்டண அம்சங்களை பயன்படுத்த தயவுசெய்து உள்நுழையவும்.',
      paymentRequestSubmitted: 'பண கட்டண கோரிக்கை சமர்ப்பிக்கப்பட்டது. சரிபார்ப்புக்காக நிர்வாகிக்கு அறிவிக்கப்பட்டது.',
      checkoutStartFailed: 'கட்டண செயல்முறையை தொடங்க முடியவில்லை',
      cashRequestFailed: 'பண கட்டண கோரிக்கையை சமர்ப்பிக்க முடியவில்லை',
      adminDashboard: 'நிர்வாகி டாஷ்போர்டு',
      refreshPending: 'நிலுவைகளை புதுப்பி',
      adminPendingHelp: 'நிலுவை/பெறப்பட்ட கட்டணங்களை பரிசீலித்து ஒரு கிளிக்கில் பயனர் அணுகலை செயற்படுத்தவும்.',
      noPendingPaymentRequests: 'நிலுவை கட்டண கோரிக்கைகள் இல்லை.',
      paymentMethod: 'முறை',
      amount: 'தொகை',
      status: 'நிலை',
      activateNow: 'இப்போது செயற்படுத்து',
      adminActivationSuccess: 'கட்டணம் சரிபார்க்கப்பட்டது. பயனர் அணுகல் செயற்படுத்தப்பட்டது.',
      adminActivationFailed: 'செயற்படுத்தல் தோல்வி',
      approvalModalTitle: 'கட்டணத்தை அங்கீகரித்து செயற்படுத்து',
      approvalModalSubtitle: 'முழு அணுகலை செயற்படுத்தும் முன் சரிபார்ப்பு குறிப்பை சேர்க்கவும்.',
      adminVerificationNote: 'நிர்வாக சரிபார்ப்பு குறிப்பு',
      adminVerificationNotePlaceholder: 'உதாரணம்: வங்கி பரிமாற்ற ரசீது சரிபார்க்கப்பட்டது; கணக்கு பதிவுகளுடன் பொருந்துகிறது.',
      adminNoteRequired: 'செயற்படுத்துவதற்கு முன் நிர்வாக குறிப்பு கட்டாயம்.',
      cancel: 'ரத்து செய்',
      confirmActivate: 'உறுதி செய்து செயற்படுத்து',
      adminAuthRequired: 'நிர்வாக அங்கீகாரம்',
      adminAuthSuccess: 'அங்கீகாரம் வெற்றிகரமாக',
      adminAccess: 'நிர்வாக அணுகல்',
      adminLoginPrompt: 'நிர்வாக டாஷ்போர்டைக் அணுக நிர்வாக நற்சான்றுகளில் உள்நுழையவும்.',
      // Disaster Recovery
      disasterRecovery: 'பேரிடர் மீட்பு செலவுகள்',
      addDisasterRecovery: '+ பேரிடர் மீட்பு செலவுகளைச் சேர்க்கவும்',
      lossQuantity: 'உப்பு இழப்পின் அளவு',
      lossQuantityPlaceholder: 'எ.கா. 100',
      bags: 'பைகள்',
      kg: 'கிகி',
      pondsReconstruction: 'குளங்கள் புनర्নितिर्माण (LKR)',
      pondsReconstructionPlaceholder: 'எ.கா. 50000',
      hutReconstruction: 'குடிலுக்கான புनर्നितिर्माण (LKR)',
      hutReconstructionPlaceholder: 'எ.கா. 20000',
      electricityBills: 'மின்சாரக் கட்டணங்கள் (LKR)',
      electricityBillsPlaceholder: 'எ.கா. 5000',
      compensationReceived: 'பெற்ற இழப்பீடு (LKR)',
      compensationReceivedPlaceholder: 'எ.கா. 10000',
      donationsReceived: 'பெற்ற தானங்கள் (LKR)',
      donationsReceivedPlaceholder: 'எ.கா. 5000',
    }
  }

  const t = (key) => (translations[lang] && translations[lang][key]) || key

  const [inputs, setInputs] = useState(defaultInputs)
  const [results, setResults] = useState(null)
  const [session, setSession] = useState(null)
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
  const ownerCount = normalizedOwnerNames.length === 1 ? 1 : 2
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
        const fallbackUrl = activeSession?.user?.id
          ? `/.netlify/functions/getReportsSupabase?userId=${encodeURIComponent(activeSession.user.id)}`
          : '/.netlify/functions/getReports'
        const r2 = await fetch(fallbackUrl).then(res => res.json()).catch(() => null)
        if (r2 && r2.ok) setReports(r2.reports || [])
      }
    } catch (e) {
      console.error(e)
      setReports([])
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

  const refreshBillingStatus = useCallback(async (activeSession = session) => {
    try {
      const resp = await getBillingStatus(activeSession)
      if (resp?.ok) {
        setBillingStatus(resp.billing)
      }
    } catch (error) {
      console.error(error)
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

      if (!adminFlag) {
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
      trial_uses: consumed?.trial_uses ?? prev?.trial_uses ?? 0,
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
        amountLkr: ONE_OFF_PRICE_LKR,
      })

      if (resp?.checkoutUrl) {
        window.location.href = resp.checkoutUrl
        return
      }

      throw new Error(t('checkoutStartFailed'))
    } catch (error) {
      alert(`${t('checkoutStartFailed')}: ${error?.message || error}`)
    } finally {
      setPaymentBusy(false)
    }
  }

  const handleRequestCashPayment = async () => {
    if (!session?.user?.id) {
      alert(t('premiumAuthRequired'))
      handleOpenAuth('signin')
      return
    }

    try {
      setPaymentBusy(true)
      await requestCashPayment({
        session,
        amountLkr: ONE_OFF_PRICE_LKR,
      })
      alert(t('paymentRequestSubmitted'))
      await refreshBillingStatus(session)
    } catch (error) {
      alert(`${t('cashRequestFailed')}: ${error?.message || error}`)
    } finally {
      setPaymentBusy(false)
    }
  }

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
    refreshBillingStatus(session)
    refreshAdminStatus(session)
  }, [session, loadReports, loadSavedFiles, refreshBillingStatus, refreshAdminStatus])

  useEffect(() => {
    if (menuOpen && isAdmin) {
      refreshPendingPaymentRequests(session)
    }
  }, [menuOpen, isAdmin, session, refreshPendingPaymentRequests])

  useEffect(() => {
    const url = new URL(window.location.href)
    const payment = url.searchParams.get('payment')
    const activation = url.searchParams.get('activation')

    if (payment === 'success') {
      alert(activation === 'pending' ? t('paymentSuccessPending') : t('reportSavedToSupabase'))
      url.searchParams.delete('payment')
      url.searchParams.delete('activation')
      window.history.replaceState({}, '', url.toString())
      refreshBillingStatus(session)
    }

    if (payment === 'cancelled') {
      alert(t('paymentCancelled'))
      url.searchParams.delete('payment')
      window.history.replaceState({}, '', url.toString())
    }
  }, [session, refreshBillingStatus])

  // load last from localStorage - DISABLED to prevent auto-calculation issues
  // Each new session should start fresh with empty inputs
  // useEffect(()=>{
  //   try {
  //     const raw = localStorage.getItem(STORAGE_KEY)
  //     if(raw){
  //       setInputs(JSON.parse(raw))
  //     }
  //   } catch (e) {
  //     // ignore
  //   }
  // }, [])

  // compute on every input change or when contractor share percentage changes
  useEffect(()=>{
    const res = computeAll(inputs, { contractorSharePercentage, ownerCount })
    setResults(res)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs)) } catch(e){}
  }, [inputs, contractorSharePercentage, ownerCount])

  // Single-owner mode: ensure second owner loan does not affect persisted inputs/reports.
  useEffect(() => {
    if (ownerCount === 1 && Number(inputs.loanShakira || 0) !== 0) {
      setInputs(prev => ({ ...prev, loanShakira: 0 }))
    }
  }, [ownerCount, inputs.loanShakira])

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
    if (!results) return alert(t('noResultsToSave'))
    const allowed = await ensurePremiumAccess()
    if (!allowed) {
      return
    }

    try {
      const pdfBlob = await createPrintablePdfBlob()
      if (!pdfBlob) {
        alert(t('couldNotCreatePdf'))
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
          alert(t('pdfSavedToSupabaseStorage'))
          await loadSavedFiles(session)
          return
        }
        alert(t('pdfSaveFailed'))
        return
      }

      await downloadPDF()
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('auth')) {
        handleOpenAuth('signin')
        return
      }
      alert(`${t('pdfSaveError')}: ${e.message || e}`)
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
      if (payload && Array.isArray(payload.ownerNames) && payload.ownerNames.length === 2) {
        setOwnerNames(payload.ownerNames)
      }
      if (payload && typeof payload.contractorSharePercentage === 'number') {
        setContractorSharePercentage(payload.contractorSharePercentage)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleLoadReportsClick = async () => {
    if (!session?.user?.id) {
      alert(t('premiumAuthRequired'))
      handleOpenAuth('signin')
      return
    }

    if (!billingStatus?.full_access_enabled && billingStatus?.payment_status === 'payment_pending_verification') {
      alert(t('activationPending'))
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
        <header className="relative mb-6 rounded-3xl border border-white/70 bg-[#fff9ff] px-4 pb-5 pt-12 shadow-sm backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.25 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:right-5 sm:top-4 sm:px-3 sm:py-1.5"
            aria-label={t('openDashboardMenu')}
          >
            <span className="text-lg leading-none">☰</span>
            <span className="hidden sm:inline">{t('dashboard')}</span>
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
            <InputSection inputs={inputs} setInput={setInputs} reset={reset} toggleLoans={toggleLoans} t={t} lang={lang} setLang={setLang} customLocations={customLocations} ownerNames={activeOwnerNames} ownerCount={ownerCount} />
            
            {/* Disaster Recovery Pricing Card */}
            <div className="mt-6">
              <DisasterRecoveryCard
                value={disasterRecovery}
                onChange={(field, val) => setDisasterRecovery(prev => ({ ...prev, [field]: val }))}
                t={t}
              />
            </div>
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
                    <span className="text-gray-600">{ownerCount === 1 ? t('ownerPool') : t('perOwnerShare')}:</span>
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

        {results && <ResultSection results={results} t={t} ownerNames={activeOwnerNames} ownerCount={ownerCount} />}

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
                <div className="row"><div className="muted">{t('locationLabel') || 'Location'}</div><div className="value">{inputs.location || '-'}</div></div>
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
                <div className="row"><div className="muted">{ownerCount === 1 ? t('ownerPool') : t('perOwnerShare')}</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
              </div>

              <div className="section">
                <h2>{t('calculationBreakdown')}</h2>
                <div className="row"><div className="muted">{t('grandTotalReceived')}</div><div className="value">{formatLKR(results.grandTotalReceived)}</div></div>
                <div className="row"><div className="muted">{t('ownerPool')}</div><div className="value">{formatLKR(results.ownerPool)}</div></div>
                <div className="row"><div className="muted">{ownerCount === 1 ? t('ownerPool') : t('perOwnerShare')}</div><div className="value">{formatLKR(results.generalSharePerOwner)}</div></div>
              </div>

              <div className="section">
                <h2>{t('totalDistributedTitle')}</h2>
                <div className="row"><div className="muted">{activeOwnerNames?.[0] || `${t('owner')} 1`} - {t('finalShare')}</div><div className="value">{formatLKR(results.finalInaya)}</div></div>
                <div className="row"><div className="muted">{activeOwnerNames?.[0] || `${t('owner')} 1`} - {t('zakatLabel')}</div><div className="value">{formatLKR(results.zakatInaya)}</div></div>
                <div className="row"><div className="muted">{activeOwnerNames?.[0] || `${t('owner')} 1`} - {t('afterZakatLabel')}</div><div className="value">{formatLKR(results.finalInayaAfterZakat)}</div></div>

                <div style={{ height: '6pt' }}></div>

                {ownerCount === 2 && (
                  <>
                    <div className="row"><div className="muted">{activeOwnerNames?.[1] || `${t('owner')} 2`} - {t('finalShare')}</div><div className="value">{formatLKR(results.finalShakira)}</div></div>
                    <div className="row"><div className="muted">{activeOwnerNames?.[1] || `${t('owner')} 2`} - {t('zakatLabel')}</div><div className="value">{formatLKR(results.zakatShakira)}</div></div>
                    <div className="row"><div className="muted">{activeOwnerNames?.[1] || `${t('owner')} 2`} - {t('afterZakatLabel')}</div><div className="value">{formatLKR(results.finalShakiraAfterZakat)}</div></div>
                  </>
                )}

                <div className="row" style={{ borderTop: '1px solid #ddd', paddingTop: '4pt', marginTop: '8pt' }}>
                  <div className="muted">{t('totalDistributed')}</div>
                  <div className="value">{formatLKR(results.finalInaya + (ownerCount === 2 ? results.finalShakira : 0))}</div>
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
            {t('savePdf')}
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
              aria-label={t('closeDashboardMenu')}
              onClick={() => setMenuOpen(false)}
            />
            <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{t('memberDashboard')}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {t('close')}
                </button>
              </div>
              <div className="p-4">
                <DashboardSummary
                  session={session}
                  reports={reports}
                  savedFiles={savedFiles}
                  inputs={inputs}
                  results={results}
                  t={t}
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
                  customLocations={customLocations}
                  onAddLocation={(location) => {
                    if (location) {
                      setCustomLocations(prev => prev.includes(location) ? prev : [...prev, location])
                    }
                  }}
                  onDeleteLocation={(locationToDelete) => {
                    setCustomLocations(prev => prev.filter(loc => loc !== locationToDelete))
                  }}
                  ownerNames={ownerNames}
                  onOwnerNamesChange={setOwnerNames}
                  contractorSharePercentage={contractorSharePercentage}
                  onContractorSharePercentageChange={setContractorSharePercentage}
                  billingStatus={billingStatus}
                  onStartCardPayment={handleStartCardPayment}
                  onRequestCashPayment={handleRequestCashPayment}
                  stripeFeePreview={stripeFeePreview}
                  paymentBusy={paymentBusy}
                  onOpenAdminAuth={() => setAdminAuthModalOpen(true)}
                />
              </div>
            </aside>
          </div>
        )}

        <AuthModal
          open={authModalOpen}
          mode={authMode}
          t={t}
          onClose={() => setAuthModalOpen(false)}
          onModeChange={setAuthMode}
          onSuccess={() => setAuthModalOpen(false)}
        />

        <AdminAuthModal
          open={adminAuthModalOpen}
          t={t}
          onClose={() => setAdminAuthModalOpen(false)}
          onSuccess={() => {
            setAdminAuthModalOpen(false)
          }}
        />
      </div>
    </div>
  )
}
