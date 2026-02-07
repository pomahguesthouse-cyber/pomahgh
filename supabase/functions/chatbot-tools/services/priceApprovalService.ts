// WhatsApp approval system for real-time pricing
// Integrates with existing WhatsApp service for price change approvals

import { sendWhatsApp, buildAdminMessage } from './whatsappService.ts';

interface PriceApprovalRequest {
  room_id: string;
  room_name: string;
  old_price: number;
  new_price: number;
  price_change_percentage: number;
  approval_threshold: number;
  expires_at: string;
  pricing_factors: any;
}

interface ApprovalResponse {
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export class PriceApprovalManager {
  private supabase: any;
  private pendingApprovals: Map<string, PriceApprovalRequest> = new Map();

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  // Create price approval request
  async createApprovalRequest(request: PriceApprovalRequest): Promise<string> {
    const approvalId = crypto.randomUUID();
    
    // Store in database
    const { data, error } = await this.supabase
      .from('price_approvals')
      .insert({
        id: approvalId,
        room_id: request.room_id,
        old_price: request.old_price,
        new_price: request.new_price,
        price_change_percentage: request.price_change_percentage,
        approval_threshold: request.approval_threshold,
        status: 'pending',
        expires_at: request.expires_at,
        pricing_factors: request.pricing_factors
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create approval request: ${error.message}`);
    }

    // Store in memory for quick access
    this.pendingApprovals.set(approvalId, request);

    // Send WhatsApp notification
    await this.sendApprovalNotification(data);

    return approvalId;
  }

  // Send WhatsApp approval notification
  private async sendApprovalNotification(approval: any): Promise<void> {
    try {
      // Get hotel settings
      const { data: settings } = await this.supabase
        .from('hotel_settings')
        .select('whatsapp_number, hotel_name')
        .single();

      if (!settings?.whatsapp_number) {
        console.log('No WhatsApp number configured for approvals');
        return;
      }

      // Build approval message
      const message = this.buildApprovalMessage(approval, settings.hotel_name);

      // Send WhatsApp
      await sendWhatsApp(settings.whatsapp_number, message, 'admin');

      // Update approval record with message ID
      await this.supabase
        .from('price_approvals')
        .update({ whatsapp_message_id: `msg_${approval.id}` })
        .eq('id', approval.id);

      console.log(`Approval notification sent for room ${approval.room_id}`);

    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  }

  // Build WhatsApp approval message
  private buildApprovalMessage(approval: any, hotelName?: string): string {
    const expiresAt = new Date(approval.expires_at);
    const expiresInMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60));

    return `🔄 *PRICE CHANGE APPROVAL NEEDED*

📍 ${hotelName || 'Hotel'}
🛏️ Room: ${approval.room_name || 'Unknown Room'}
💰 Price Change: ${approval.price_change_percentage > 0 ? '+' : ''}${approval.price_change_percentage.toFixed(1)}%
💵 Old Price: Rp ${approval.old_price.toLocaleString('id-ID')}
💵 New Price: Rp ${approval.new_price.toLocaleString('id-ID')}

📊 *Pricing Factors:*
• Occupancy: ${(approval.pricing_factors?.occupancy_rate || 0).toFixed(1)}%
• Demand Score: ${(approval.pricing_factors?.demand_score || 0).toFixed(1)}
• Time Multiplier: ${approval.pricing_factors?.time_multiplier || 1.0}x
• Competitor Gap: ${approval.pricing_factors?.competitor_multiplier || 1.0}x

⏰ *Expires in ${expiresInMinutes} minutes*

🔘 *Reply to approve/reject:*
• APPROVE ${approval.room_id}
• REJECT ${approval.room_id} [reason]

---
*Auto-pricing system*`;

  }

  // Process WhatsApp approval response
  async processApprovalResponse(message: string, senderPhone: string): Promise<void> {
    try {
      // Parse message
      const parsed = this.parseApprovalMessage(message);
      if (!parsed) {
        console.log('Invalid approval message format:', message);
        return;
      }

      // Find pending approval
      const { data: approval } = await this.supabase
        .from('price_approvals')
        .select('*')
        .eq('room_id', parsed.roomId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!approval) {
        console.log(`No pending approval found for room ${parsed.roomId}`);
        return;
      }

      // Get user info from phone number
      const { data: user } = await this.supabase
        .from('profiles')
        .select('id, full_name')
        .eq('phone', senderPhone)
        .single();

      // Process approval
      if (parsed.action === 'approve') {
        await this.approvePriceChange(approval.id, user?.id);
      } else if (parsed.action === 'reject') {
        await this.rejectPriceChange(approval.id, user?.id, parsed.reason);
      }

    } catch (error) {
      console.error('Error processing approval response:', error);
    }
  }

  // Parse approval message
  private parseApprovalMessage(message: string): { action: string; roomId: string; reason?: string } | null {
    const upperMessage = message.toUpperCase().trim();
    
    // Approve pattern: APPROVE [room_id]
    const approveMatch = upperMessage.match(/^APPROVE\s+([a-f0-9-]+)$/i);
    if (approveMatch) {
      return { action: 'approve', roomId: approveMatch[1] };
    }

    // Reject pattern: REJECT [room_id] [reason]
    const rejectMatch = upperMessage.match(/^REJECT\s+([a-f0-9-]+)\s+(.+)$/i);
    if (rejectMatch) {
      return { action: 'reject', roomId: rejectMatch[1], reason: rejectMatch[2] };
    }

    // Reject pattern without reason: REJECT [room_id]
    const rejectSimpleMatch = upperMessage.match(/^REJECT\s+([a-f0-9-]+)$/i);
    if (rejectSimpleMatch) {
      return { action: 'reject', roomId: rejectSimpleMatch[1], reason: 'Rejected via WhatsApp' };
    }

    return null;
  }

  // Approve price change
  async approvePriceChange(approvalId: string, userId?: string): Promise<void> {
    try {
      // Get approval details
      const { data: approval } = await this.supabase
        .from('price_approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (!approval) {
        throw new Error('Approval not found');
      }

      // Update room price
      await this.supabase
        .from('rooms')
        .update({ base_price: approval.new_price })
        .eq('id', approval.room_id);

      // Update approval status
      await this.supabase
        .from('price_approvals')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      // Log the price change
      await this.supabase
        .from('pricing_adjustment_logs')
        .insert({
          room_id: approval.room_id,
          previous_price: approval.old_price,
          new_price: approval.new_price,
          adjustment_reason: `WhatsApp approved: ${approval.price_change_percentage.toFixed(1)}% change`,
          adjustment_type: 'manual_approved'
        });

      // Update cache
      await this.invalidatePriceCache(approval.room_id);

      // Send confirmation
      await this.sendApprovalConfirmation(approval, 'approved');

      console.log(`Price change approved for room ${approval.room_id}`);

    } catch (error) {
      console.error('Error approving price change:', error);
    }
  }

  // Reject price change
  async rejectPriceChange(approvalId: string, userId?: string, reason?: string): Promise<void> {
    try {
      // Get approval details
      const { data: approval } = await this.supabase
        .from('price_approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (!approval) {
        throw new Error('Approval not found');
      }

      // Update approval status
      await this.supabase
        .from('price_approvals')
        .update({
          status: 'rejected',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason || 'Rejected via WhatsApp'
        })
        .eq('id', approvalId);

      // Log the rejection
      await this.supabase
        .from('pricing_adjustment_logs')
        .insert({
          room_id: approval.room_id,
          previous_price: approval.old_price,
          new_price: approval.new_price,
          adjustment_reason: `WhatsApp rejected: ${reason || 'No reason provided'}`,
          adjustment_type: 'manual_rejected'
        });

      // Send confirmation
      await this.sendApprovalConfirmation(approval, 'rejected', reason);

      console.log(`Price change rejected for room ${approval.room_id}`);

    } catch (error) {
      console.error('Error rejecting price change:', error);
    }
  }

  // Send approval confirmation
  private async sendApprovalConfirmation(approval: any, status: string, reason?: string): Promise<void> {
    try {
      const { data: settings } = await this.supabase
        .from('hotel_settings')
        .select('whatsapp_number')
        .single();

      if (!settings?.whatsapp_number) {
        return;
      }

      let message = `✅ *PRICE CHANGE ${status.toUpperCase()}*

🛏️ Room: ${approval.room_name}
💰 Change: ${approval.price_change_percentage > 0 ? '+' : ''}${approval.price_change_percentage.toFixed(1)}%
💵 Old Price: Rp ${approval.old_price.toLocaleString('id-ID')}
💵 New Price: Rp ${approval.new_price.toLocaleString('id-ID')}`;

      if (status === 'rejected' && reason) {
        message += `\n📝 Reason: ${reason}`;
      }

      message += `\n⏰ Processed at: ${new Date().toLocaleString('id-ID')}`;

      await sendWhatsApp(settings.whatsapp_number, message, 'admin');

    } catch (error) {
      console.error('Error sending approval confirmation:', error);
    }
  }

  // Auto-approve small changes
  async checkAutoApproval(roomId: string, oldPrice: number, newPrice: number): Promise<boolean> {
    const changePercentage = Math.abs((newPrice - oldPrice) / oldPrice * 100);
    
    // Auto-approve changes under 5%
    if (changePercentage < 5) {
      await this.autoApprovePriceChange(roomId, oldPrice, newPrice, changePercentage);
      return true;
    }

    return false;
  }

  // Auto-approve price change
  private async autoApprovePriceChange(roomId: string, oldPrice: number, newPrice: number, changePercentage: number): Promise<void> {
    try {
      // Update room price
      await this.supabase
        .from('rooms')
        .update({ base_price: newPrice })
        .eq('id', roomId);

      // Create auto-approved approval record
      await this.supabase
        .from('price_approvals')
        .insert({
          room_id: roomId,
          old_price: oldPrice,
          new_price: newPrice,
          price_change_percentage: changePercentage,
          status: 'auto_approved',
          auto_approve: true,
          approved_at: new Date().toISOString()
        });

      // Log the price change
      await this.supabase
        .from('pricing_adjustment_logs')
        .insert({
          room_id: roomId,
          previous_price: oldPrice,
          new_price: newPrice,
          adjustment_reason: `Auto-approved: ${changePercentage.toFixed(1)}% change (< 5% threshold)`,
          adjustment_type: 'auto_approved'
        });

      console.log(`Auto-approved price change for room ${roomId}: ${changePercentage.toFixed(1)}%`);

    } catch (error) {
      console.error('Error auto-approving price change:', error);
    }
  }

  // Clean up expired approvals
  async cleanupExpiredApprovals(): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('price_approvals')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      const cleanedCount = data?.length || 0;
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired approvals`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('Error cleaning up expired approvals:', error);
      return 0;
    }
  }

  // Invalidate price cache
  private async invalidatePriceCache(roomId: string): Promise<void> {
    try {
      // This would integrate with your Redis cache
      console.log(`Invalidating price cache for room ${roomId}`);
    } catch (error) {
      console.error('Error invalidating price cache:', error);
    }
  }

  // Get pending approvals count
  async getPendingApprovalsCount(): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('price_approvals')
        .select('id')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      return data?.length || 0;

    } catch (error) {
      console.error('Error getting pending approvals count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export let priceApprovalManager: PriceApprovalManager;

export function initializePriceApprovalManager(supabase: any): PriceApprovalManager {
  priceApprovalManager = new PriceApprovalManager(supabase);
  return priceApprovalManager;
}