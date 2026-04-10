// Role-based access control helpers
import { supabase } from '../lib/supabaseClient.js'

export async function getUserRole(userId, tenantId) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()
  if (error) throw error
  return data?.role
}

export function canEdit(userRole) {
  return userRole === 'admin' || userRole === 'manager'
}

export function canView(userRole) {
  return !!userRole
}
