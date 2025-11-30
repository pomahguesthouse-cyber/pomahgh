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

    // Fetch active bank accounts
    const { data: bankAccounts, error: banksError } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (banksError) throw banksError;

    // Format room list
    const roomsList = bookingRooms && bookingRooms.length > 0
      ? bookingRooms.map((br: any) => 
          `• ${br.rooms?.name || booking.rooms?.name} #${br.room_number} - Rp ${br.price_per_night.toLocaleString('id-ID')}`
        ).join('\n')
      : `• ${booking.rooms?.name} - Rp ${booking.total_price.toLocaleString('id-ID')}`;

    // Format bank accounts
    const bankAccountsList = bankAccounts && bankAccounts.length > 0
      ? bankAccounts.map((bank: any) => 
          `🏦 ${bank.bank_name}: ${bank.account_number}\n   a.n. ${bank.account_holder_name}`
        ).join('\n')
      : hotelSettings.bank_name && hotelSettings.account_number
        ? `🏦 ${hotelSettings.bank_name}: ${hotelSettings.account_number}\n   a.n. ${hotelSettings.account_holder_name || 'Pomah Guesthouse'}`
        : 'Silakan hubungi admin untuk detail pembayaran';

    // Calculate payment status
    const paidAmount = booking.payment_amount || 0;
    const remainingBalance = booking.total_price - paidAmount;
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

    // Generate HTML invoice
    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid ${hotelSettings.primary_color || '#8B4513'};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .hotel-name {
      font-size: 28px;
      font-weight: bold;
      color: ${hotelSettings.primary_color || '#8B4513'};
      margin: 10px 0;
    }
    .tagline {
      color: #666;
      font-style: italic;
    }
    .invoice-title {
      font-size: 36px;
      font-weight: bold;
      color: ${hotelSettings.primary_color || '#8B4513'};
      margin: 20px 0;
    }
    .booking-code {
      font-size: 18px;
      color: #666;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    .info-box {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      color: ${hotelSettings.primary_color || '#8B4513'};
      font-size: 14px;
      text-transform: uppercase;
    }
    .info-box p {
      margin: 5px 0;
      color: #333;
    }
    .table-container {
      margin: 30px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: ${hotelSettings.primary_color || '#8B4513'};
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    .summary {
      margin: 30px 0;
      float: right;
      width: 300px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .summary-total {
      font-size: 20px;
      font-weight: bold;
      color: ${hotelSettings.primary_color || '#8B4513'};
      border-top: 2px solid ${hotelSettings.primary_color || '#8B4513'};
      padding-top: 10px;
      margin-top: 10px;
    }
    .payment-status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
      background: ${remainingBalance === 0 ? '#4caf50' : (paidAmount === 0 ? '#f44336' : '#ff9800')};
      color: white;
    }
    .bank-info {
      clear: both;
      background: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin: 30px 0;
      border-left: 4px solid ${hotelSettings.primary_color || '#8B4513'};
    }
    .bank-info h3 {
      margin: 0 0 15px 0;
      color: ${hotelSettings.primary_color || '#8B4513'};
    }
    .bank-account {
      margin: 10px 0;
      padding: 10px;
      background: white;
      border-radius: 3px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      color: #666;
    }
    @media print {
      body { background: white; }
      .invoice-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      ${hotelSettings.logo_url ? `<img src="${hotelSettings.logo_url}" alt="Logo" style="max-height: 80px; margin-bottom: 10px;">` : ''}
      <div class="hotel-name">${hotelSettings.hotel_name || 'Pomah Guesthouse'}</div>
      <div class="tagline">${hotelSettings.tagline || 'Your Home Away From Home'}</div>
      <p style="margin: 10px 0; color: #666; font-size: 14px;">
        📍 ${hotelSettings.address || ''}, ${hotelSettings.city || ''}<br>
        📧 ${hotelSettings.email_primary || ''} | 📞 ${hotelSettings.phone_primary || ''}
      </p>
    </div>

    <div style="text-align: center;">
      <div class="invoice-title">INVOICE</div>
      <div class="booking-code">#${booking.booking_code}</div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h3>👤 Ditagih Kepada</h3>
        <p><strong>${booking.guest_name}</strong></p>
        <p>${booking.guest_email}</p>
        <p>${booking.guest_phone || '-'}</p>
        <p style="margin-top: 15px;">
          🔑 Check-in: ${checkInDate}, ${checkInTime}<br>
          🔑 Check-out: ${checkOutDate}, ${checkOutTime}
        </p>
      </div>

      <div class="info-box">
        <h3>📋 Detail Booking</h3>
        <p>Tanggal: ${format(new Date(booking.created_at), "d MMMM yyyy", { locale: id })}</p>
        <p>Status: <strong>${booking.status.toUpperCase()}</strong></p>
        <p>Total Malam: <strong>${booking.total_nights} malam</strong></p>
        <p>Jumlah Tamu: <strong>${booking.num_guests} orang</strong></p>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Deskripsi</th>
            <th>Harga/Malam</th>
            <th>Malam</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${bookingRooms && bookingRooms.length > 0 
            ? bookingRooms.map((br: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${br.rooms?.name || booking.rooms?.name} #${br.room_number}</td>
                <td>Rp ${br.price_per_night.toLocaleString('id-ID')}</td>
                <td>${booking.total_nights}</td>
                <td>Rp ${(br.price_per_night * booking.total_nights).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')
            : `
              <tr>
                <td>1</td>
                <td>${booking.rooms?.name}</td>
                <td>Rp ${(booking.total_price / booking.total_nights).toLocaleString('id-ID')}</td>
                <td>${booking.total_nights}</td>
                <td>Rp ${booking.total_price.toLocaleString('id-ID')}</td>
              </tr>
            `
          }
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>Rp ${booking.total_price.toLocaleString('id-ID')}</span>
      </div>
      <div class="summary-row">
        <span>Pajak (${hotelSettings.tax_rate || 0}%):</span>
        <span>Rp ${((booking.total_price * (hotelSettings.tax_rate || 0)) / 100).toLocaleString('id-ID')}</span>
      </div>
      <div class="summary-row summary-total">
        <span>TOTAL:</span>
        <span>Rp ${booking.total_price.toLocaleString('id-ID')}</span>
      </div>
      <div class="summary-row" style="color: #4caf50;">
        <span>Terbayar:</span>
        <span>Rp ${paidAmount.toLocaleString('id-ID')}</span>
      </div>
      <div class="summary-row" style="font-weight: bold; color: ${remainingBalance > 0 ? '#f44336' : '#4caf50'};">
        <span>Sisa:</span>
        <span>Rp ${remainingBalance.toLocaleString('id-ID')}</span>
      </div>
      <div style="text-align: center;">
        <span class="payment-status">${paymentStatus}</span>
      </div>
    </div>

    <div style="clear: both;"></div>

    ${remainingBalance > 0 ? `
    <div class="bank-info">
      <h3>💳 Instruksi Pembayaran</h3>
      <p style="margin-bottom: 15px;">Silakan transfer sisa pembayaran ke salah satu rekening berikut:</p>
      ${bankAccounts && bankAccounts.length > 0 
        ? bankAccounts.map((bank: any) => `
          <div class="bank-account">
            <strong>🏦 ${bank.bank_name}</strong><br>
            Rekening: ${bank.account_number}<br>
            a.n. ${bank.account_holder_name}
          </div>
        `).join('')
        : hotelSettings.bank_name && hotelSettings.account_number
          ? `
          <div class="bank-account">
            <strong>🏦 ${hotelSettings.bank_name}</strong><br>
            Rekening: ${hotelSettings.account_number}<br>
            a.n. ${hotelSettings.account_holder_name || 'Pomah Guesthouse'}
          </div>
          `
          : '<p>Silakan hubungi admin untuk detail pembayaran.</p>'
      }
      <p style="margin-top: 15px; color: #f44336;">⚠️ <strong>Pembayaran paling lambat sebelum check-in</strong></p>
    </div>
    ` : ''}

    <div class="footer">
      <h3 style="color: ${hotelSettings.primary_color || '#8B4513'};">🙏 Terima Kasih</h3>
      <p>Kami menantikan kedatangan Anda di ${hotelSettings.hotel_name || 'Pomah Guesthouse'}</p>
      <p style="margin-top: 15px; font-size: 12px;">
        📧 ${hotelSettings.email_primary || ''} | 
        📞 ${hotelSettings.phone_primary || ''} | 
        🌐 ${hotelSettings.canonical_url || ''}
      </p>
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