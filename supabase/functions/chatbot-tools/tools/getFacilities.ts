import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Get list of hotel facilities
 */
export async function handleGetFacilities(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("facilities")
    .select("title, description, icon_name")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  
  return { facilities: data };
}
