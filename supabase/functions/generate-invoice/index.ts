import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { id } from "https://esm.sh/date-fns@3.6.0/locale/id";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generating invoice for booking:", booking_id);

    // Fetch booking data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        rooms (*)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error("Booking not found");

    // Fetch booking rooms
    const { data: bookingRooms, error: roomsError } = await supabase
      .from("booking_rooms")
      .select(`
        *,
        rooms (name)
      `)
      .eq("booking_id", booking_id);

    if (roomsError) throw roomsError;

    // Fetch hotel settings
    const { data: hotelSettings, error: settingsError } = await supabase
      .from("hotel_settings")
      .select("*")
      .single();

    if (settingsError) throw settingsError;

    // Fetch invoice template settings
    const { data: invoiceTemplate } = await supabase
      .from("invoice_templates")
      .select("*")
      .maybeSingle();

    // Fetch active bank accounts
    const { data: bankAccounts, error: banksError } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (banksError) throw banksError;

    // Fetch booking addons
    const { data: bookingAddons, error: addonsError } = await supabase
      .from("booking_addons")
      .select(`
        *,
        room_addons (name, icon_name, price_type)
      `)
      .eq("booking_id", booking_id);

    if (addonsError) throw addonsError;

    // Get invoice settings (use defaults if not configured)
    const primaryColor = invoiceTemplate?.invoice_primary_color || '#8B4513';
    const secondaryColor = invoiceTemplate?.invoice_secondary_color || '#f8f4f0';
    const showLogo = invoiceTemplate?.show_logo ?? true;
    const showBankAccounts = invoiceTemplate?.show_bank_accounts ?? true;
    const footerText = invoiceTemplate?.footer_text || 'Kami menantikan kedatangan Anda!';
    const customNotes = invoiceTemplate?.custom_notes || '';

    // Format room list
    const roomsList = bookingRooms && bookingRooms.length > 0
      ? bookingRooms.map((br: any) => 
          `• ${br.rooms?.name || booking.rooms?.name} #${br.room_number} - Rp ${br.price_per_night.toLocaleString('id-ID')}`
        ).join('\n')
      : `• ${booking.rooms?.name} - Rp ${booking.total_price.toLocaleString('id-ID')}`;

    // Calculate remaining balance
    const paidAmount = booking.payment_amount || 0;
    const remainingBalance = booking.total_price - paidAmount;
    
    // Format bank accounts for display - show "Lunas" message if fully paid
    const bankAccountsList = remainingBalance > 0 
      ? (bankAccounts && bankAccounts.length > 0
          ? bankAccounts.map((bank: any) => 
              `🏦 ${bank.bank_name}: ${bank.account_number}\n   a.n. ${bank.account_holder_name}`
            ).join('\n\n')
          : hotelSettings.bank_name && hotelSettings.account_number
            ? `🏦 ${hotelSettings.bank_name}: ${hotelSettings.account_number}\n   a.n. ${hotelSettings.account_holder_name || 'Pomah Guesthouse'}`
            : 'Silakan hubungi admin untuk detail pembayaran')
      : '✓ Pembayaran sudah lunas - Terima kasih!';

    // Calculate payment status
    let paymentStatus = "BELUM LUNAS";
    if (paidAmount === 0) {
      paymentStatus = "BELUM BAYAR";
    } else if (remainingBalance === 0) {
      paymentStatus = "LUNAS ✓";
    } else {
      paymentStatus = `DP (Sisa: Rp ${remainingBalance.toLocaleString('id-ID')})`;
    }

    // Format dates
    const checkInDate = format(new Date(booking.check_in), "d MMMM yyyy", { locale: id });
    const checkOutDate = format(new Date(booking.check_out), "d MMMM yyyy", { locale: id });
    const checkInTime = booking.check_in_time || hotelSettings.check_in_time || "14:00";
    const checkOutTime = booking.check_out_time || hotelSettings.check_out_time || "12:00";

    // Format data for invoice
    const formattedCheckIn = format(new Date(booking.check_in), "d MMMM yyyy", { locale: id });
    const formattedCheckOut = format(new Date(booking.check_out), "d MMMM yyyy", { locale: id });
    const formattedCreatedAt = format(new Date(booking.created_at), "d MMMM yyyy", { locale: id });
    
    const formatRupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;
    
    // Prepare room list items
    const roomListItems = bookingRooms && bookingRooms.length > 0
      ? bookingRooms.map((br: any) => ({
          room_name: br.rooms?.name || booking.rooms?.name,
          room_number: br.room_number,
          price_per_night: br.price_per_night
        }))
      : [{
          room_name: booking.rooms?.name,
          room_number: booking.allocated_room_number || '-',
          price_per_night: booking.total_price / booking.total_nights
        }];
    
    // Calculate tax
    const taxRate = hotelSettings.tax_rate || 0;
    const taxAmount = (booking.total_price * taxRate) / 100;
    
    // Prepare bank accounts HTML
    const bankAccountsHtml = bankAccounts && bankAccounts.length > 0
      ? bankAccounts.map((bank: any) => `
        <div class="bank-card">
          <div class="bank-name">🏦 ${bank.bank_name}</div>
          <div class="bank-detail">Rekening: <strong>${bank.account_number}</strong></div>
          <div class="bank-detail">a.n. ${bank.account_holder_name}</div>
        </div>
      `).join('')
      : hotelSettings.bank_name && hotelSettings.account_number
        ? `
        <div class="bank-card">
          <div class="bank-name">🏦 ${hotelSettings.bank_name}</div>
          <div class="bank-detail">Rekening: <strong>${hotelSettings.account_number}</strong></div>
          <div class="bank-detail">a.n. ${hotelSettings.account_holder_name || 'Pomah Guesthouse'}</div>
        </div>
        `
        : '<p>Silakan hubungi admin untuk detail pembayaran.</p>';

    // Generate HTML invoice
    const invoiceHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${booking.booking_code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; 
      background-color: #f8f9fa;
      padding: 20px;
      color: #333;
    }
    .invoice-container { 
      max-width: 850px; 
      margin: 0 auto; 
      background: white; 
      padding: 50px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${primaryColor};
    }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .logo { max-height: 60px; max-width: 180px; object-fit: contain; }
    .hotel-name { font-size: 24px; font-weight: bold; color: ${primaryColor}; }
    .header-right { text-align: right; font-size: 13px; color: #666; line-height: 1.8; }
    .invoice-title-section { 
      text-align: right; 
      margin-bottom: 40px;
    }
    .invoice-title { 
      font-size: 42px; 
      font-weight: bold; 
      font-style: italic; 
      color: ${primaryColor};
      margin-bottom: 10px;
    }
    .invoice-meta { 
      font-size: 14px; 
      color: #666; 
      line-height: 1.8;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 5px;
    }
    .status-confirmed { background-color: #d4edda; color: #155724; }
    .status-pending { background-color: #fff3cd; color: #856404; }
    .status-cancelled { background-color: #f8d7da; color: #721c24; }
    .guest-info-box { 
      background: white;
      border-left: 4px solid ${primaryColor};
      padding: 25px 30px;
      margin-bottom: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .guest-label { 
      font-style: italic; 
      color: ${primaryColor}; 
      font-size: 14px;
      margin-bottom: 8px;
    }
    .guest-name { 
      font-size: 20px; 
      font-weight: bold; 
      margin-bottom: 8px;
      color: #222;
    }
    .guest-detail { 
      font-size: 14px; 
      color: #666; 
      margin: 4px 0;
    }
    .section-title { 
      font-size: 18px; 
      font-weight: bold; 
      color: ${primaryColor};
      margin: 40px 0 20px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .booking-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 30px;
      font-size: 14px;
    }
    .booking-table thead { 
      background: ${primaryColor}; 
      color: white;
    }
    .booking-table th { 
      padding: 14px 12px; 
      text-align: left; 
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .booking-table td { 
      padding: 14px 12px; 
      border-bottom: 1px solid #e9ecef;
    }
    .booking-table tbody tr:hover { 
      background-color: #f8f9fa;
    }
    .booking-table .text-right { text-align: right; }
    .booking-table .text-center { text-align: center; }
    .stay-details {
      background: #f8f9fa;
      padding: 20px 25px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .stay-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      font-size: 14px;
    }
    .stay-detail-item {
      display: flex;
      gap: 8px;
    }
    .stay-detail-label {
      font-weight: 600;
      color: #555;
      min-width: 80px;
    }
    .stay-detail-value {
      color: #222;
    }
    .summary-section { 
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .summary-table {
      width: 350px;
      font-size: 15px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .summary-row.total {
      border-top: 2px solid ${primaryColor};
      border-bottom: none;
      padding-top: 15px;
      margin-top: 10px;
      font-size: 18px;
      font-weight: bold;
      color: ${primaryColor};
    }
    .payment-section {
      background: #f5f5f5;
      padding: 25px;
      margin-top: 40px;
      border-radius: 6px;
    }
    .payment-title {
      font-size: 18px;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .payment-instruction {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .bank-card {
      background: white;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .bank-name {
      font-size: 16px;
      font-weight: bold;
      color: #222;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bank-detail {
      font-size: 14px;
      color: #666;
      margin: 5px 0;
    }
    .paid-message {
      background: #d4edda;
      color: #155724;
      padding: 20px;
      border-radius: 6px;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 25px;
      border-top: 2px solid #e9ecef;
      text-align: center;
      color: #999;
      font-size: 13px;
    }
    .notes-section {
      background: #fffbf0;
      padding: 20px;
      margin-top: 30px;
      border-radius: 6px;
      border-left: 4px solid #ffc107;
    }
    .notes-title {
      font-weight: bold;
      color: #856404;
      margin-bottom: 10px;
    }
    .notes-content {
      font-size: 14px;
      color: #856404;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${showLogo && (hotelSettings.invoice_logo_url || hotelSettings.logo_url) ? `
          <img 
            src="${hotelSettings.invoice_logo_url || hotelSettings.logo_url}" 
            alt="${hotelSettings.hotel_name} Logo" 
            class="logo"
            crossorigin="anonymous"
            onerror="this.style.display='none'"
          >
        ` : ''}
        <div class="hotel-name">${hotelSettings.hotel_name || 'Pomah Guesthouse'}</div>
      </div>
      <div class="header-right">
        ${hotelSettings.address ? `📍 ${hotelSettings.address}` : ''}<br>
        ${hotelSettings.city ? `${hotelSettings.city}, ${hotelSettings.country || 'Indonesia'}` : ''}<br>
        ${hotelSettings.email_primary ? `📧 ${hotelSettings.email_primary}` : ''}<br>
        ${hotelSettings.phone_primary ? `📞 ${hotelSettings.phone_primary}` : ''}
      </div>
    </div>

    <!-- Invoice Title Section -->
    <div class="invoice-title-section">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <strong>Kode Booking #${booking.booking_code}</strong><br>
        Tanggal: ${formattedCreatedAt}<br>
        <span class="status-badge status-${booking.status}">${booking.status.toUpperCase()}</span>
      </div>
    </div>

    <!-- Guest Information -->
    <div class="guest-info-box">
      <div class="guest-label">Nama Tamu</div>
      <div class="guest-name">${booking.guest_name}</div>
      <div class="guest-detail">${booking.guest_email}</div>
      ${booking.guest_phone ? `<div class="guest-detail">${booking.guest_phone}</div>` : ''}
    </div>

    <!-- Detail Booking -->
    <div class="section-title">📋 DETAIL BOOKING</div>
    <table class="booking-table">
      <thead>
        <tr>
          <th style="width: 60px;">NO</th>
          <th>DESKRIPSI</th>
          <th class="text-right" style="width: 140px;">HARGA/MALAM</th>
          <th class="text-center" style="width: 80px;">MALAM</th>
          <th class="text-right" style="width: 140px;">SUBTOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${roomListItems.map((room: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${room.room_name}</strong><br>
              <small style="color: #666;">Nomor Kamar: ${room.room_number}</small>
            </td>
            <td class="text-right">${formatRupiah(room.price_per_night)}</td>
            <td class="text-center">${booking.total_nights}</td>
            <td class="text-right"><strong>${formatRupiah(room.price_per_night * booking.total_nights)}</strong></td>
          </tr>
        `).join('')}
        ${bookingAddons && bookingAddons.length > 0 ? bookingAddons.map((addon: any, index: number) => `
          <tr style="background-color: #f8f9fa;">
            <td>${roomListItems.length + index + 1}</td>
            <td>
              <strong>✨ ${addon.room_addons?.name || 'Add-on'}</strong><br>
              <small style="color: #666;">Qty: ${addon.quantity}</small>
            </td>
            <td class="text-right">${formatRupiah(addon.unit_price)}</td>
            <td class="text-center">-</td>
            <td class="text-right"><strong>${formatRupiah(addon.total_price)}</strong></td>
          </tr>
        `).join('') : ''}
      </tbody>
    </table>

    <!-- Detail Menginap -->
    <div class="section-title">🗓️ Detail Menginap</div>
    <div class="stay-details">
      <div class="stay-details-grid">
        <div class="stay-detail-item">
          <span class="stay-detail-label">Check-in:</span>
          <span class="stay-detail-value">${formattedCheckIn}, ${booking.check_in_time || '14:00'} WIB</span>
        </div>
        <div class="stay-detail-item">
          <span class="stay-detail-label">Check-out:</span>
          <span class="stay-detail-value">${formattedCheckOut}, ${booking.check_out_time || '12:00'} WIB</span>
        </div>
        <div class="stay-detail-item">
          <span class="stay-detail-label">Durasi:</span>
          <span class="stay-detail-value">${booking.total_nights} malam</span>
        </div>
        <div class="stay-detail-item">
          <span class="stay-detail-label">Tamu:</span>
          <span class="stay-detail-value">${booking.num_guests} orang</span>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="summary-section">
      <div class="summary-table">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>${formatRupiah(booking.total_price)}</span>
        </div>
        <div class="summary-row">
          <span>Pajak (${taxRate}%):</span>
          <span>${formatRupiah(taxAmount)}</span>
        </div>
        <div class="summary-row total">
          <span>TOTAL:</span>
          <span>${formatRupiah(booking.total_price)}</span>
        </div>
      </div>
    </div>

    <!-- Payment Instructions or Paid Message -->
    ${remainingBalance > 0 && showBankAccounts ? `
      <div class="payment-section">
        <div class="payment-title">💳 Instruksi Pembayaran</div>
        <div class="payment-instruction">
          Silakan transfer ${remainingBalance === booking.total_price ? 'pembayaran' : 'sisa pembayaran'} sebesar <strong>${formatRupiah(remainingBalance)}</strong> ke salah satu rekening berikut:
        </div>
        ${bankAccountsHtml}
      </div>
    ` : remainingBalance === 0 ? `
      <div class="paid-message">
        ✓ Pembayaran sudah lunas - Terima kasih!
      </div>
    ` : ''}

    <!-- Custom Notes -->
    ${customNotes ? `
      <div class="notes-section">
        <div class="notes-title">📌 Catatan Penting</div>
        <div class="notes-content">${customNotes}</div>
      </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      ${footerText || 'Terima kasih telah memilih ' + (hotelSettings.hotel_name || 'Pomah Guesthouse') + '. Kami menantikan kedatangan Anda!'}<br>
      <small>Invoice ini dibuat secara otomatis pada ${formattedCreatedAt}</small>
    </div>
  </div>
</body>
</html>
    `;

    // Prepare variables map for template replacement
    const variables = {
      hotel_name: hotelSettings.hotel_name || 'Pomah Guesthouse',
      hotel_address: hotelSettings.address || '',
      hotel_phone: hotelSettings.phone_primary || '',
      hotel_email: hotelSettings.email_primary || '',
      booking_code: booking.booking_code,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone || '-',
      check_in_date: checkInDate,
      check_in_time: checkInTime + ' WIB',
      check_out_date: checkOutDate,
      check_out_time: checkOutTime + ' WIB',
      total_nights: `${booking.total_nights} malam`,
      num_guests: `${booking.num_guests} orang`,
      room_list: roomsList,
      total_price: `Rp ${booking.total_price.toLocaleString('id-ID')}`,
      payment_amount: `Rp ${paidAmount.toLocaleString('id-ID')}`,
      remaining_balance: `Rp ${remainingBalance.toLocaleString('id-ID')}`,
      payment_status: paymentStatus,
      bank_accounts: bankAccountsList,
      booking_status: booking.status.toUpperCase()
    };

    console.log("Invoice generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice_html: invoiceHtml,
        variables
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Generate invoice error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
