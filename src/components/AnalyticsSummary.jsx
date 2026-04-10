import React, { useEffect, useState } from 'react'
import { getReportStats } from '../api/analytics.js'

export default function AnalyticsSummary({ tenantId }) {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    if (!tenantId) return
    getReportStats(tenantId).then(setStats)
  }, [tenantId])
  if (!tenantId) return null
  if (!stats) return <div className="text-xs text-slate-400">Loading analytics...</div>
  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <div className="font-bold text-lg">Analytics</div>
      <div className="mt-2 text-sm">Total Reports: {stats.count}</div>
      <div className="mt-1 text-sm">Total Amount: {stats.total}</div>
    </div>
  )
}
