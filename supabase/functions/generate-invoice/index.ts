import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { id as idLocale } from "https://esm.sh/date-fns@3.6.0/locale/id";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, send_email } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generating invoice for booking:", booking_id);

    // Fetch booking data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`*, rooms (*)`)
      .eq("id", booking_id)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error("Booking not found");

    // Fetch booking rooms
    const { data: bookingRooms } = await supabase
      .from("booking_rooms")
      .select(`*, rooms (name)`)
      .eq("booking_id", booking_id);

    // Fetch hotel settings
    const { data: hotelSettings, error: settingsError } = await supabase
      .from("hotel_settings")
      .select("*")
      .single();

    if (settingsError) throw settingsError;

    // Fetch active bank accounts
    const { data: bankAccounts } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    // Fetch booking addons
    const { data: bookingAddons } = await supabase
      .from("booking_addons")
      .select(`*, room_addons (name, icon_name, price_type)`)
      .eq("booking_id", booking_id);

    // Calculations
    const paidAmount = booking.payment_amount || 0;
    const remainingBalance = booking.total_price - paidAmount;
    const isFullyPaid = remainingBalance <= 0;

    // Generate unique code (last 3 digits for payment identification)
    const uniqueCode = Math.floor(Math.random() * 900 + 100);
    const totalWithCode = booking.total_price + uniqueCode;

    // Format dates
    const checkInDate = format(new Date(booking.check_in), "dd-MM-yyyy", { locale: idLocale });
    const createdAtFormatted = format(new Date(booking.created_at), "d MMM yyyy, HH:mm", { locale: idLocale });
    const createdAtDay = format(new Date(booking.created_at), "EEEE", { locale: idLocale });

    const formatRupiah = (amount: number) => amount.toLocaleString('id-ID') + ',-';

    // Payment method
    let paymentMethodLabel = 'Bank Transfer';
    if (booking.bank_code) {
      paymentMethodLabel = `Bank Transfer (${booking.bank_code.toUpperCase()})`;
    }

    // Transaction status
    let transactionStatus = 'Belum Bayar';
    if (isFullyPaid) transactionStatus = 'Lunas';
    else if (paidAmount > 0) transactionStatus = 'DP';

    // Room list
    interface BookingRoomItem { rooms?: { name: string } | null; room_number: string; price_per_night: number }
    interface BankAccountItem { bank_name: string; account_number: string; account_holder_name: string }
    interface BookingAddonItem { room_addons?: { name: string } | null; quantity: number; unit_price: number; total_price: number }

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

    // Build detail rows
    let rowIndex = 0;
    const detailRows = roomListItems.map((room) => {
      rowIndex++;
      const subtotal = room.price_per_night * booking.total_nights;
      // If multiple rooms, show 1 tamu per room unless total guests specified
      const guestsPerRoom = roomListItems.length > 1 ? 1 : booking.num_guests;
      return `
        <tr>
          <td style="text-align:center;border:1px solid #ddd;padding:10px 12px;">${rowIndex}.</td>
          <td style="border:1px solid #ddd;padding:10px 12px;">Akomodasi</td>
          <td style="border:1px solid #ddd;padding:10px 12px;">${hotelSettings.hotel_name || 'Pomah Guesthouse'} ${room.room_name || ''}<br>${guestsPerRoom} Tamu</td>
          <td style="text-align:center;border:1px solid #ddd;padding:10px 12px;">${booking.total_nights}</td>
          <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;">${formatRupiah(room.price_per_night)}</td>
          <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;">${formatRupiah(subtotal)}</td>
        </tr>
      `;
    }).join('');

    const addonRows = bookingAddons && bookingAddons.length > 0
      ? (bookingAddons as BookingAddonItem[]).map((addon) => {
          rowIndex++;
          return `
            <tr>
              <td style="text-align:center;border:1px solid #ddd;padding:10px 12px;">${rowIndex}.</td>
              <td style="border:1px solid #ddd;padding:10px 12px;">Layanan Tambahan</td>
              <td style="border:1px solid #ddd;padding:10px 12px;">${addon.room_addons?.name || 'Add-on'}</td>
              <td style="text-align:center;border:1px solid #ddd;padding:10px 12px;">${addon.quantity}</td>
              <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;">${formatRupiah(addon.unit_price)}</td>
              <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;">${formatRupiah(addon.total_price)}</td>
            </tr>
          `;
        }).join('')
      : '';

    // Tamu list
    const tamuList = [`1. ${booking.guest_name}`];
    if (booking.num_guests > 1) {
      for (let i = 2; i <= booking.num_guests; i++) {
        tamuList.push(`${i}. Tamu ${i}`);
      }
    }

    const primaryColor = '#4a9bd9';
    const secondaryColor = '#e8f4fd';
    const logoUrl = hotelSettings.invoice_logo_url || hotelSettings.logo_url || '';

    // Build invoice HTML matching the reference template
    const invoiceHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${booking.booking_code}</title>
