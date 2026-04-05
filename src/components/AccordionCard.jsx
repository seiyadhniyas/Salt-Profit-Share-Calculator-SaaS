import React, { useState } from 'react';

/**
 * Accordion component to wrap pricing/input cards.
 */
export default function AccordionCard({ title, children, defaultOpen = false, bgColor = 'white', icon }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`shadow-xl rounded-2xl overflow-hidden mb-4 border border-white/20`} style={{ backgroundColor: bgColor }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none transition-colors hover:bg-black/5"
      >
        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h4>
        <span className={`transform transition-transform duration-200 text-gray-500 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      
      {isOpen && (
        <div className="p-5 pt-0 border-t border-black/5 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}
