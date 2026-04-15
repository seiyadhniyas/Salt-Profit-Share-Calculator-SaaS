import React, { useState } from 'react'

export default function ContactFormModal({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading = false,
  t,
  session 
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: session?.user?.email || '',
    phoneNumber: '',
    company: '',
    message: '',
    preferredContactMethod: 'email'
  })

  const [submitted, setSubmitted] = useState(false)

  // Safe translation function
  const tr = (key, fallback) => {
    try {
      if (!t || typeof t !== 'function') return fallback
      const result = t(key)
      return result || fallback
    } catch {
      return fallback
    }
  }

  if (!open) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.fullName.trim()) {
      alert(tr('fullNameRequired', 'Please enter your full name'))
      return
    }
    if (!formData.email.trim()) {
      alert(tr('emailRequired', 'Please enter your email'))
      return
    }
    if (!formData.phoneNumber.trim()) {
      alert(tr('phoneRequired', 'Please enter your phone number'))
      return
    }

    try {
      await onSubmit(formData)
      setSubmitted(true)
      
      // Show success notification and close after 3 seconds
      setTimeout(() => {
        setSubmitted(false)
        setFormData({
          fullName: '',
          email: session?.user?.email || '',
          phoneNumber: '',
          company: '',
          message: '',
          preferredContactMethod: 'email'
        })
        onClose()
      }, 3000)
    } catch (error) {
      alert(error.message || tr('submitError', 'Error submitting form. Please try again.'))
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">{tr('thankYou', 'Thank You!')}</h3>
          <p className="text-slate-600 mb-2 font-semibold">{tr('contactFormSubmitted', 'Your request has been submitted successfully.')}</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            {tr('adminWillContact', 'Our admin team will contact you within 24 hours.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div 
          className="px-6 sm:px-8 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(to right, #9333ea, #6366f1)' }}
        >
          <h2 className="text-xl font-black text-white uppercase tracking-tight">{tr('contactUs', 'Contact Us')}</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-tight mb-2">
              {tr('fullName', 'Full Name')} *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder={tr('enterFullName', 'Enter your full name')}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 focus:border-purple-500 focus:bg-white transition outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-tight mb-2">
              {tr('email', 'Email')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={tr('enterEmail', 'Enter your email')}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 focus:border-purple-500 focus:bg-white transition outline-none"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-tight mb-2">
              {tr('phoneNumber', 'Phone Number')} *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder={tr('enterPhone', 'Enter your phone number')}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 focus:border-purple-500 focus:bg-white transition outline-none"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-tight mb-2">
              {tr('company', 'Company/Business Name')}
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder={tr('enterCompany', 'Enter company/business name (optional)')}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 focus:border-purple-500 focus:bg-white transition outline-none"
            />
          </div>

          {/* Preferred Contact Method */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-tight mb-2">
              {tr('preferredContactMethod', 'Preferred Contact Method')}
            </label>
            <select
              name="preferredContactMethod"
              value={formData.preferredContactMethod}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-900 font-semibold focus:border-purple-500 focus:bg-white transition outline-none"
            >
              <option value="email">{tr('email', 'Email')}</option>
              <option value="phone">{tr('phone', 'Phone')}</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-tight mb-2">
              {tr('message', 'Message (Optional)')}
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder={tr('enterMessage', 'Tell us about your inquiry...')}
              rows="4"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 focus:border-purple-500 focus:bg-white transition outline-none resize-none"
            />
          </div>

          {/* Info Message */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
            <p className="text-xs text-blue-700 font-semibold leading-relaxed">
              <span className="font-black">ℹ️ {tr('note', 'Note')}:</span> {tr('adminWillVerify', 'Our team will verify your details and contact you within 24 hours to discuss your payment options.')}
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition uppercase"
          >
            {tr('cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-8 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition uppercase disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
          >
            {isLoading ? tr('submitting', 'Submitting...') : tr('submit', 'Submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