</head>
<body style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f0f0f0;padding:20px;color:#333;font-size:14px;line-height:1.5;margin:0;">
  <div style="max-width:800px;margin:0 auto;background:white;">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:30px 40px 20px;border-left:5px solid ${primaryColor};">
      <div>
        <h1 style="font-size:20px;font-weight:700;color:#222;margin:0 0 4px 0;">BUKTI PEMBELIAN (RECEIPT)</h1>
        <div style="font-size:13px;color:#666;line-height:1.6;">
          Nomor &nbsp;: #${booking.booking_code}<br>
          Tanggal : ${createdAtFormatted} (${createdAtDay})
        </div>
      </div>
      ${logoUrl ? `
        <div style="text-align:right;">
          <img src="${logoUrl}" alt="${hotelSettings.hotel_name} Logo" style="max-height:60px;max-width:150px;object-fit:contain;" crossorigin="anonymous" onerror="this.style.display='none'">
        </div>
      ` : ''}
    </div>

    <!-- Detail Pembayaran -->
    <div style="background:${secondaryColor};padding:8px 40px;font-size:13px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;border-left:5px solid ${primaryColor};">DETAIL PEMBAYARAN</div>
    <div style="display:flex;justify-content:space-between;padding:16px 40px 20px;font-size:13px;color:#444;">
      <div>P.O. NUMBER: ${booking.booking_code}</div>
      <div>PEMBELIAN MELALUI: ${paymentMethodLabel}</div>
      <div>DETAIL TRANSAKSI: <strong>${transactionStatus}</strong></div>
    </div>

    <!-- Data Pemesan -->
    <div style="background:${secondaryColor};padding:8px 40px;font-size:13px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;border-left:5px solid ${primaryColor};">DATA PEMESAN</div>
    <div style="padding:16px 40px 20px;">
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0;">
        Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${booking.guest_name}<br>
        Email &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${booking.guest_email}<br>
        ${booking.guest_phone ? `No. Kontak : ${booking.guest_phone}` : ''}
      </p>
    </div>

    <!-- Tamu -->
    <div style="background:${secondaryColor};padding:8px 40px;font-size:13px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;border-left:5px solid ${primaryColor};">TAMU</div>
    <div style="padding:16px 40px 20px;">
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0;">
        ${tamuList.join('<br>')}
      </p>
    </div>

    <!-- Detail Hotel -->
    <div style="background:${secondaryColor};padding:8px 40px;font-size:13px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;border-left:5px solid ${primaryColor};">DETAIL HOTEL</div>
    <div style="padding:16px 40px 20px;">
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0;">
        <strong>${hotelSettings.hotel_name || 'Pomah Guesthouse'}</strong><br>
        ${hotelSettings.address ? `Alamat: ${hotelSettings.address}${hotelSettings.city ? `, ${hotelSettings.city}` : ''}${hotelSettings.postal_code ? `, ${hotelSettings.postal_code}` : ''}` : ''}<br>
        Check-in: ${checkInDate}<br>
        Durasi: ${booking.total_nights} malam
      </p>
    </div>

    <!-- Detail Pembelian -->
    <div style="background:${secondaryColor};padding:8px 40px;font-size:13px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;border-left:5px solid ${primaryColor};">DETAIL PEMBELIAN</div>
    <div style="padding:16px 40px 20px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr>
            <th style="width:40px;text-align:center;border:1px solid #ddd;padding:10px 12px;font-weight:600;font-size:12px;">No</th>
            <th style="width:120px;text-align:left;border:1px solid #ddd;padding:10px 12px;font-weight:600;font-size:12px;">Jenis Pemesanan</th>
            <th style="text-align:left;border:1px solid #ddd;padding:10px 12px;font-weight:600;font-size:12px;">Deskripsi</th>
            <th style="width:50px;text-align:center;border:1px solid #ddd;padding:10px 12px;font-weight:600;font-size:12px;">Jml.</th>
            <th style="width:120px;text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;font-size:12px;">Harga Satuan (Rp)</th>
            <th style="width:120px;text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;font-size:12px;">Total (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows}
          ${addonRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;"><strong>TOTAL</strong></td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;"><strong>${formatRupiah(booking.total_price)}</strong></td>
          </tr>
          ${!isFullyPaid ? `
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;">KODE UNIK</td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;">${formatRupiah(uniqueCode)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;"><strong>JUMLAH PEMBAYARAN</strong></td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;"><strong>${formatRupiah(totalWithCode)}</strong></td>
          </tr>
          ` : `
          <tr>
            <td colspan="4" style="border:none;"></td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;"><strong>JUMLAH PEMBAYARAN</strong></td>
            <td style="text-align:right;border:1px solid #ddd;padding:10px 12px;font-weight:600;"><strong>${formatRupiah(booking.total_price)}</strong></td>
          </tr>
          `}
        </tfoot>
      </table>
    </div>

    <!-- Paid Stamp -->
    ${isFullyPaid ? `
    <div style="padding:40px 40px 20px;">
      <div style="width:130px;text-align:center;">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:40px;max-width:100px;margin-bottom:4px;" crossorigin="anonymous" onerror="this.style.display='none'">` : ''}
        <div style="background:${primaryColor};color:white;font-size:22px;font-weight:900;padding:6px 24px;border-radius:4px;display:inline-block;letter-spacing:2px;">PAID</div>
        <div style="color:${primaryColor};font-size:11px;font-weight:600;letter-spacing:1px;margin-top:4px;">RECEIPT</div>
      </div>
    </div>
    ` : ''}

    <!-- Payment Instructions if not paid -->
    ${remainingBalance > 0 && bankAccounts && bankAccounts.length > 0 ? `
    <div style="background:${secondaryColor};padding:8px 40px;font-size:13px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;border-left:5px solid ${primaryColor};">INSTRUKSI PEMBAYARAN</div>
    <div style="padding:16px 40px 20px;">
      <p style="font-size:13px;color:#666;margin-bottom:12px;">Silakan transfer sebesar <strong>Rp ${totalWithCode.toLocaleString('id-ID')}</strong> ke rekening berikut:</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${(bankAccounts as BankAccountItem[]).map((bank) => `
          <div style="background:#fff;padding:12px 16px;margin-bottom:8px;border-radius:4px;border:1px solid #e0e0e0;">
            <strong>${bank.bank_name}</strong><br>
            No. Rek: <strong>${bank.account_number}</strong><br>
            a.n. ${bank.account_holder_name}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="text-align:center;padding:30px 40px 15px;font-size:13px;color:#666;">
      Untuk pertanyaan apa pun, kunjungi ${hotelSettings.hotel_name || 'Pomah Guesthouse'} Help Center: ${hotelSettings.phone_primary || ''}
    </div>
    <div style="background:${primaryColor};color:white;text-align:center;padding:12px 40px;font-size:12px;">
      Syarat dan Ketentuan berlaku. ${hotelSettings.email_primary ? `Silakan lihat ${hotelSettings.email_primary}` : ''}
    </div>
  </div>
</body>
</html>
    `;

    // Send email if requested via transactional email queue
    let emailSent = false;
    if (send_email && booking.guest_email) {
      try {
        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          email_payload: {
            to: booking.guest_email,
            subject: `Invoice #${booking.booking_code} - ${hotelSettings.hotel_name || 'Pomah Guesthouse'}`,
            html: invoiceHtml,
            from_name: hotelSettings.hotel_name || 'Pomah Guesthouse',
          }
        });

        if (enqueueError) {
          console.error("Failed to enqueue invoice email:", enqueueError);
        } else {
          emailSent = true;
          console.log("Invoice email enqueued successfully for:", booking.guest_email);
        }
      } catch (emailError) {
        console.error("Email enqueue error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice_html: invoiceHtml,
        email_sent: emailSent,
        guest_email: booking.guest_email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate invoice error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
