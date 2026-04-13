import React from 'react'
import TenantSwitcher from './TenantSwitcher.jsx'

export default function RedesignedHeader({ user, tenantId, setTenantId, userRole }) {
  return (
    <header 
      className="flex items-center justify-between px-6 py-4 shadow-lg"
      style={{ background: 'linear-gradient(to right, #9333ea, #6366f1)' }}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl font-extrabold text-white tracking-tight">Salt Profit Share</span>
        <TenantSwitcher user={user} tenantId={tenantId} setTenantId={setTenantId} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-white font-semibold text-sm">{userRole ? userRole.toUpperCase() : ''}</span>
        {user && <span className="text-white text-xs">{user.email}</span>}
      </div>
    </header>
  )
}
