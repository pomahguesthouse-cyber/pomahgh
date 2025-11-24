import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  booking: any;
  room: any;
  hotelSettings: any;
  bankAccounts: any[];
}

function generateInvoiceHTML(data: InvoiceData, template: any = null): string {
  const { booking, room, hotelSettings, bankAccounts } = data;
  
  // Use template settings or defaults
  const primaryColor = template?.primary_color || '#8B4513';
  const secondaryColor = template?.secondary_color || '#D2691E';
  const textColor = template?.text_color || '#1a1a1a';
  const backgroundColor = template?.background_color || '#ffffff';
  const accentColor = template?.accent_color || '#f0f8ff';
  const fontFamily = template?.font_family || 'Arial';
  const fontSizeBase = template?.font_size_base || 12;
  const fontSizeHeading = template?.font_size_heading || 24;
  const showLogo = template?.show_logo !== false;
  const showGuestDetails = template?.show_guest_details !== false;
  const showHotelDetails = template?.show_hotel_details !== false;
  const showSpecialRequests = template?.show_special_requests !== false;
  const showPaymentInstructions = template?.show_payment_instructions !== false;
  const customHeaderText = template?.custom_header_text || null;
  const customFooterText = template?.custom_footer_text || null;
  const paymentTitle = template?.payment_title || 'Instruksi Pembayaran';
  const layoutStyle = template?.layout_style || 'modern';
  const borderStyle = template?.border_style || 'solid';
  const spacing = template?.spacing || 'normal';
  
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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: '${fontFamily}', 'Helvetica', sans-serif;
      line-height: 1.6;
      color: ${textColor};
      max-width: 800px;
      margin: 0 auto;
      padding: ${spacing === 'compact' ? '10px' : spacing === 'spacious' ? '30px' : '20px'};
      background-color: ${backgroundColor};
      font-size: ${fontSizeBase}pt;
    }
    
    .invoice-container {
      background: white;
      padding: 40px;
      border: ${borderStyle === 'none' ? 'none' : borderStyle === 'dashed' ? '1px dashed #e0e0e0' : '1px solid #e0e0e0'};
    }
    .header {
      display: table;
      width: 100%;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid ${primaryColor};
    }
    
    .header-left {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    
    .header-right {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      text-align: right;
    }
    
    .logo {
      font-size: ${fontSizeHeading}pt;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 5px;
    }
    
    .tagline {
      color: #666;
      font-size: 10pt;
      margin-top: 3px;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-number {
      font-size: ${fontSizeHeading * 0.8}pt;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 5px;
    }
    
    .invoice-date {
      color: #666;
      font-size: 10pt;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 25px;
    }
    
    .info-box {
      display: table-cell;
      width: 50%;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      vertical-align: top;
    }
    
    .info-box:first-child {
      border-right: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    thead {
      display: table-header-group;
    }
    
    tbody {
      display: table-row-group;
    }
    
    th {
      background: ${primaryColor} !important;
      color: white !important;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
      font-size: 10pt;
    }
    
    tr {
      page-break-inside: avoid;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 320px;
      page-break-inside: avoid;
    }
    
    .total-row {
      display: table;
      width: 100%;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .total-row > span:first-child {
      display: table-cell;
      text-align: left;
      font-size: 10pt;
    }
    
    .total-row > span:last-child {
      display: table-cell;
      text-align: right;
      font-size: 10pt;
    }
    
    .total-row.grand-total {
      font-size: 14pt;
      font-weight: bold;
      color: ${primaryColor};
      border-top: 3px solid ${primaryColor};
      border-bottom: 3px solid ${primaryColor};
      padding: 12px 0;
      margin-top: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 3px;
      font-size: 9pt;
      font-weight: bold;
      text-transform: uppercase;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .status-pending {
      background: #FFF3CD !important;
      color: #856404 !important;
      border: 1px solid #ffeaa7;
    }
    
    .status-confirmed {
      background: #D4EDDA !important;
      color: #155724 !important;
      border: 1px solid #c3e6cb;
    }
    
    .status-paid {
      background: #D1ECF1 !important;
      color: #0C5460 !important;
      border: 1px solid #bee5eb;
    }
    .payment-instructions {
      background: ${accentColor};
      padding: 15px;
      border: 1px solid ${primaryColor};
      border-left: 4px solid ${primaryColor};
      margin-top: 25px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    
    .contact-info {
      margin-top: 10px;
      font-size: 9pt;
    }
    
    /* Print Styles */
    @media print {
      @page {
        size: A4;
        margin: 1.5cm;
      }
      
      body {
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        font-size: 10pt;
      }
      
      .invoice-container {
        box-shadow: none !important;
        padding: 0 !important;
        border: none !important;
        page-break-after: avoid;
      }
      
      .header {
        page-break-after: avoid;
      }
      
      table {
        page-break-inside: avoid;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      /* Force print colors */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Hide elements that shouldn't print */
      button, .no-print {
        display: none !important;
      }
    }
    
    /* PDF Generation Compatibility */
    .pdf-friendly {
      background: white;
      color: black;
    }
  </style>
</head>
<body>
  <div class="invoice-container pdf-friendly">
    ${customHeaderText ? `<div style="background: ${accentColor}; padding: 15px; margin-bottom: 20px; border-left: 4px solid ${primaryColor}; font-weight: 600;">${customHeaderText}</div>` : ''}
    
    <div class="header">
      <div class="header-left">
        ${showLogo ? `<div class="logo">${hotelSettings.hotel_name || 'Pomah Guesthouse'}</div>` : ''}
        <div class="tagline">${hotelSettings.tagline || ''}</div>
      </div>
      <div class="header-right">
        <div class="invoice-number">${booking.invoice_number}</div>
        <div class="invoice-date">Tanggal: ${formatDate(booking.created_at)}</div>
      </div>
    </div>

    ${showGuestDetails || showHotelDetails ? `<div class="info-grid">` : ''}
      ${showGuestDetails ? `
      <div class="info-box">
        <div class="section-title">Detail Tamu</div>
        <div><strong>${booking.guest_name}</strong></div>
        <div>${booking.guest_email}</div>
        ${booking.guest_phone ? `<div>${booking.guest_phone}</div>` : ''}
      </div>
      ` : ''}
      ${showHotelDetails ? `
      <div class="info-box">
        <div class="section-title">Detail Hotel</div>
        <div><strong>${hotelSettings.hotel_name}</strong></div>
        <div>${hotelSettings.address}</div>
        <div>${hotelSettings.city}, ${hotelSettings.country}</div>
        <div>${hotelSettings.phone_primary}</div>
      </div>
      ` : ''}
    ${showGuestDetails || showHotelDetails ? `</div>` : ''}

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

    ${showSpecialRequests && booking.special_requests ? `
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

    ${showPaymentInstructions && amountDue > 0 && (bankAccounts.length > 0 || hotelSettings.payment_instructions) ? `
    <div class="payment-instructions">
      <div class="section-title">${paymentTitle}</div>
      ${bankAccounts.length > 0 ? `
        <p style="margin-bottom: 15px; font-weight: 600;">Silakan transfer ke salah satu rekening berikut:</p>
        ${bankAccounts.map((account: any, index: number) => `
          <div style="margin-bottom: 20px; padding: 15px; background: white; border: 1px solid #e0e0e0; border-radius: 5px;">
            <p style="font-weight: bold; color: ${primaryColor}; margin-bottom: 10px; font-size: 11pt;">Opsi ${index + 1}</p>
            <table style="width: 100%; border: none;">
              <tr style="border: none;">
                <td style="border: none; padding: 5px 0; width: 150px;"><strong>Nama Bank:</strong></td>
                <td style="border: none; padding: 5px 0;">${account.bank_name}</td>
              </tr>
              <tr style="border: none;">
                <td style="border: none; padding: 5px 0;"><strong>Nomor Rekening:</strong></td>
                <td style="border: none; padding: 5px 0; font-weight: 600; font-size: 11pt;">${account.account_number}</td>
              </tr>
              <tr style="border: none;">
                <td style="border: none; padding: 5px 0;"><strong>Atas Nama:</strong></td>
                <td style="border: none; padding: 5px 0;">${account.account_holder_name}</td>
              </tr>
            </table>
          </div>
        `).join('')}
      ` : ''}
      ${hotelSettings.payment_instructions ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">${hotelSettings.payment_instructions}</div>` : ''}
    </div>
    ` : ''}

    <div class="footer">
      <div>${customFooterText || hotelSettings.invoice_footer_text || 'Terima kasih telah memilih Pomah Guesthouse!'}</div>
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

    // Fetch invoice template
    const { data: template } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    console.log('Invoice template:', template ? 'Found' : 'Not found, using defaults');

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

    // Fetch active bank accounts
    const { data: bankAccounts, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (bankError) {
      console.error('Failed to fetch bank accounts:', bankError);
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

    // Generate HTML with template
    const html = generateInvoiceHTML({
      booking: { ...booking, invoice_number: invoiceNumber },
      room: booking.rooms,
      hotelSettings,
      bankAccounts: bankAccounts || []
    }, template);

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