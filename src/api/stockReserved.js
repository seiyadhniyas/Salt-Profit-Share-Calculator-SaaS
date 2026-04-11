import { supabase } from '../lib/supabaseClient.js'

export async function saveStockReservedToSupabase(stockReservedData, session) {
  if (!supabase || !session?.user?.id) {
    return { ok: false, error: 'No session or supabase' }
  }

  try {
    // Create the record
    const { data, error } = await supabase
      .from('stock_reserved')
      .insert([{
        user_id: session.user.id,
        stock_level: stockReservedData.stockLevel,
        stock_unit: stockReservedData.stockUnit,
        estimated_price: stockReservedData.estimatedPrice,
        total_estimated_price: stockReservedData.totalEstimatedPrice,
        selected_locations: stockReservedData.selectedLocations,
        from_date: stockReservedData.fromDate,
        to_date: stockReservedData.toDate,
        created_at: new Date().toISOString(),
      }])

    if (error) throw error

    return { ok: true, data }
  } catch (error) {
    console.error('Error saving stock reserved:', error)
    return { ok: false, error: error.message }
  }
}

export async function getStockReservedRecords(session, dateFromFilter = null, dateToFilter = null) {
  if (!supabase || !session?.user?.id) {
    return { ok: false, records: [], error: 'No session or supabase' }
  }

  try {
    let query = supabase
      .from('stock_reserved')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (dateFromFilter && dateToFilter) {
      query = query
        .gte('from_date', dateFromFilter)
        .lte('to_date', dateToFilter)
    }

    const { data, error } = await query

    if (error) throw error

    return { ok: true, records: data || [] }
  } catch (error) {
    console.error('Error fetching stock reserved records:', error)
    return { ok: false, records: [], error: error.message }
  }
}

export async function deleteStockReservedRecord(recordId, session) {
  if (!supabase || !session?.user?.id) {
    return { ok: false, error: 'No session or supabase' }
  }

  try {
    const { error } = await supabase
      .from('stock_reserved')
      .delete()
      .eq('id', recordId)
      .eq('user_id', session.user.id)

    if (error) throw error

    return { ok: true }
  } catch (error) {
    console.error('Error deleting stock reserved record:', error)
    return { ok: false, error: error.message }
  }
}
