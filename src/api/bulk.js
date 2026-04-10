// Bulk import/export API
import { supabase } from '../lib/supabaseClient.js'

export async function bulkImportReports(reports, tenantId) {
  const { data, error } = await supabase
    .from('reports')
    .insert(reports.map(r => ({ ...r, tenant_id: tenantId })))
  if (error) throw error
  return data
}

export async function bulkExportReports(tenantId) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('tenant_id', tenantId)
  if (error) throw error
  return data
}
