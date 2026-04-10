// Multi-tenant API integration for Supabase
import { supabase } from '../lib/supabaseClient.js'

export async function createTenant(name) {
  const { data, error } = await supabase
    .from('tenants')
    .insert([{ name }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listTenantsForUser(userId) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, tenants(name), role')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

export async function joinTenant(tenantId, userId, role = 'user') {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .insert([{ tenant_id: tenantId, user_id: userId, role }])
    .select()
    .single()
  if (error) throw error
  return data
}
