import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  booking: any;
  room: any;
  hotelSettings: any;
}

function generateInvoiceHTML(data: InvoiceData): string {
  const { booking, room, hotelSettings } = data;
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: hotelSettings.currency_code || 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const subtotal = booking.total_price;
  const taxAmount = hotelSettings.tax_rate ? (subtotal * hotelSettings.tax_rate / 100) : 0;
  const total = subtotal + taxAmount;
  const amountPaid = booking.payment_amount || 0;
  const amountDue = total - amountPaid;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${booking.invoice_number}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .invoice-container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #8B4513;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #8B4513;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-number {
      font-size: 24px;
      font-weight: bold;
      color: #8B4513;
      margin-bottom: 5px;
    }
    .invoice-date {
      color: #666;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #8B4513;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .info-box {
      padding: 15px;
      background: #f9f9f9;
      border-radius: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #8B4513;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .total-row.grand-total {
      font-size: 18px;
      font-weight: bold;
      color: #8B4513;
      border-top: 2px solid #8B4513;
      border-bottom: 2px solid #8B4513;
      padding: 12px 0;
      margin-top: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-pending {
      background: #FFF3CD;
      color: #856404;
    }
    .status-confirmed {
      background: #D4EDDA;
      color: #155724;
    }
    .status-paid {
      background: #D1ECF1;
      color: #0C5460;
    }
    .payment-instructions {
      background: #f0f8ff;
      padding: 20px;
      border-radius: 5px;
      border-left: 4px solid #8B4513;
      margin-top: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .contact-info {
      margin-top: 10px;
    }
    @media print {
      body {
        background: white;
      }
      .invoice-container {
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        <div class="logo">${hotelSettings.hotel_name || 'Pomah Guesthouse'}</div>
        <div style="color: #666; margin-top: 5px;">${hotelSettings.tagline || ''}</div>
      </div>
      <div class="invoice-info">
        <div class="invoice-number">${booking.invoice_number}</div>
        <div class="invoice-date">Tanggal: ${formatDate(booking.created_at)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="section-title">Detail Tamu</div>
        <div><strong>${booking.guest_name}</strong></div>
        <div>${booking.guest_email}</div>
        ${booking.guest_phone ? `<div>${booking.guest_phone}</div>` : ''}
      </div>
      <div class="info-box">
        <div class="section-title">Detail Hotel</div>
        <div><strong>${hotelSettings.hotel_name}</strong></div>
        <div>${hotelSettings.address}</div>
        <div>${hotelSettings.city}, ${hotelSettings.country}</div>
        <div>${hotelSettings.phone_primary}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Detail Booking</div>
      <table>
        <thead>
          <tr>
            <th>Tipe Kamar</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th class="text-right">Malam</th>
            <th class="text-right">Tamu</th>
            <th class="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${room.name}</strong></td>
            <td>${formatDate(booking.check_in)}<br><small>${booking.check_in_time || '14:00'}</small></td>
            <td>${formatDate(booking.check_out)}<br><small>${booking.check_out_time || '12:00'}</small></td>
            <td class="text-right">${booking.total_nights}</td>
            <td class="text-right">${booking.num_guests}</td>
            <td class="text-right">
              <span class="status-badge status-${booking.status}">${booking.status}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    ${booking.special_requests ? `
    <div class="section">
      <div class="section-title">Permintaan Khusus</div>
      <div class="info-box">${booking.special_requests}</div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Rincian Pembayaran</div>
      <table>
        <thead>
          <tr>
            <th>Deskripsi</th>
            <th class="text-right">Jumlah</th>
            <th class="text-right">Harga</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${room.name}</td>
            <td class="text-right">${booking.total_nights} malam</td>
            <td class="text-right">${formatCurrency(booking.total_price / booking.total_nights)}</td>
            <td class="text-right">${formatCurrency(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${taxAmount > 0 ? `
        <div class="total-row">
          <span>${hotelSettings.tax_name || 'Pajak'} (${hotelSettings.tax_rate}%):</span>
          <span>${formatCurrency(taxAmount)}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>Total:</span>
          <span>${formatCurrency(total)}</span>
        </div>
        ${amountPaid > 0 ? `
        <div class="total-row">
          <span>Terbayar:</span>
          <span>${formatCurrency(amountPaid)}</span>
        </div>
        <div class="total-row" style="color: #dc3545; font-weight: bold;">
          <span>Sisa:</span>
          <span>${formatCurrency(amountDue)}</span>
        </div>
        ` : ''}
      </div>
    </div>

    ${amountDue > 0 && hotelSettings.payment_instructions ? `
    <div class="payment-instructions">
      <div class="section-title">Instruksi Pembayaran</div>
      <div>${hotelSettings.payment_instructions}</div>
    </div>
    ` : ''}

    <div class="footer">
      <div>${hotelSettings.invoice_footer_text || 'Terima kasih telah memilih Pomah Guesthouse!'}</div>
      <div class="contact-info">
        <div>📧 ${hotelSettings.email_primary} | 📞 ${hotelSettings.phone_primary}</div>
        ${hotelSettings.whatsapp_number ? `<div>💬 WhatsApp: ${hotelSettings.whatsapp_number}</div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();
    
    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch booking with room details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, rooms(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Fetch hotel settings
    const { data: hotelSettings, error: settingsError } = await supabase
      .from('hotel_settings')
      .select('*')
      .single();

    if (settingsError) {
      throw new Error(`Failed to fetch hotel settings: ${settingsError.message}`);
    }

    // Generate invoice number if not exists
    let invoiceNumber = booking.invoice_number;
    if (!invoiceNumber) {
      const { data: newInvoiceNumber, error: invoiceError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceError) {
        throw new Error(`Failed to generate invoice number: ${invoiceError.message}`);
      }

      invoiceNumber = newInvoiceNumber;

      // Update booking with invoice number
      await supabase
        .from('bookings')
        .update({ invoice_number: invoiceNumber })
        .eq('id', bookingId);
    }

    // Generate HTML
    const html = generateInvoiceHTML({
      booking: { ...booking, invoice_number: invoiceNumber },
      room: booking.rooms,
      hotelSettings
    });

    console.log(`Invoice generated: ${invoiceNumber} for booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        html,
        invoiceNumber,
        bookingId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});