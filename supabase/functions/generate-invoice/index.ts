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
    :root {
      --primary: ${primaryColor};
      --primary-light: ${primaryColor}15;
      --primary-dark: ${primaryColor}dd;
      --secondary: ${secondaryColor};
      --accent: #10b981;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: ${textColor};
      --bg: ${backgroundColor};
      --border: #e5e7eb;
    }

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
      color: var(--text);
      line-height: 1.6;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .invoice-container {
      max-width: 850px;
      margin: 0 auto;
      padding: 40px;
      background: var(--bg);
    }

    /* Professional Header */
    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid var(--primary);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo {
      max-height: 60px;
      max-width: 120px;
      object-fit: contain;
    }

    .hotel-info h1 {
      font-size: 14pt;
      color: var(--primary);
      margin-bottom: 4px;
      font-weight: 700;
    }

    .hotel-info .rating {
      color: #fbbf24;
      font-size: 12pt;
      letter-spacing: 2px;
    }

    .hotel-info .tagline {
      font-size: ${fontSizeBase - 1}pt;
      color: var(--text);
      opacity: 0.7;
      font-style: italic;
      margin-top: 4px;
    }

    .invoice-title-section {
      text-align: right;
    }

    .invoice-title-section h2 {
      font-size: 24pt;
      color: var(--primary);
      margin-bottom: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .invoice-number {
      font-size: ${fontSizeBase + 1}pt;
      font-weight: 600;
      color: white;
      padding: 8px 16px;
      background: var(--primary);
      border-radius: 6px;
      display: inline-block;
    }

    .hotel-address {
      font-size: ${fontSizeBase - 1}pt;
      color: var(--secondary);
      margin-top: 15px;
      line-height: 1.8;
    }

    .hotel-address span {
      margin: 0 8px;
      color: var(--border);
    }

    /* Info Cards - Two Column */
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0 40px 0;
    }

    .info-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid var(--primary);
    }

    .info-card h3 {
      font-size: 11pt;
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-card p {
      font-size: 10pt;
      color: var(--text);
      margin: 8px 0;
      line-height: 1.6;
    }

    .info-card .name {
      font-weight: 600;
      font-size: 11pt;
    }

    .info-card .metadata-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed var(--border);
      font-size: 10pt;
    }

    .info-card .metadata-row:last-child {
      border-bottom: none;
    }

    .info-card .label {
      color: var(--secondary);
      font-weight: 500;
    }

    .info-card .value {
      color: var(--text);
      font-weight: 600;
    }

    /* Status Badge */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }

    /* Modern Table */
    .table-modern {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 30px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .table-modern thead th {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid var(--primary-dark);
    }

    .table-modern tbody td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 10pt;
      vertical-align: top;
    }

    .table-modern tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    .table-modern tbody tr:nth-child(odd) {
      background: white;
    }

    .table-modern tbody tr:last-child td {
      border-bottom: none;
    }

    .table-modern .align-right {
      text-align: right;
    }

    .table-modern .align-center {
      text-align: center;
    }

    .item-description {
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
      font-size: 11pt;
    }

    .item-details {
      font-size: 9pt;
      color: var(--secondary);
      line-height: 1.5;
    }

    /* Totals Box - Prominent */
    .totals-section {
      margin: 30px 0 40px;
      display: flex;
      justify-content: flex-end;
    }

    .totals-box {
      min-width: 350px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid var(--border);
    }

    .totals-box h3 {
      font-size: 12pt;
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 16px;
      text-align: center;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 11pt;
      border-bottom: 1px dashed var(--border);
    }

    .total-row:last-child {
      border-bottom: none;
    }

    .total-row .label {
      color: var(--secondary);
      font-weight: 500;
    }

    .total-row .amount {
      font-weight: 600;
      color: var(--text);
    }

    .grand-total {
      background: var(--primary);
      color: white !important;
      padding: 16px;
      border-radius: 8px;
      margin-top: 12px;
      border: none !important;
    }

    .grand-total .label,
    .grand-total .amount {
      color: white !important;
      font-size: 14pt;
      font-weight: 700;
    }

    .payment-status {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px dashed var(--border);
    }

    .payment-status .total-row .amount {
      font-weight: 700;
    }

    /* Payment Cards */
    .payment-section {
      margin: 40px 0;
      background: #f8f9fa;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid var(--border);
    }

    .payment-section h3 {
      font-size: 12pt;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .payment-section > p {
      font-size: 10pt;
      color: var(--text);
      margin-bottom: 20px;
    }

    .bank-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }

    .bank-card {
      background: white;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .bank-card .bank-icon {
      font-size: 16pt;
      margin-bottom: 8px;
    }

    .bank-card .bank-name {
      font-weight: 700;
      font-size: 11pt;
      color: var(--primary);
      margin-bottom: 8px;
    }

    .bank-card .bank-details {
      font-size: 10pt;
      color: var(--text);
      margin: 4px 0;
      font-family: 'Courier New', monospace;
      font-weight: 500;
    }

    .payment-warning {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
      font-size: 10pt;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Special Requests */
    .special-requests {
      background: #fffbf0;
      border: 1px solid var(--border);
      border-left: 4px solid var(--warning);
      border-radius: 6px;
      padding: 16px;
      margin: 30px 0;
    }

    .special-requests h4 {
      font-size: 10pt;
      font-weight: 600;
      color: var(--warning);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .special-requests p {
      font-size: 10pt;
      color: var(--text);
      line-height: 1.6;
    }

    /* Branded Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid var(--border);
    }

    .footer-thank-you {
      text-align: center;
      margin-bottom: 20px;
    }

    .footer-thank-you h4 {
      font-size: 13pt;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 8px;
    }

    .footer-thank-you p {
      font-size: 10pt;
      color: var(--text);
      line-height: 1.6;
    }

    .footer-contact {
      text-align: center;
      font-size: 10pt;
      color: var(--secondary);
      margin: 20px 0;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .footer-contact span {
      margin: 0 12px;
      color: var(--border);
    }

    .footer-divider {
      height: 1px;
      background: var(--border);
      margin: 20px 0;
    }

    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: var(--secondary);
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
      .table-modern tr {
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
    <!-- Professional Header -->
    <div class="header">
      <div class="header-top">
        <div class="logo-section">
          ${showLogo && hotelSettings.logo_url ? `
            <img src="${hotelSettings.logo_url}" 
                 class="logo" 
                 alt="${hotelSettings.hotel_name}"
                 crossorigin="anonymous"
                 onerror="this.style.display='none'" />
          ` : ''}
          <div class="hotel-info">
            <h1>${hotelSettings.hotel_name || 'Pomah Guesthouse'}</h1>
            <div class="rating">★★★★★</div>
            ${hotelSettings.tagline ? `<div class="tagline">${hotelSettings.tagline}</div>` : ''}
          </div>
        </div>
        <div class="invoice-title-section">
          <h2>INVOICE</h2>
          <div class="invoice-number">#${booking.invoice_number}</div>
        </div>
      </div>
      <div class="hotel-address">
        📍 ${hotelSettings.address}, ${hotelSettings.city} ${hotelSettings.postal_code}, ${hotelSettings.country}
        <span>|</span>
        📧 ${hotelSettings.email_primary || 'info@hotel.com'}
        <span>|</span>
        📞 ${hotelSettings.phone_primary || '-'}
      </div>
    </div>

    <!-- Info Cards - Two Column -->
    <div class="info-section">
      ${showGuestDetails ? `
      <div class="info-card">
        <h3>👤 DITAGIH KEPADA</h3>
        <p class="name">${booking.guest_name}</p>
        <p>${booking.guest_email}</p>
        ${booking.guest_phone ? `<p>${booking.guest_phone}</p>` : ''}
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
          <p>🔑 Check-in: ${formatDate(booking.check_in)} ${booking.check_in_time || '14:00'}</p>
          <p>🔑 Check-out: ${formatDate(booking.check_out)} ${booking.check_out_time || '12:00'}</p>
        </div>
      </div>
      ` : ''}
      <div class="info-card">
        <h3>📋 DETAIL INVOICE</h3>
        <div class="metadata-row">
          <span class="label">Tanggal:</span>
          <span class="value">${formatDate(booking.created_at)}</span>
        </div>
        <div class="metadata-row">
          <span class="label">Jatuh Tempo:</span>
          <span class="value">${formatDate(booking.check_in)}</span>
        </div>
        <div class="metadata-row">
          <span class="label">Status:</span>
          <span class="value">
            <span class="badge badge-${booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'warning'}">
              ${booking.status === 'confirmed' ? '✓ Confirmed' : booking.status === 'cancelled' ? '✗ Cancelled' : '⏳ Pending'}
            </span>
          </span>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
          <div class="metadata-row">
            <span class="label">Total Malam:</span>
            <span class="value">${booking.total_nights} malam</span>
          </div>
          <div class="metadata-row">
            <span class="label">Jumlah Tamu:</span>
            <span class="value">${booking.num_guests} orang</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modern Table -->
    <table class="table-modern">
      <thead>
        <tr>
          <th style="width: 50px;">NO</th>
          <th>DESKRIPSI</th>
          <th class="align-right" style="width: 120px;">HARGA/MALAM</th>
          <th class="align-center" style="width: 80px;">MALAM</th>
          <th class="align-center" style="width: 80px;">PAJAK</th>
          <th class="align-right" style="width: 120px;">TOTAL</th>
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

    <!-- Totals Box - Prominent -->
    <div class="totals-section">
      <div class="totals-box">
        <h3>💰 RINGKASAN</h3>
        <div class="total-row">
          <span class="label">Subtotal:</span>
          <span class="amount">${formatCurrency(subtotal)}</span>
        </div>
        ${taxAmount > 0 ? `
        <div class="total-row">
          <span class="label">${hotelSettings.tax_name || 'Pajak'} (${hotelSettings.tax_rate}%):</span>
          <span class="amount">${formatCurrency(taxAmount)}</span>
        </div>
        ` : ''}
        <div class="grand-total">
          <div class="total-row">
            <span class="label">TOTAL</span>
            <span class="amount">${formatCurrency(total)}</span>
          </div>
        </div>
        ${amountPaid > 0 || amountDue > 0 ? `
        <div class="payment-status">
          ${amountPaid > 0 ? `
          <div class="total-row">
            <span class="label">Terbayar:</span>
            <span class="amount" style="color: var(--success);">${formatCurrency(amountPaid)}</span>
          </div>
          ` : ''}
          ${amountDue > 0 ? `
          <div class="total-row">
            <span class="label">Sisa Pembayaran:</span>
            <span class="amount" style="color: var(--danger);">${formatCurrency(amountDue)}</span>
          </div>
          <div style="text-align: center; margin-top: 12px;">
            <span class="badge badge-warning">${amountPaid > 0 ? 'BELUM LUNAS' : 'BELUM BAYAR'}</span>
          </div>
          ` : amountPaid > 0 ? `
          <div style="text-align: center; margin-top: 12px;">
            <span class="badge badge-success">✓ LUNAS</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Special Requests -->
    ${showSpecialRequests && booking.special_requests ? `
    <div class="special-requests">
      <h4>📝 PERMINTAAN KHUSUS</h4>
      <p>${booking.special_requests}</p>
    </div>
    ` : ''}

    <!-- Payment Cards -->
    ${showPaymentInstructions && amountDue > 0 && bankAccounts.length > 0 ? `
    <div class="payment-section">
      <h3>💳 ${paymentTitle.toUpperCase()}</h3>
      <p>Silakan melakukan pembayaran ke salah satu rekening <strong>${hotelSettings.hotel_name}</strong> berikut:</p>
      <div class="bank-cards-grid">
        ${bankAccounts.map((account: any) => `
          <div class="bank-card">
            <div class="bank-icon">🏦</div>
            <div class="bank-name">${account.bank_name}</div>
            <div class="bank-details">${account.account_number}</div>
            <div class="bank-details">a.n. ${account.account_holder_name}</div>
          </div>
        `).join('')}
      </div>
      <div class="payment-warning">
        ⚠️ Pembayaran paling lambat sebelum check-in
      </div>
    </div>
    ` : ''}

    <!-- Branded Footer -->
    <div class="footer">
      <div class="footer-thank-you">
        <h4>🙏 TERIMA KASIH</h4>
        <p>${customFooterText || 'Kami menantikan kedatangan Anda di ' + hotelSettings.hotel_name + '. Terima kasih telah mempercayai kami sebagai pilihan akomodasi Anda.'}</p>
      </div>
      <div class="footer-contact">
        📧 ${hotelSettings.email_primary || 'info@hotel.com'}
        <span>|</span>
        📞 ${hotelSettings.phone_primary || '-'}
        ${hotelSettings.whatsapp_number ? `<span>|</span> 💬 ${hotelSettings.whatsapp_number}` : ''}
      </div>
      <div class="footer-divider"></div>
      <div class="footer-bottom">
        <span>Invoice dibuat secara otomatis oleh sistem</span>
        <span>Page 1 of 1</span>
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
