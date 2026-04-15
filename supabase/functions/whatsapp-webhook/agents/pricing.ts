import type { SupabaseClient, ManagerInfo, EnvConfig } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { sendWhatsApp } from '../services/fonnte.ts';

/**
 * Pricing Agent: Handle APPROVE/REJECT price approval commands from managers.
 * Returns Response if handled, null otherwise.
 */
export async function handlePriceApproval(
  supabase: SupabaseClient,
  normalizedMessage: string,
  phone: string,
  managerInfo: ManagerInfo,
  env: EnvConfig,
): Promise<Response | null> {
  const approvalPattern = /^(APPROVE|REJECT)\s+([a-f0-9-]+)(?:\s+(.+))?/i;
  const approvalMatch = normalizedMessage.match(approvalPattern);
  if (!approvalMatch) return null;

  console.log(`✅ PRICE APPROVAL RESPONSE detected from manager ${phone}`);
  const action = approvalMatch[1].toUpperCase();
  const roomId = approvalMatch[2];
  const reason = approvalMatch[3] || (action === 'REJECT' ? 'Rejected via WhatsApp' : null);

  try {
    const { data: approval } = await supabase
      .from('price_approvals')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!approval) {
      const errorMessage = `❌ *Approval Not Found*\n\nTidak ada permintaan persetujuan harga yang tertunda untuk kamar ini.\n\nRoom ID: ${roomId}\n\nPastikan ID kamar benar atau persetujuan sudah kadaluarsa (30 menit).`;
      await sendWhatsApp(phone, errorMessage, env.fonnteApiKey);
      return new Response(JSON.stringify({ status: "approval_not_found", room_id: roomId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'APPROVE') {
      await supabase.from('rooms').update({ base_price: approval.new_price }).eq('id', roomId);
      await supabase.from('price_approvals').update({
        status: 'approved', approved_by: managerInfo?.id || null, approved_at: new Date().toISOString()
      }).eq('id', approval.id);
      await supabase.from('pricing_adjustment_logs').insert({
        room_id: roomId, previous_price: approval.old_price, new_price: approval.new_price,
        adjustment_reason: `WhatsApp approved by ${managerInfo?.name || 'Manager'} (${phone})`,
        adjustment_type: 'manual_approved'
      });

      const confirmMessage = `✅ *PRICE CHANGE APPROVED*\n\n🛏️ Room: ${approval.room_id}\n💰 Change: ${approval.price_change_percentage.toFixed(1)}%\n💵 New Price: Rp ${approval.new_price.toLocaleString('id-ID')}\n\n✓ Price updated successfully\n⏰ ${new Date().toLocaleString('id-ID')}\n\n_Approved by: ${managerInfo?.name || 'Manager'}_`;
      await sendWhatsApp(phone, confirmMessage, env.fonnteApiKey);
      return new Response(JSON.stringify({ status: "price_approved", room_id: roomId, new_price: approval.new_price, approved_by: managerInfo?.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      await supabase.from('price_approvals').update({
        status: 'rejected', approved_by: managerInfo?.id || null, approved_at: new Date().toISOString(), rejection_reason: reason
      }).eq('id', approval.id);
      await supabase.from('pricing_adjustment_logs').insert({
        room_id: roomId, previous_price: approval.old_price, new_price: approval.new_price,
        adjustment_reason: `WhatsApp rejected by ${managerInfo?.name || 'Manager'} (${phone}): ${reason}`,
        adjustment_type: 'manual_rejected'
      });

      const rejectMessage = `❌ *PRICE CHANGE REJECTED*\n\n🛏️ Room: ${approval.room_id}\n💰 Proposed: Rp ${approval.new_price.toLocaleString('id-ID')}\n💵 Current: Rp ${approval.old_price.toLocaleString('id-ID')}\n📝 Reason: ${reason}\n\n✓ Rejection recorded\n⏰ ${new Date().toLocaleString('id-ID')}\n\n_Rejected by: ${managerInfo?.name || 'Manager'}_`;
      await sendWhatsApp(phone, rejectMessage, env.fonnteApiKey);
      return new Response(JSON.stringify({ status: "price_rejected", room_id: roomId, reason, rejected_by: managerInfo?.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error('❌ Error processing price approval:', error);
    const errorMsg = `❌ *Error Processing Approval*\n\nTerjadi kesalahan saat memproses persetujuan harga.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nSilakan coba lagi atau hubungi technical support.`;
    await sendWhatsApp(phone, errorMsg, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "error", error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
