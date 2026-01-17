// ============= AUTHENTICATION & AUTHORIZATION =============

import type { AuthResult } from "./types.ts";
import type { ManagerRole } from "./constants.ts";

export async function validateAuth(
  req: Request,
  supabase: any
): Promise<AuthResult> {
  // Check if request is from WhatsApp (internal service call)
  const isWhatsAppSource = req.headers.get("X-WhatsApp-Source") === "true";
  const whatsappPhone = req.headers.get("X-WhatsApp-Phone");
  const managerName = req.headers.get("X-Manager-Name") || "Manager";
  const managerRole = (req.headers.get("X-Manager-Role") || "super_admin") as ManagerRole;

  if (isWhatsAppSource && whatsappPhone) {
    // WhatsApp source - validate phone is in manager list
    console.log(`WhatsApp source request from phone: ${whatsappPhone}, manager: ${managerName}`);
    
    const { data: hotelSettings } = await supabase
      .from('hotel_settings')
      .select('whatsapp_manager_numbers')
      .single();
    
    const managerNumbers: Array<{phone: string; name: string; role?: string}> = 
      hotelSettings?.whatsapp_manager_numbers || [];
    const managerInfo = managerNumbers.find(m => m.phone === whatsappPhone);
    
    if (!managerInfo) {
      console.log(`Phone ${whatsappPhone} not in manager list`);
      return {
        isAuthorized: false,
        adminId: null,
        adminEmail: null,
        managerName,
        managerRole: 'viewer',
        error: "Not a registered manager",
        status: 403
      };
    }

    console.log(`✅ WhatsApp manager authorized: ${managerName} (${whatsappPhone})`);
    return {
      isAuthorized: true,
      adminId: `whatsapp_${whatsappPhone}`,
      adminEmail: `${managerName} (WhatsApp: ${whatsappPhone})`,
      managerName,
      managerRole
    };
  }

  // Web source - verify admin authentication via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      isAuthorized: false,
      adminId: null,
      adminEmail: null,
      managerName,
      managerRole: 'viewer',
      error: "Unauthorized",
      status: 401
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return {
      isAuthorized: false,
      adminId: null,
      adminEmail: null,
      managerName,
      managerRole: 'viewer',
      error: "Invalid token",
      status: 401
    };
  }

  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  if (!adminRole) {
    return {
      isAuthorized: false,
      adminId: null,
      adminEmail: null,
      managerName,
      managerRole: 'viewer',
      error: "Admin access required",
      status: 403
    };
  }

  return {
    isAuthorized: true,
    adminId: user.id,
    adminEmail: user.email || null,
    managerName,
    managerRole
  };
}
