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
      font-family: ${fontFamily};
      font-size: ${fontSizeBase}pt;
      color: ${textColor};
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    }

    .invoice-container {
      max-width: 900px;
      margin: 40px auto;
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 50px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    /* Subtle watermark */
    .invoice-container::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 400px;
      background: url('${hotelSettings.logo_url || ''}') center/contain no-repeat;
      opacity: 0.03;
      pointer-events: none;
      z-index: 0;
    }

    .invoice-container > * {
      position: relative;
      z-index: 1;
    }

    /* Corner decorations */
    .corner-decoration {
      position: absolute;
      width: 80px;
      height: 80px;
      pointer-events: none;
    }

    .corner-decoration.top-left {
      top: 0;
      left: 0;
      background: linear-gradient(135deg, ${primaryColor}15, transparent);
      border-radius: 0 0 80px 0;
    }

    .corner-decoration.top-right {
      top: 0;
      right: 0;
      background: linear-gradient(225deg, ${secondaryColor}15, transparent);
      border-radius: 0 0 0 80px;
    }

    /* Premium Header */
    .header-premium {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 30px;
      margin-bottom: 40px;
      border-bottom: 3px solid;
      border-image: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}) 1;
      position: relative;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .logo-premium {
      max-height: ${logoSize === 'small' ? '50px' : logoSize === 'large' ? '100px' : '70px'};
      max-width: 200px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.1));
    }

    .hotel-info h1 {
      font-size: ${fontSizeHeading}pt;
      color: ${primaryColor};
      margin: 0 0 5px 0;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .hotel-info .tagline {
      color: ${textColor}99;
      font-size: 11pt;
      margin: 0;
      font-style: italic;
    }

    .invoice-number-elegant {
      text-align: right;
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      padding: 20px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(139, 69, 19, 0.25);
      min-width: 200px;
    }

    .invoice-number-elegant .ribbon {
      color: white;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
      opacity: 0.95;
      margin-bottom: 8px;
    }

    .invoice-number-elegant .number {
      color: white;
      font-size: 16pt;
      font-weight: 700;
      margin: 5px 0;
    }

    .invoice-number-elegant .date {
      color: white;
      font-size: 9pt;
      opacity: 0.9;
      margin-top: 8px;
    }

    /* Info Grid with Glass Morphism */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 40px;
    }

    .info-card-elegant {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(139, 69, 19, 0.15);
      border-radius: 16px;
      box-shadow: 
        0 4px 24px rgba(139, 69, 19, 0.08),
        0 1px 2px rgba(0, 0, 0, 0.04);
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .info-card-elegant::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor});
    }

    .info-card-elegant .card-icon {
      font-size: 28px;
      margin-bottom: 12px;
    }

    .info-card-elegant h3 {
      font-size: 12pt;
      color: ${primaryColor};
      margin: 0 0 16px 0;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .info-card-elegant p {
      margin: 8px 0;
      color: ${textColor};
    }

    .info-card-elegant .name {
      font-weight: 700;
      font-size: 13pt;
      color: ${textColor};
    }

    /* Section Headers */
    .section {
      margin: 40px 0;
    }

    .section-title {
      font-size: 14pt;
      color: ${primaryColor};
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .section-icon {
      font-size: 18pt;
    }

    /* Elegant Table */
    .table-elegant {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      margin-bottom: 30px;
    }

    .table-elegant thead th {
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      color: white;
      padding: 16px 20px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 10pt;
    }

    .table-elegant tbody td {
      padding: 16px 20px;
      border-bottom: 1px solid ${accentColor}50;
    }

    .table-elegant tbody tr {
      transition: background 0.2s ease;
    }

    .table-elegant tbody tr:last-child td {
      border-bottom: none;
    }

    .table-elegant tbody tr:nth-child(even) {
      background: ${accentColor}20;
    }

    .table-elegant tbody tr:hover {
      background: linear-gradient(90deg, ${accentColor}40, transparent);
    }

    .room-number {
      font-weight: 700;
      color: ${primaryColor};
      background: ${primaryColor}15;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
    }

    /* Status Badge Premium */
    .status-elegant {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 24px;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .status-elegant::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-pending {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
    }

    .status-confirmed {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .status-cancelled {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }

    /* Payment Summary Premium */
    .payment-box-premium {
      background: linear-gradient(145deg, #fafbfc 0%, #f0f4f8 100%);
      border-radius: 20px;
      padding: 32px;
      margin: 30px 0;
      position: relative;
      border: 2px solid transparent;
      background-clip: padding-box;
    }

    .payment-box-premium::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 20px;
      padding: 2px;
      background: linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}40);
      -webkit-mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    .payment-summary-title {
      font-size: 14pt;
      color: ${primaryColor};
      font-weight: 700;
      margin: 0 0 20px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .totals {
      margin: 20px 0;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      font-size: 12pt;
      color: ${textColor};
    }

    .grand-total-elegant {
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      border-radius: 12px;
      padding: 20px 28px;
      margin-top: 20px;
      box-shadow: 0 8px 24px rgba(139, 69, 19, 0.25);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grand-total-elegant .label {
      color: white;
      font-size: 13pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .grand-total-elegant .amount {
      color: white;
      font-size: 20pt;
      font-weight: 700;
    }

    /* Special Requests Box Elegant */
    .special-requests-box {
      background: linear-gradient(135deg, #fff9e6, #fff4d6);
      border: 1px solid #f0e68c;
      border-left: 4px solid #daa520;
      border-radius: 12px;
      padding: 20px 20px 20px 24px;
      margin: 30px 0;
      position: relative;
    }

    .special-requests-box::before {
      content: "📝";
      position: absolute;
      top: -12px;
      left: 20px;
      background: white;
      padding: 0 8px;
      font-size: 18pt;
    }

    .special-requests-box h4 {
      color: #b8860b;
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .special-requests-box p {
      color: #666;
      margin: 0;
      line-height: 1.8;
    }

    /* Bank Cards Premium */
    .payment-instructions {
      margin: 30px 0;
    }

    .payment-instructions h3 {
      font-size: 13pt;
      color: ${primaryColor};
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .bank-grid {
      display: grid;
      gap: 16px;
    }

    .bank-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border-left: 5px solid ${primaryColor};
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      gap: 16px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .bank-card:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .bank-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .bank-details {
      flex: 1;
    }

    .bank-name {
      font-weight: 700;
      font-size: 13pt;
      color: ${primaryColor};
      margin-bottom: 6px;
    }

    .bank-account {
      color: ${textColor};
      font-size: 11pt;
      margin: 4px 0;
    }

    .bank-holder {
      color: ${textColor}99;
      font-size: 10pt;
      margin: 4px 0;
    }

    /* Footer Premium */
    .footer-premium {
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(180deg, transparent 0%, ${accentColor}30 100%);
      border-radius: 0 0 16px 16px;
      margin: 40px -40px -40px;
    }

    .footer-logo {
      margin-bottom: 20px;
    }

    .footer-logo img {
      height: 50px;
      opacity: 0.8;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }

    .footer-signature {
      font-family: 'Georgia', serif;
      font-style: italic;
      font-size: 13pt;
      color: ${primaryColor};
      margin-bottom: 16px;
    }

    .footer-divider {
      width: 100px;
      height: 3px;
      background: linear-gradient(90deg, transparent, ${primaryColor}, transparent);
      margin: 20px auto;
    }

    .contact-icons {
      color: ${textColor}99;
      font-size: 10pt;
      margin-top: 16px;
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .contact-icons span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Print Styles */
    @media print {
      @page {
        size: A4;
        margin: 1.5cm;
      }
      
      body {
        background: white !important;
      }
      
      .invoice-container {
        box-shadow: none !important;
        margin: 0 !important;
      }
      
      .invoice-container::before {
        opacity: 0.02 !important;
      }
      
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container pdf-friendly">
    <!-- Corner Decorations -->
    <div class="corner-decoration top-left"></div>
    <div class="corner-decoration top-right"></div>
    
    ${customHeaderText ? `<div style="background: ${accentColor}; padding: 15px; margin-bottom: 20px; border-left: 4px solid ${primaryColor}; font-weight: 600;">${customHeaderText}</div>` : ''}
    
    <!-- Premium Header -->
    <div class="header-premium">
      <div class="logo-container">
        ${showLogo && hotelSettings.logo_url ? `
          <img src="${hotelSettings.logo_url}" 
               class="logo-premium" 
               alt="${hotelSettings.hotel_name}" 
               onerror="this.style.display='none'" />
        ` : ''}
        <div class="hotel-info">
          <h1>${hotelSettings.hotel_name || 'Pomah Guesthouse'}</h1>
          ${hotelSettings.tagline ? `<p class="tagline">${hotelSettings.tagline}</p>` : ''}
        </div>
      </div>
      <div class="invoice-number-elegant">
        <div class="ribbon">INVOICE</div>
        <div class="number">${booking.invoice_number}</div>
        <div class="date">${formatDate(booking.created_at)}</div>
      </div>
    </div>

    <!-- Info Grid with Glass Morphism -->
    ${showGuestDetails || showHotelDetails ? `<div class="info-grid">` : ''}
      ${showGuestDetails ? `
      <div class="info-card-elegant">
        <div class="card-icon">👤</div>
        <h3>Detail Tamu</h3>
        <p class="name">${booking.guest_name}</p>
        <p>${booking.guest_email}</p>
        ${booking.guest_phone ? `<p>${booking.guest_phone}</p>` : ''}
      </div>
      ` : ''}
      ${showHotelDetails ? `
      <div class="info-card-elegant">
        <div class="card-icon">🏨</div>
        <h3>Detail Hotel</h3>
        <p class="name">${hotelSettings.hotel_name}</p>
        <p>${hotelSettings.address}</p>
        <p>${hotelSettings.city}, ${hotelSettings.country}</p>
        <p>${hotelSettings.phone_primary}</p>
      </div>
      ` : ''}
    ${showGuestDetails || showHotelDetails ? `</div>` : ''}

    <!-- Booking Details -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📅</span>
        Detail Booking
      </div>
      <table class="table-elegant">
        <thead>
          <tr>
            <th>Kode Booking</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Malam</th>
            <th>Tamu</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${booking.booking_code}</strong></td>
            <td>${formatDate(booking.check_in)}<br><small>${booking.check_in_time || '14:00'}</small></td>
            <td>${formatDate(booking.check_out)}<br><small>${booking.check_out_time || '12:00'}</small></td>
            <td>${booking.total_nights}</td>
            <td>${booking.num_guests}</td>
            <td>
              <span class="status-elegant status-${booking.status}">${booking.status}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Special Requests -->
    ${showSpecialRequests && booking.special_requests ? `
    <div class="special-requests-box">
      <h4>Permintaan Khusus</h4>
      <p>${booking.special_requests}</p>
    </div>
    ` : ''}

    <!-- Room Details -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">🛏️</span>
        Detail Kamar
      </div>
      <table class="table-elegant">
        <thead>
          <tr>
            <th>Tipe Kamar</th>
            <th>No. Kamar</th>
            <th>Malam</th>
            <th>Harga/Malam</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${bookingRooms && bookingRooms.length > 0 ? bookingRooms.map((br: any) => `
            <tr>
              <td><strong>${br.rooms?.name || room.name}</strong></td>
              <td><span class="room-number">#${br.room_number}</span></td>
              <td>${booking.total_nights}</td>
              <td>${formatCurrency(br.price_per_night)}</td>
              <td>${formatCurrency(br.price_per_night * booking.total_nights)}</td>
            </tr>
          `).join('') : `
            <tr>
              <td><strong>${room.name}</strong></td>
              <td><span class="room-number">#${booking.allocated_room_number || 'TBA'}</span></td>
              <td>${booking.total_nights}</td>
              <td>${formatCurrency(booking.total_price / booking.total_nights)}</td>
              <td>${formatCurrency(subtotal)}</td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Payment Summary Premium -->
      <div class="payment-box-premium">
        <div class="payment-summary-title">Ringkasan Pembayaran</div>
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
        </div>
        <div class="grand-total-elegant">
          <span class="label">Total</span>
          <span class="amount">${formatCurrency(total)}</span>
        </div>
        ${amountPaid > 0 ? `
        <div class="totals" style="margin-top: 20px;">
          <div class="total-row">
            <span>Terbayar:</span>
            <span>${formatCurrency(amountPaid)}</span>
          </div>
          <div class="total-row" style="color: #dc3545; font-weight: bold;">
            <span>Sisa:</span>
            <span>${formatCurrency(amountDue)}</span>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Payment Instructions Premium -->
    ${showPaymentInstructions && amountDue > 0 && (bankAccounts.length > 0 || hotelSettings.payment_instructions) ? `
    <div class="payment-instructions">
      <h3>
        <span>💳</span>
        ${paymentTitle}
      </h3>
      ${bankAccounts.length > 0 ? `
        <p style="margin-bottom: 20px; font-weight: 600; color: ${textColor};">Silakan transfer ke salah satu rekening berikut:</p>
        <div class="bank-grid">
          ${bankAccounts.map((account: any, index: number) => `
            <div class="bank-card">
              <div class="bank-icon">🏦</div>
              <div class="bank-details">
                <div class="bank-name">${account.bank_name}</div>
                <div class="bank-account">No. Rekening: <strong>${account.account_number}</strong></div>
                <div class="bank-holder">a.n. ${account.account_holder_name}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${hotelSettings.payment_instructions ? `<div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid ${accentColor}; color: ${textColor}99; line-height: 1.8;">${hotelSettings.payment_instructions}</div>` : ''}
    </div>
    ` : ''}

    <!-- Footer Premium -->
    <div class="footer-premium">
      ${hotelSettings.logo_url ? `
      <div class="footer-logo">
        <img src="${hotelSettings.logo_url}" alt="${hotelSettings.hotel_name}" />
      </div>
      ` : ''}
      <p class="footer-signature">${customFooterText || hotelSettings.invoice_footer_text || 'Terima kasih telah memilih ' + hotelSettings.hotel_name + '!'}</p>
      <div class="footer-divider"></div>
      <div class="contact-icons">
        <span>📧 ${hotelSettings.email_primary}</span>
        <span>📞 ${hotelSettings.phone_primary}</span>
        ${hotelSettings.whatsapp_number ? `<span>💬 ${hotelSettings.whatsapp_number}</span>` : ''}
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