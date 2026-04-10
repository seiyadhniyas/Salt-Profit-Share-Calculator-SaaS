// Reporting & analytics API
import { supabase } from '../lib/supabaseClient.js'

export async function getReportStats(tenantId) {
  const { data, error } = await supabase
    .from('reports')
    .select('*, total:amount')
    .eq('tenant_id', tenantId)
  if (error) throw error
  // Example: sum amounts
  const total = data.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  return { count: data.length, total }
}
