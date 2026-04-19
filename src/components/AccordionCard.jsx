import React, { useState } from 'react';

/**
 * Accordion component to wrap pricing/input cards.
 */
export default function AccordionCard({ title, children, defaultOpen = false, bgColor = 'white', icon, onReset }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`android-card overflow-hidden mb-6 shadow-xl border border-slate-300`} style={{ backgroundColor: bgColor }}>
            <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-2xl opacity-80">{icon}</span>}
          <h4 className="text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-3">
          {onReset && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onReset()
              }}
              className="px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all active:scale-95"
            >
              🔄 RESET
            </button>
          )}
          <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-black/5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div className="px-6 pb-6 pt-1 animate-fadeIn border-t border-black/5">
          {children}
        </div>
      )}
    </div>
  );
}
