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
  const primaryColor = template?.primary_color || '#333333';
  const secondaryColor = template?.secondary_color || '#666666';
  const textColor = template?.text_color || '#1a1a1a';
  const backgroundColor = template?.background_color || '#ffffff';
  const fontFamily = template?.font_family || 'Arial, sans-serif';
  const fontSizeBase = template?.font_size_base || 11;
  const showLogo = template?.show_logo !== false;
  const showGuestDetails = template?.show_guest_details !== false;
  const showSpecialRequests = template?.show_special_requests !== false;
  const showPaymentInstructions = template?.show_payment_instructions !== false;
  const customFooterText = template?.custom_footer_text || null;
  const paymentTitle = template?.payment_title || 'Instruksi Pembayaran';
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
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
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    body {
      font-family: ${fontFamily};
      font-size: ${fontSizeBase}pt;
      color: ${textColor};
      line-height: 1.6;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .invoice-container {
      max-width: 850px;
      margin: 40px auto;
      background: ${backgroundColor};
      padding: 60px;
    }

    /* Clean Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      max-height: 50px;
      max-width: 100px;
      object-fit: contain;
    }

    .hotel-name {
      font-size: 11pt;
      font-weight: 600;
      color: ${primaryColor};
    }

    .hotel-rating {
      color: #fbbf24;
      font-size: 9pt;
      margin-top: 2px;
    }

    .header-right {
      text-align: right;
    }

    .invoice-title {
      font-size: 36pt;
      font-weight: bold;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 20px;
      letter-spacing: 1px;
    }

    .hotel-address {
      font-size: 10pt;
      color: ${secondaryColor};
      line-height: 1.8;
    }

    .hotel-address div {
      margin: 2px 0;
    }

    /* Info Section */
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e0e0e0;
    }

    .info-block h3 {
      font-size: 11pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 16px;
    }

    .info-block p {
      font-size: 10pt;
      color: ${textColor};
      margin: 6px 0;
      line-height: 1.6;
    }

    .info-block .name {
      font-weight: 600;
      font-size: 11pt;
      color: ${textColor};
    }

    .info-right {
      text-align: right;
    }

    .metadata-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 10pt;
    }

    .metadata-row .label {
      color: ${secondaryColor};
      font-weight: 600;
    }

    .metadata-row .value {
      color: ${textColor};
      font-weight: 400;
    }

    /* Clean Table */
    .table-clean {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .table-clean thead th {
      background: #f5f5f5;
      color: ${primaryColor};
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #e0e0e0;
    }

    .table-clean tbody td {
      padding: 14px 16px;
      border: 1px solid #e0e0e0;
      font-size: 10pt;
      vertical-align: top;
    }

    .table-clean tbody tr {
      background: white;
    }

    .table-clean .align-right {
      text-align: right;
    }

    .table-clean .align-center {
      text-align: center;
    }

    .item-description {
      font-weight: 600;
      color: ${textColor};
      margin-bottom: 4px;
    }

    .item-details {
      font-size: 9pt;
      color: ${secondaryColor};
      line-height: 1.5;
    }

    /* Totals Section */
    .totals-section {
      margin: 30px 0 40px;
      display: flex;
      justify-content: flex-end;
    }

    .totals-box {
      min-width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 11pt;
      color: ${textColor};
    }

    .total-row.subtotal {
      border-top: 1px solid #e0e0e0;
      padding-top: 15px;
    }

    .total-row.grand-total {
      border-top: 2px solid ${primaryColor};
      padding-top: 15px;
      margin-top: 10px;
      font-weight: bold;
      font-size: 13pt;
    }

    .total-row .label {
      color: ${secondaryColor};
    }

    .total-row .amount {
      font-weight: 600;
      color: ${textColor};
    }

    .total-row.grand-total .amount {
      color: ${primaryColor};
    }

    /* Payment Section */
    .payment-section {
      margin: 40px 0;
    }

    .payment-section h3 {
      font-size: 12pt;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 16px;
    }

    .payment-section p {
      font-size: 10pt;
      color: ${textColor};
      line-height: 1.8;
      margin: 6px 0;
    }

    .bank-info {
      margin: 20px 0;
      padding: 16px 0;
    }

    .bank-item {
      margin: 16px 0;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .bank-item:last-child {
      border-bottom: none;
    }

    .bank-name {
      font-weight: bold;
      font-size: 11pt;
      color: ${primaryColor};
      margin-bottom: 6px;
    }

    .bank-details {
      font-size: 10pt;
      color: ${textColor};
      margin: 4px 0;
    }

    /* Special Requests */
    .special-requests {
      background: #fffbf0;
      border: 1px solid #e0e0e0;
      border-left: 3px solid ${primaryColor};
      padding: 16px;
      margin: 30px 0;
    }

    .special-requests h4 {
      font-size: 10pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 8px;
    }

    .special-requests p {
      font-size: 10pt;
      color: ${textColor};
      line-height: 1.6;
    }

    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e0e0e0;
    }

    .footer-content {
      text-align: center;
    }

    .footer h4 {
      font-size: 10pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 10px;
    }

    .footer p {
      font-size: 9pt;
      color: ${secondaryColor};
      line-height: 1.8;
      margin: 6px 0;
    }

    .footer-divider {
      height: 1px;
      background: #e0e0e0;
      margin: 20px 0;
    }

    .page-number {
      text-align: left;
      font-size: 9pt;
      color: ${secondaryColor};
      margin-top: 20px;
    }

    /* Status Badge */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-confirmed {
      background: #d1fae5;
      color: #065f46;
    }

    .status-cancelled {
      background: #fee2e2;
      color: #991b1b;
    }

    /* Print Styles - PDF Optimization */
    @media print {
      @page {
        size: A4;
        margin: 15mm 10mm;
      }
      
      body {
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .invoice-container {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      
      /* Avoid page breaks inside elements */
      .header, .info-section, .totals-section, .payment-section, .footer {
        page-break-inside: avoid;
      }
      
      /* Ensure tables don't break mid-row */
      .table-clean tr {
        page-break-inside: avoid;
      }
      
      /* Force page break before footer if needed */
      .footer {
        page-break-before: auto;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${showLogo && hotelSettings.logo_url ? `
          <img src="${hotelSettings.logo_url}" 
               class="logo" 
               alt="${hotelSettings.hotel_name}"
               crossorigin="anonymous"
               onerror="this.style.display='none'" />
        ` : ''}
        <div>
          <div class="hotel-name">${hotelSettings.hotel_name || 'Pomah Guesthouse'}</div>
          <div class="hotel-rating">★★★★</div>
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-title">INVOICE</div>
        <div class="hotel-address">
          <div><strong>${hotelSettings.hotel_name || 'Pomah Guesthouse'}</strong></div>
          <div>${hotelSettings.address}</div>
          <div>${hotelSettings.city}, ${hotelSettings.postal_code}</div>
          <div>${hotelSettings.country}</div>
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div class="info-section">
      ${showGuestDetails ? `
      <div class="info-block">
        <h3>Ditagih kepada</h3>
        <p class="name">${booking.guest_name}</p>
        <p>${booking.guest_email}</p>
        ${booking.guest_phone ? `<p>${booking.guest_phone}</p>` : ''}
        ${hotelSettings.city ? `<p>${hotelSettings.city}, ${hotelSettings.country}</p>` : ''}
      </div>
      ` : ''}
      <div class="info-block info-right">
        <div class="metadata-row">
          <span class="label">Nomor Invoice:</span>
          <span class="value">${booking.invoice_number}</span>
        </div>
        <div class="metadata-row">
          <span class="label">Tanggal Invoice:</span>
          <span class="value">${formatDate(booking.created_at)}</span>
        </div>
        <div class="metadata-row">
          <span class="label">Tanggal Jatuh Tempo:</span>
          <span class="value">${formatDate(booking.check_in)}</span>
        </div>
      </div>
    </div>

    <!-- Room Details Table -->
    <table class="table-clean">
      <thead>
        <tr>
          <th style="width: 50px;">No.</th>
          <th>Deskripsi</th>
          <th class="align-right" style="width: 120px;">Harga/Malam</th>
          <th class="align-center" style="width: 80px;">Malam</th>
          <th class="align-center" style="width: 80px;">Pajak</th>
          <th class="align-right" style="width: 120px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${bookingRooms && bookingRooms.length > 0 ? bookingRooms.map((br: any, index: number) => {
          const roomSubtotal = br.price_per_night * booking.total_nights;
          const roomTax = hotelSettings.tax_rate ? (roomSubtotal * hotelSettings.tax_rate / 100) : 0;
          const roomTotal = roomSubtotal + roomTax;
          return `
            <tr>
              <td class="align-center">${index + 1}</td>
              <td>
                <div class="item-description">${br.rooms?.name || room.name} #${br.room_number}</div>
                <div class="item-details">
                  Check-in: ${formatDate(booking.check_in)} ${booking.check_in_time || '14:00'}<br>
                  Check-out: ${formatDate(booking.check_out)} ${booking.check_out_time || '12:00'}
                </div>
              </td>
              <td class="align-right">${formatCurrency(br.price_per_night)}</td>
              <td class="align-center">${booking.total_nights}</td>
              <td class="align-center">${hotelSettings.tax_rate || 0}%</td>
              <td class="align-right">${formatCurrency(roomTotal)}</td>
            </tr>
          `;
        }).join('') : `
          <tr>
            <td class="align-center">1</td>
            <td>
              <div class="item-description">${room.name} #${booking.allocated_room_number || 'TBA'}</div>
              <div class="item-details">
                Check-in: ${formatDate(booking.check_in)} ${booking.check_in_time || '14:00'}<br>
                Check-out: ${formatDate(booking.check_out)} ${booking.check_out_time || '12:00'}
              </div>
            </td>
            <td class="align-right">${formatCurrency(booking.total_price / booking.total_nights)}</td>
            <td class="align-center">${booking.total_nights}</td>
            <td class="align-center">${hotelSettings.tax_rate || 0}%</td>
            <td class="align-right">${formatCurrency(total)}</td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- Totals Section -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row subtotal">
          <span class="label">Subtotal:</span>
          <span class="amount">${formatCurrency(subtotal)}</span>
        </div>
        ${taxAmount > 0 ? `
        <div class="total-row">
          <span class="label">${hotelSettings.tax_name || 'Pajak'}:</span>
          <span class="amount">${formatCurrency(taxAmount)}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
          <span class="label">Total:</span>
          <span class="amount">${formatCurrency(total)}</span>
        </div>
        ${amountPaid > 0 ? `
        <div class="total-row">
          <span class="label">Terbayar:</span>
          <span class="amount">${formatCurrency(amountPaid)}</span>
        </div>
        <div class="total-row" style="color: #dc3545;">
          <span class="label">Sisa:</span>
          <span class="amount">${formatCurrency(amountDue)}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Special Requests -->
    ${showSpecialRequests && booking.special_requests ? `
    <div class="special-requests">
      <h4>Permintaan Khusus</h4>
      <p>${booking.special_requests}</p>
    </div>
    ` : ''}

    <!-- Payment Instructions -->
    ${showPaymentInstructions && amountDue > 0 && bankAccounts.length > 0 ? `
    <div class="payment-section">
      <h3>${paymentTitle}</h3>
      <p>Silakan melakukan pembayaran ke</p>
      <p><strong>${hotelSettings.hotel_name}</strong> bank account</p>
      <div class="bank-info">
        ${bankAccounts.map((account: any) => `
          <div class="bank-item">
            <div class="bank-name">${account.bank_name}</div>
            <div class="bank-details">${account.account_number}</div>
            <div class="bank-details">a.n. ${account.account_holder_name}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-content">
        <h4>Syarat dan ketentuan</h4>
        <p>${customFooterText || hotelSettings.invoice_footer_text || 'Terima kasih telah memilih ' + hotelSettings.hotel_name + '. Kami menantikan kedatangan Anda!'}</p>
      </div>
      <div class="footer-divider"></div>
      <div class="page-number">Page 1 of 1</div>
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
