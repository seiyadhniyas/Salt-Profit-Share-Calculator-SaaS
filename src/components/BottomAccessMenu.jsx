import React, { useState } from 'react';

// This is a web mockup of a bottom access menu for demonstration only.
// For React Native, use @react-navigation/bottom-tabs and react-native-vector-icons.

export default function BottomAccessMenu({ onDownloadPDF, onDownloadExcel, onSave, onCloud, onPL, onDashboard }) {
  const [downloadOption, setDownloadOption] = useState('pdf');

  const handleDownloadChange = (event) => {
    const value = event.target.value;
    setDownloadOption(value);
    if (value === 'pdf' && typeof onDownloadPDF === 'function') {
      onDownloadPDF();
    } else if (value === 'excel' && typeof onDownloadExcel === 'function') {
      onDownloadExcel();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 shadow-lg flex justify-around items-center h-16" style={{background: 'linear-gradient(90deg, #fce4ec 0%, #f8bbd0 100%)'}}>
      <div className="flex flex-col items-center text-slate-700 focus:outline-none">
        <span className="text-2xl">📥</span>
        <select
          value={downloadOption}
          onChange={handleDownloadChange}
          className="mt-1 bg-transparent border border-slate-300/70 rounded-full px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-700 leading-none focus:outline-none focus:ring-2 focus:ring-blue-200"
          style={{ minWidth: '80px', maxWidth: '100px' }}
        >
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
        </select>
      </div>
      <button onClick={onSave} className="flex flex-col items-center text-slate-700 hover:text-blue-600 focus:outline-none">
        <span className="text-2xl">💾</span>
        <span className="text-xs">Save</span>
      </button>
      <button onClick={onCloud} className="flex flex-col items-center text-slate-700 hover:text-blue-600 focus:outline-none">
        <span className="text-2xl">☁️</span>
        <span className="text-xs">Cloud</span>
      </button>
      <button onClick={onPL} className="flex flex-col items-center text-slate-700 hover:text-blue-600 focus:outline-none">
        <span className="text-2xl">📊</span>
        <span className="text-xs">P & L</span>
      </button>
      <button onClick={onDashboard} className="flex flex-col items-center text-slate-700 hover:text-blue-600 focus:outline-none">
        <span className="text-2xl">🗂️</span>
        <span className="text-xs">Dashboard</span>
      </button>
    </nav>
  );
}
