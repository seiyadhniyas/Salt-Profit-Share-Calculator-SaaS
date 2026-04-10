import React from 'react';

// This is a web mockup of a bottom access menu for demonstration only.
// For React Native, use @react-navigation/bottom-tabs and react-native-vector-icons.

export default function BottomAccessMenu({ onDownloadPDF, onSave, onCloud, onPL, onDashboard }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 shadow-lg flex justify-around items-center h-16" style={{background: 'linear-gradient(90deg, #fce4ec 0%, #f8bbd0 100%)'}}>
      <button onClick={onDownloadPDF} className="flex flex-col items-center text-slate-700 hover:text-blue-600 focus:outline-none">
        <span className="text-2xl">📥</span>
        <span className="text-xs">PDF</span>
      </button>
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
        <span className="text-2xl">🏠</span>
        <span className="text-xs">Dashboard</span>
      </button>
    </nav>
  );
}
