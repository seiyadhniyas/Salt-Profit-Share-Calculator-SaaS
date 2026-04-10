import React, { useEffect, useState } from 'react'
import { listTenantsForUser } from '../api/tenants.js'

export default function TenantSwitcher({ user, tenantId, setTenantId }) {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    listTenantsForUser(user.id)
      .then(setTenants)
      .finally(() => setLoading(false))
  }, [user])

  if (!user?.id) return null
  if (loading) return <div className="text-xs text-slate-400">Loading tenants...</div>
  if (!tenants.length) return <div className="text-xs text-slate-400">No organizations found</div>

  return (
    <select
      className="border border-slate-400 rounded px-3 py-2 text-sm"
      value={tenantId || ''}
      onChange={e => setTenantId(e.target.value)}
    >
      {tenants.map(tm => (
        <option key={tm.tenant_id} value={tm.tenant_id}>
          {tm.tenants?.name || tm.tenant_id} ({tm.role})
        </option>
      ))}
    </select>
  )
}
