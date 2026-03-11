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

    // Get invoice settings
    const primaryColor = invoiceTemplate?.invoice_primary_color || '#4a9bd9';
    const secondaryColor = invoiceTemplate?.invoice_secondary_color || '#e8f4fd';
    const showLogo = invoiceTemplate?.show_logo ?? true;
    const showBankAccounts = invoiceTemplate?.show_bank_accounts ?? true;
    const footerText = invoiceTemplate?.footer_text || '';
    const customNotes = invoiceTemplate?.custom_notes || '';

    interface BookingRoomItem { rooms?: { name: string } | null; room_number: string; price_per_night: number }
    interface BankAccountItem { bank_name: string; account_number: string; account_holder_name: string }
    interface BookingAddonItem { room_addons?: { name: string; icon_name?: string; price_type?: string } | null; quantity: number; unit_price: number; total_price: number }
    interface RoomListItem { room_name: string; room_number: string; price_per_night: number }

    // Calculate remaining balance
    const paidAmount = booking.payment_amount || 0;
    const remainingBalance = booking.total_price - paidAmount;
    const isFullyPaid = remainingBalance <= 0;

    // Format dates
    const checkInDate = format(new Date(booking.check_in), "dd-MM-yyyy", { locale: id });
    const checkOutDate = format(new Date(booking.check_out), "dd-MM-yyyy", { locale: id });
    const checkInDateLong = format(new Date(booking.check_in), "d MMMM yyyy", { locale: id });
    const checkOutDateLong = format(new Date(booking.check_out), "d MMMM yyyy", { locale: id });
    const checkInTime = booking.check_in_time || hotelSettings.check_in_time || "14:00";
    const checkOutTime = booking.check_out_time || hotelSettings.check_out_time || "12:00";
    const createdAtFormatted = format(new Date(booking.created_at), "d MMM yyyy, HH:mm", { locale: id });
    const createdAtDay = format(new Date(booking.created_at), "EEEE", { locale: id });

    const formatRupiah = (amount: number) => amount.toLocaleString('id-ID') + ',-';

    // Payment method display
    let paymentMethodLabel = 'Bank Transfer';
    if (booking.bank_code) {
      paymentMethodLabel = `Bank Transfer (${booking.bank_code.toUpperCase()})`;
    }

    // Transaction status
    let transactionStatus = 'Belum Bayar';
    if (isFullyPaid) {
      transactionStatus = 'Lunas';
    } else if (paidAmount > 0) {
      transactionStatus = 'DP';
    }

    // Prepare room list items
    const roomListItems = bookingRooms && bookingRooms.length > 0
      ? (bookingRooms as BookingRoomItem[]).map((br) => ({
          room_name: br.rooms?.name || booking.rooms?.name,
          room_number: br.room_number,
          price_per_night: br.price_per_night
        }))
      : [{
          room_name: booking.rooms?.name,
          room_number: booking.allocated_room_number || '-',
          price_per_night: booking.total_price / booking.total_nights
        }];

    // Build detail pembelian rows
    let rowIndex = 0;
    const detailRows = roomListItems.map((room: RoomListItem) => {
      rowIndex++;
      const subtotal = room.price_per_night * booking.total_nights;
      return `
        <tr>
          <td style="text-align:center;">${rowIndex}.</td>
          <td>Akomodasi</td>
          <td>${hotelSettings.hotel_name || 'Pomah Guesthouse'} ${room.room_name} #${room.room_number}<br>${booking.num_guests} Tamu</td>
          <td style="text-align:center;">${booking.total_nights}</td>
          <td style="text-align:right;">${formatRupiah(room.price_per_night)}</td>
          <td style="text-align:right;">${formatRupiah(subtotal)}</td>
        </tr>
      `;
    }).join('');

    // Addon rows
    const addonRows = bookingAddons && bookingAddons.length > 0
      ? (bookingAddons as BookingAddonItem[]).map((addon) => {
          rowIndex++;
          return `
            <tr>
              <td style="text-align:center;">${rowIndex}.</td>
              <td>Add-on</td>
              <td>${addon.room_addons?.name || 'Add-on'}</td>
              <td style="text-align:center;">${addon.quantity}</td>
              <td style="text-align:right;">${formatRupiah(addon.unit_price)}</td>
              <td style="text-align:right;">${formatRupiah(addon.total_price)}</td>
            </tr>
          `;
        }).join('')
      : '';

    // Bank accounts for WhatsApp / text
    const bankAccountsList = remainingBalance > 0 
      ? (bankAccounts && bankAccounts.length > 0
          ? (bankAccounts as BankAccountItem[]).map((bank) => 
              `🏦 ${bank.bank_name}: ${bank.account_number}\n   a.n. ${bank.account_holder_name}`
            ).join('\n\n')
          : 'Silakan hubungi admin untuk detail pembayaran')
      : '✓ Pembayaran sudah lunas - Terima kasih!';

    // Room list text for WhatsApp
    const roomsList = bookingRooms && bookingRooms.length > 0
      ? (bookingRooms as BookingRoomItem[]).map((br) => 
          `• ${br.rooms?.name || booking.rooms?.name} #${br.room_number} - Rp ${br.price_per_night.toLocaleString('id-ID')}`
        ).join('\n')
      : `• ${booking.rooms?.name} - Rp ${booking.total_price.toLocaleString('id-ID')}`;

    let paymentStatus = "BELUM LUNAS";
    if (paidAmount === 0) {
      paymentStatus = "BELUM BAYAR";
    } else if (remainingBalance <= 0) {
      paymentStatus = "LUNAS ✓";
    } else {
      paymentStatus = `DP (Sisa: Rp ${remainingBalance.toLocaleString('id-ID')})`;
    }

    // Bank accounts HTML for invoice
    const bankAccountsHtml = bankAccounts && bankAccounts.length > 0
      ? (bankAccounts as BankAccountItem[]).map((bank) => `
        <div style="background:#fff;padding:12px 16px;margin-bottom:8px;border-radius:4px;border:1px solid #e0e0e0;">
          <strong>${bank.bank_name}</strong><br>
          No. Rek: <strong>${bank.account_number}</strong><br>
          a.n. ${bank.account_holder_name}
        </div>
      `).join('')
      : '';

    // Generate HTML invoice matching the reference receipt design
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
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
      background: #f0f0f0;
      padding: 20px;
      color: #333;
      font-size: 14px;
      line-height: 1.5;
    }
    .invoice-container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 0;
    }
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 30px 40px 20px;
      border-left: 5px solid ${primaryColor};
    }
    .header-left h1 {
      font-size: 20px;
      font-weight: 700;
      color: #222;
      margin-bottom: 4px;
    }
    .header-left .meta {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    .header-right {
      text-align: right;
    }
    .header-right img {
      max-height: 60px;
      max-width: 150px;
      object-fit: contain;
    }

    /* Section Header */
    .section-bar {
      background: ${secondaryColor};
      padding: 8px 40px;
      font-size: 13px;
      font-weight: 700;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 5px solid ${primaryColor};
    }

    /* Section content */
    .section-content {
      padding: 16px 40px 20px;
    }
    .section-content p {
      font-size: 13px;
      color: #444;
      line-height: 1.7;
    }

    /* Detail Pembayaran row */
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 16px 40px 20px;
      font-size: 13px;
      color: #444;
    }
    .payment-row .col {
      flex: 1;
    }
    .payment-row .col strong {
      color: #222;
    }

    /* Detail Pembelian Table */
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 13px;
    }
    .detail-table thead th {
      background: #fff;
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 12px;
    }
    .detail-table tbody td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      vertical-align: top;
      color: #444;
    }
    .detail-table tfoot td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      font-weight: 600;
      color: #222;
    }

    /* Stamp */
    .stamp-section {
      padding: 40px 40px 20px;
      display: flex;
      align-items: flex-start;
    }
    .stamp {
      position: relative;
      width: 130px;
      text-align: center;
    }
    .stamp-logo {
      max-height: 40px;
      max-width: 100px;
      margin-bottom: 4px;
    }
    .stamp-badge {
      background: ${primaryColor};
      color: white;
      font-size: 22px;
      font-weight: 900;
      padding: 6px 24px;
      border-radius: 4px;
      display: inline-block;
      letter-spacing: 2px;
    }
    .stamp-receipt {
      color: ${primaryColor};
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    /* Payment section */
    .payment-info-section {
      padding: 0 40px 30px;
    }
    .bank-card-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Footer */
    .footer-help {
      text-align: center;
      padding: 30px 40px 15px;
      font-size: 13px;
      color: #666;
    }
    .footer-bar {
      background: ${primaryColor};
      color: white;
      text-align: center;
      padding: 12px 40px;
      font-size: 12px;
    }
    .footer-bar a {
      color: white;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>BUKTI PEMBELIAN (RECEIPT)</h1>
        <div class="meta">
          Nomor &nbsp;: #${booking.booking_code}<br>
          Tanggal : ${createdAtFormatted} (${createdAtDay})
        </div>
      </div>
      ${showLogo && (hotelSettings.invoice_logo_url || hotelSettings.logo_url) ? `
        <div class="header-right">
          <img 
            src="${hotelSettings.invoice_logo_url || hotelSettings.logo_url}" 
            alt="${hotelSettings.hotel_name} Logo" 
            crossorigin="anonymous"
            onerror="this.style.display='none'"
          >
        </div>
      ` : ''}
    </div>

    <!-- Detail Pembayaran -->
    <div class="section-bar">DETAIL PEMBAYARAN</div>
    <div class="payment-row">
      <div class="col">P.O. NUMBER: ${booking.booking_code}</div>
      <div class="col">PEMBELIAN MELALUI: ${paymentMethodLabel}</div>
      <div class="col" style="text-align:right;">DETAIL TRANSAKSI: <strong>${transactionStatus}</strong></div>
    </div>

    <!-- Data Pemesan -->
    <div class="section-bar">DATA PEMESAN</div>
    <div class="section-content">
      <p>
        Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${booking.guest_name}<br>
        Email &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${booking.guest_email}<br>
        ${booking.guest_phone ? `No. Kontak : ${booking.guest_phone}` : ''}
      </p>
    </div>

    <!-- Tamu -->
    <div class="section-bar">TAMU</div>
    <div class="section-content">
      <p>
        1. ${booking.guest_name}<br>
        ${booking.num_guests > 1 ? `<span style="color:#999;">+ ${booking.num_guests - 1} tamu lainnya</span>` : ''}
      </p>
    </div>

    <!-- Detail Hotel -->
    <div class="section-bar">DETAIL HOTEL</div>
    <div class="section-content">
      <p>
        <strong>${hotelSettings.hotel_name || 'Pomah Guesthouse'}</strong><br>
        ${hotelSettings.address ? `Alamat: ${hotelSettings.address}${hotelSettings.city ? `, ${hotelSettings.city}` : ''}${hotelSettings.postal_code ? `, ${hotelSettings.postal_code}` : ''}` : ''}<br>
        Check-in: ${checkInDate}<br>
        Check-out: ${checkOutDate}<br>
        Durasi: ${booking.total_nights} malam
      </p>
    </div>

    <!-- Detail Pembelian -->
    <div class="section-bar">DETAIL PEMBELIAN</div>
    <div style="padding: 16px 40px 20px;">
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width:40px;text-align:center;">No</th>
            <th style="width:120px;">Jenis Pemesanan</th>
            <th>Deskripsi</th>
            <th style="width:50px;text-align:center;">Jml.</th>
            <th style="width:120px;text-align:right;">Harga Satuan (Rp)</th>
            <th style="width:120px;text-align:right;">Total (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows}
          ${addonRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;"><strong>TOTAL</strong></td>
            <td style="text-align:right;"><strong>${formatRupiah(booking.total_price)}</strong></td>
          </tr>
          ${paidAmount > 0 && !isFullyPaid ? `
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;">DIBAYAR</td>
            <td style="text-align:right;">${formatRupiah(paidAmount)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;"><strong>SISA</strong></td>
            <td style="text-align:right;"><strong>${formatRupiah(remainingBalance)}</strong></td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;"><strong>JUMLAH PEMBAYARAN</strong></td>
            <td style="text-align:right;"><strong>${formatRupiah(isFullyPaid ? booking.total_price : paidAmount)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Payment instructions if not fully paid -->
    ${remainingBalance > 0 && showBankAccounts && bankAccountsHtml ? `
      <div class="section-bar">INSTRUKSI PEMBAYARAN</div>
      <div class="payment-info-section" style="padding-top:16px;">
        <p style="font-size:13px;color:#666;margin-bottom:12px;">Silakan transfer sisa pembayaran sebesar <strong>Rp ${remainingBalance.toLocaleString('id-ID')}</strong> ke rekening berikut:</p>
        <div class="bank-card-row">
          ${bankAccountsHtml}
        </div>
      </div>
    ` : ''}

    <!-- Paid Stamp -->
    ${isFullyPaid ? `
    <div class="stamp-section">
      <div class="stamp">
        ${showLogo && (hotelSettings.invoice_logo_url || hotelSettings.logo_url) ? `
          <img src="${hotelSettings.invoice_logo_url || hotelSettings.logo_url}" alt="Logo" class="stamp-logo" crossorigin="anonymous" onerror="this.style.display='none'">
        ` : ''}
        <div class="stamp-badge">PAID</div>
        <div class="stamp-receipt">RECEIPT</div>
      </div>
    </div>
    ` : ''}

    <!-- Custom Notes -->
    ${customNotes ? `
      <div style="padding: 0 40px 20px;">
        <div style="background:#fffbf0;padding:16px;border-radius:4px;border-left:4px solid #ffc107;">
          <strong style="color:#856404;">📌 Catatan:</strong>
          <p style="font-size:13px;color:#856404;margin-top:6px;">${customNotes}</p>
        </div>
      </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer-help">
      ${footerText || `Untuk pertanyaan apa pun, kunjungi ${hotelSettings.hotel_name || 'Pomah Guesthouse'} Help Center: ${hotelSettings.phone_primary || ''}`}
    </div>
    <div class="footer-bar">
      Syarat dan Ketentuan berlaku. ${hotelSettings.email_primary ? `Email: ${hotelSettings.email_primary}` : ''}
    </div>
  </div>
</body>
</html>
    `;

    // Prepare variables map for WhatsApp template replacement
    const variables = {
      hotel_name: hotelSettings.hotel_name || 'Pomah Guesthouse',
      hotel_address: hotelSettings.address || '',
      hotel_phone: hotelSettings.phone_primary || '',
      hotel_email: hotelSettings.email_primary || '',
      booking_code: booking.booking_code,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone || '-',
      check_in_date: checkInDateLong,
      check_in_time: checkInTime + ' WIB',
      check_out_date: checkOutDateLong,
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
