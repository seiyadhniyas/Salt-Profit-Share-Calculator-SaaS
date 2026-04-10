import React, { useRef } from 'react'
import { bulkImportReports, bulkExportReports } from '../api/bulk.js'

export default function BulkImportExport({ tenantId }) {
  const fileInput = useRef()

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const reports = JSON.parse(text)
    await bulkImportReports(reports, tenantId)
    alert('Import successful!')
  }

  async function handleExport() {
    const reports = await bulkExportReports(tenantId)
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reports.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-4 items-center">
      <button onClick={() => fileInput.current.click()} className="bg-blue-600 text-white px-4 py-2 rounded">Import</button>
      <input type="file" ref={fileInput} style={{ display: 'none' }} accept="application/json" onChange={handleImport} />
      <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded">Export</button>
    </div>
  )
}
