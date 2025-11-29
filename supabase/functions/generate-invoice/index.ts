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
  bookingRooms: any[];
}

function generateInvoiceHTML(data: InvoiceData, template: any = null): string {
  const { booking, room, hotelSettings, bankAccounts, bookingRooms } = data;
  
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
  const logoSize = template?.logo_size || 'medium';
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
      position: relative;
    }
    
    /* Logo Styles */
    .logo-image {
      max-width: 200px;
      object-fit: contain;
      margin-bottom: 10px;
      display: block;
    }
    
    .logo-image.small { max-height: 50px; }
    .logo-image.medium { max-height: 70px; }
    .logo-image.large { max-height: 100px; }
    
    /* Header Styles */
    .header {
      display: table;
      width: 100%;
      margin-bottom: 30px;
      padding-bottom: 20px;
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
    
    .hotel-name {
      font-size: ${fontSizeHeading}pt;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 5px;
    }
    
    .tagline {
      color: #666;
      font-size: 10pt;
      margin-top: 3px;
      font-style: italic;
    }
    
    /* Invoice Badge */
    .invoice-badge {
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      text-align: center;
      display: inline-block;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .invoice-badge .label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.9;
      display: block;
    }
    
    .invoice-badge .number {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 4px;
      display: block;
    }
    
    .invoice-date {
      color: #666;
      font-size: 10pt;
      margin-top: 10px;
    }
    /* Sections */
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 15px;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-icon {
      font-size: 16pt;
    }
    
    /* Info Cards */
    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 30px;
      border-spacing: 15px 0;
    }
    
    .info-card {
      display: table-cell;
      width: 50%;
      padding: 20px;
      background: linear-gradient(135deg, ${accentColor}, #ffffff);
      border: 2px solid ${primaryColor}20;
      border-radius: 8px;
      vertical-align: top;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .info-card .card-icon {
      font-size: 24pt;
      margin-bottom: 10px;
    }
    
    .info-card h3 {
      font-size: 11pt;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-card .name {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 5px;
    }
    /* Modern Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      page-break-inside: avoid;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    thead {
      display: table-header-group;
    }
    
    tbody {
      display: table-row-group;
    }
    
    th {
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}) !important;
      color: white !important;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 10pt;
    }
    
    tbody tr:nth-child(even) {
      background: ${accentColor}50;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    tbody tr:hover {
      background: ${accentColor};
    }
    
    tr {
      page-break-inside: avoid;
    }
    
    .room-number {
      font-weight: bold;
      color: ${primaryColor};
      font-size: 11pt;
    }
    .text-right {
      text-align: right;
    }
    
    /* Payment Summary */
    .payment-summary {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 12px;
      padding: 24px;
      border: 2px solid ${primaryColor}20;
      margin-top: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .totals {
      margin-left: auto;
      width: 100%;
      page-break-inside: avoid;
    }
    
    .total-row {
      display: table;
      width: 100%;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .total-row > span:first-child {
      display: table-cell;
      text-align: left;
      font-size: 11pt;
    }
    
    .total-row > span:last-child {
      display: table-cell;
      text-align: right;
      font-size: 11pt;
      font-weight: 600;
    }
    
    .total-row.grand-total {
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      color: white !important;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 15px;
      border: none;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .total-row.grand-total > span {
      font-size: 16pt;
      font-weight: bold;
      color: white !important;
    }
    /* Status Badges */
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .status-pending {
      background: linear-gradient(135deg, #f59e0b, #d97706) !important;
      color: white !important;
    }
    
    .status-confirmed {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      color: white !important;
    }
    
    .status-paid {
      background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
      color: white !important;
    }
    /* Payment Instructions */
    .payment-instructions {
      background: linear-gradient(135deg, ${accentColor}, #ffffff);
      padding: 20px;
      border: 2px solid ${primaryColor};
      border-left: 6px solid ${primaryColor};
      border-radius: 8px;
      margin-top: 25px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .bank-option {
      margin-bottom: 15px;
      padding: 15px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .bank-option-title {
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 10px;
      font-size: 11pt;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 3px solid ${primaryColor};
      text-align: center;
      color: #666;
      font-size: 10pt;
      page-break-inside: avoid;
    }
    
    .footer-logo {
      margin-bottom: 15px;
    }
    
    .footer-logo img {
      max-height: 40px;
      opacity: 0.7;
    }
    
    .contact-icons {
      margin-top: 10px;
      font-size: 9pt;
      color: #666;
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
        ${showLogo && hotelSettings.logo_url ? `
          <img src="${hotelSettings.logo_url}" 
               class="logo-image ${logoSize}" 
               alt="${hotelSettings.hotel_name}" 
               onerror="this.style.display='none'" />
        ` : ''}
        <div class="hotel-name">${hotelSettings.hotel_name || 'Pomah Guesthouse'}</div>
        ${hotelSettings.tagline ? `<div class="tagline">${hotelSettings.tagline}</div>` : ''}
      </div>
      <div class="header-right">
        <div class="invoice-badge">
          <span class="label">Invoice</span>
          <span class="number">${booking.invoice_number}</span>
        </div>
        <div class="invoice-date">${formatDate(booking.created_at)}</div>
      </div>
    </div>

    ${showGuestDetails || showHotelDetails ? `<div class="info-grid">` : ''}
      ${showGuestDetails ? `
      <div class="info-card">
        <div class="card-icon">👤</div>
        <h3>Detail Tamu</h3>
        <div class="name">${booking.guest_name}</div>
        <div>${booking.guest_email}</div>
        ${booking.guest_phone ? `<div>${booking.guest_phone}</div>` : ''}
      </div>
      ` : ''}
      ${showHotelDetails ? `
      <div class="info-card">
        <div class="card-icon">🏨</div>
        <h3>Detail Hotel</h3>
        <div class="name">${hotelSettings.hotel_name}</div>
        <div>${hotelSettings.address}</div>
        <div>${hotelSettings.city}, ${hotelSettings.country}</div>
        <div>${hotelSettings.phone_primary}</div>
      </div>
      ` : ''}
    ${showGuestDetails || showHotelDetails ? `</div>` : ''}

    <div class="section">
      <div class="section-title">
        <span class="section-icon">📅</span>
        Detail Booking
      </div>
      <table>
        <thead>
          <tr>
            <th>Kode Booking</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th class="text-right">Malam</th>
            <th class="text-right">Tamu</th>
            <th class="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${booking.booking_code}</strong></td>
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
      <div class="section-title">
        <span class="section-icon">🛏️</span>
        Detail Kamar
      </div>
      <table>
        <thead>
          <tr>
            <th>Tipe Kamar</th>
            <th>No. Kamar</th>
            <th class="text-right">Malam</th>
            <th class="text-right">Harga/Malam</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${bookingRooms && bookingRooms.length > 0 ? bookingRooms.map((br: any) => `
            <tr>
              <td><strong>${br.rooms?.name || room.name}</strong></td>
              <td><span class="room-number">#${br.room_number}</span></td>
              <td class="text-right">${booking.total_nights}</td>
              <td class="text-right">${formatCurrency(br.price_per_night)}</td>
              <td class="text-right">${formatCurrency(br.price_per_night * booking.total_nights)}</td>
            </tr>
          `).join('') : `
            <tr>
              <td><strong>${room.name}</strong></td>
              <td><span class="room-number">#${booking.allocated_room_number || 'TBA'}</span></td>
              <td class="text-right">${booking.total_nights}</td>
              <td class="text-right">${formatCurrency(booking.total_price / booking.total_nights)}</td>
              <td class="text-right">${formatCurrency(subtotal)}</td>
            </tr>
          `}
        </tbody>
      </table>

      <div class="payment-summary">
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
    </div>

    ${showPaymentInstructions && amountDue > 0 && (bankAccounts.length > 0 || hotelSettings.payment_instructions) ? `
    <div class="payment-instructions">
      <div class="section-title">
        <span class="section-icon">💳</span>
        ${paymentTitle}
      </div>
      ${bankAccounts.length > 0 ? `
        <p style="margin-bottom: 15px; font-weight: 600;">Silakan transfer ke salah satu rekening berikut:</p>
        ${bankAccounts.map((account: any, index: number) => `
          <div class="bank-option">
            <div class="bank-option-title">Opsi ${index + 1}</div>
            <table style="width: 100%; border: none; box-shadow: none;">
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
      ${hotelSettings.logo_url ? `
      <div class="footer-logo">
        <img src="${hotelSettings.logo_url}" alt="${hotelSettings.hotel_name}" />
      </div>
      ` : ''}
      <div><strong>${customFooterText || hotelSettings.invoice_footer_text || 'Terima kasih telah memilih ' + hotelSettings.hotel_name + '!'}</strong></div>
      <div class="contact-icons">
        📧 ${hotelSettings.email_primary} • 📞 ${hotelSettings.phone_primary}
        ${hotelSettings.whatsapp_number ? ` • 💬 ${hotelSettings.whatsapp_number}` : ''}
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

    // Fetch booking with room details and booking_rooms
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, rooms(*), booking_rooms(*, rooms(*))')
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
      bankAccounts: bankAccounts || [],
      bookingRooms: booking.booking_rooms || []
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