import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { id as idLocale } from "https://esm.sh/date-fns@3.6.0/locale/id";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRow {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_nights: number;
  total_price: number;
  payment_amount: number | null;
  payment_status: string | null;
  bank_code: string | null;
  num_guests: number;
  allocated_room_number: string | null;
  created_at: string;
  rooms?: { name: string } | null;
}

interface BookingRoomItem {
  rooms?: { name: string } | null;
  room_number: string;
  price_per_night: number;
}

interface BankAccountItem {
  bank_name: string;
  account_number: string;
  account_holder_name: string;
}

interface BookingAddonItem {
  room_addons?: { name: string } | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface HotelSettingsRow {
  hotel_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone_primary: string | null;
  email_primary: string | null;
  logo_url: string | null;
  invoice_logo_url: string | null;
}

interface InvoiceTemplateRow {
  invoice_primary_color: string | null;
  invoice_secondary_color: string | null;
  font_family: string | null;
  show_logo: boolean | null;
  show_bank_accounts: boolean | null;
  show_qris: boolean | null;
  show_breakdown: boolean | null;
  footer_text: string | null;
  custom_notes: string | null;
  qris_image_url: string | null;
}

/** Convert "#4a9bd9" → [74, 155, 217]. Falls back to default on parse error. */
function hexToRgb(hex: string | null | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex.replace('#', ''))) return fallback;
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Fetch image as base64 data URL for embedding in jsPDF. */
async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || 'image/png';
    const bytes = new Uint8Array(await resp.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${ct};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

const formatRupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

/**
 * Build a structured PDF invoice with jsPDF + autoTable.
 * Returns a Uint8Array (PDF bytes).
 */
function buildInvoicePdf(args: {
  booking: BookingRow;
  rooms: BookingRoomItem[];
  addons: BookingAddonItem[];
  bankAccounts: BankAccountItem[];
  settings: HotelSettingsRow;
  template: InvoiceTemplateRow | null;
  logoDataUrl: string | null;
  qrisDataUrl: string | null;
  totalWithCode: number;
  uniqueCode: number;
  showPaidStamp: boolean;
  transactionStatus: string;
  paymentMethodLabel: string;
  paidAmount: number;
  remainingBalance: number;
  isDownPayment: boolean;
}): Uint8Array {
  const {
    booking, rooms, addons, bankAccounts, settings, template,
    logoDataUrl, qrisDataUrl,
    totalWithCode, uniqueCode, showPaidStamp, transactionStatus, paymentMethodLabel,
    paidAmount, remainingBalance, isDownPayment,
  } = args;

  // Resolve template config (with safe fallbacks)
  const fontFamily = (template?.font_family === 'times' || template?.font_family === 'courier')
    ? template.font_family
    : 'helvetica';
  const showLogo = template?.show_logo !== false;
  const showBank = template?.show_bank_accounts !== false;
  const showQris = !!template?.show_qris && !!qrisDataUrl;
  const showBreakdown = template?.show_breakdown !== false;
  const customNotes = template?.custom_notes || '';
  const footerCustom = template?.footer_text || '';

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Brand colors from template
  const primary: [number, number, number] = hexToRgb(template?.invoice_primary_color, [74, 155, 217]);
  const secondary: [number, number, number] = hexToRgb(template?.invoice_secondary_color, [232, 244, 253]);
  const dark: [number, number, number] = [34, 34, 34];
  const muted: [number, number, number] = [120, 120, 120];

  // ===== HEADER (clean, non-overlapping layout) =====
  // Left accent strip
  doc.setFillColor(...primary);
  doc.rect(0, 0, 5, 110, 'F');

  const hotelName = settings.hotel_name || 'Pomah Guesthouse';

  // --- RIGHT SIDE: Logo (top) + address (below logo) ---
  // Compute logo box first so we know where address starts (no overlap).
  const logoMaxW = 90;
  const logoMaxH = 55;
  const logoTop = 25;
  let logoBottomY = logoTop; // fallback when no logo
  let logoDrawn = false;

  if (showLogo && logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const ratio = props.width / props.height;
      let drawW = logoMaxW;
      let drawH = logoMaxW / ratio;
      if (drawH > logoMaxH) {
        drawH = logoMaxH;
        drawW = logoMaxH * ratio;
      }
      const xPos = pageWidth - marginX - drawW;
      doc.addImage(logoDataUrl, 'PNG', xPos, logoTop, drawW, drawH, undefined, 'FAST');
      logoBottomY = logoTop + drawH;
      logoDrawn = true;
    } catch (e) {
      console.warn('Failed to embed invoice logo:', e);
    }
  }

  if (!logoDrawn) {
    // Hotel name as text fallback in top-right
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...primary);
    doc.text(hotelName, pageWidth - marginX, 40, { align: 'right' });
    logoBottomY = 45;
  }

  // Address block — placed BELOW the logo so they never overlap
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  let addrY = logoBottomY + 12;
  if (settings.address) {
    doc.text(settings.address, pageWidth - marginX, addrY, { align: 'right' });
    addrY += 10;
  }
  const cityLine = [settings.city, settings.postal_code].filter(Boolean).join(' ');
  if (cityLine) {
    doc.text(cityLine, pageWidth - marginX, addrY, { align: 'right' });
  }

  // --- LEFT SIDE: Title + Booking ID + Date ---
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...dark);
  doc.text('BUKTI PEMESANAN (BOOKING ORDER)', marginX, 40);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  const createdAt = format(new Date(booking.created_at), "d MMM yyyy, HH:mm", { locale: idLocale });
  doc.text(`Booking ID: #${booking.booking_code}`, marginX, 60);
  doc.text(`Tanggal: ${createdAt} WIB`, marginX, 74);

  // Helper to draw a section header bar
  const drawSectionHeader = (label: string, y: number): number => {
    doc.setFillColor(...secondary);
    doc.rect(marginX, y, pageWidth - marginX * 2, 20, 'F');
    doc.setFillColor(...primary);
    doc.rect(marginX, y, 4, 20, 'F');
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(label, marginX + 12, y + 14);
    return y + 42;
  };

  let y = 140;

  // === DETAIL PEMBAYARAN ===
  y = drawSectionHeader('DETAIL PEMBAYARAN', y);
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text('Booking ID', marginX, y);
  doc.text('Metode', marginX + 180, y);
  doc.text('Status', marginX + 360, y);
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(booking.booking_code, marginX, y + 14);
  doc.text(paymentMethodLabel, marginX + 180, y + 14);
  doc.text(transactionStatus, marginX + 360, y + 14);
  y += 36;

  // === DATA PEMESAN ===
  y = drawSectionHeader('DATA PEMESAN', y);
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(`Nama       : ${booking.guest_name}`, marginX, y);
  y += 14;
  doc.text(`Email      : ${booking.guest_email}`, marginX, y);
  y += 14;
  if (booking.guest_phone) {
    doc.text(`No. Kontak : ${booking.guest_phone}`, marginX, y);
    y += 14;
  }
  y += 6;

  // === DETAIL HOTEL & STAY ===
  y = drawSectionHeader('DETAIL MENGINAP', y);
  const checkInDate = format(new Date(booking.check_in), "EEEE, dd MMMM yyyy", { locale: idLocale });
  const checkOutDate = format(new Date(booking.check_out), "EEEE, dd MMMM yyyy", { locale: idLocale });
  doc.setFont(fontFamily, 'bold');
  doc.text(`Check-in  : ${checkInDate}${booking.check_in_time ? ` (${booking.check_in_time})` : ''}`, marginX, y);
  y += 14;
  doc.text(`Check-out : ${checkOutDate}${booking.check_out_time ? ` (${booking.check_out_time})` : ''}`, marginX, y);
  y += 14;
  doc.setFont(fontFamily, 'normal');
  doc.text(`Durasi    : ${booking.total_nights} malam`, marginX, y);
  y += 14;
  doc.text(`Tamu      : ${booking.num_guests} orang`, marginX, y);
  y += 18;

  // === DETAIL PEMESANAN (TABLE or SUMMARY) ===
  if (showBreakdown) {
    y = drawSectionHeader('DETAIL PEMESANAN', y);
    const tableRows: (string | number)[][] = [];
    let idx = 1;
    rooms.forEach((r) => {
      const subtotal = r.price_per_night * booking.total_nights;
      tableRows.push([
        idx++,
        'Akomodasi',
        `${hotelName} - ${r.rooms?.name || booking.rooms?.name || 'Kamar'}${r.room_number ? ` #${r.room_number}` : ''}`,
        `${booking.total_nights} mlm`,
        formatRupiah(r.price_per_night),
        formatRupiah(subtotal),
      ]);
    });
    addons.forEach((a) => {
      tableRows.push([
        idx++,
        'Add-on',
        a.room_addons?.name || 'Layanan tambahan',
        `${a.quantity}x`,
        formatRupiah(a.unit_price),
        formatRupiah(a.total_price),
      ]);
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['No', 'Jenis', 'Deskripsi', 'Jml', 'Harga Satuan', 'Total']],
      body: tableRows,
      headStyles: { fillColor: primary, textColor: 255, fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 9, textColor: 50 },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 50, halign: 'center' },
        4: { cellWidth: 80, halign: 'right' },
        5: { cellWidth: 80, halign: 'right' },
      },
      foot: isDownPayment
        ? [
            ['', '', '', '', 'TOTAL', formatRupiah(booking.total_price)],
            ['', '', '', '', 'DP DIBAYAR', formatRupiah(paidAmount)],
            ['', '', '', '', 'SISA PEMBAYARAN', formatRupiah(remainingBalance)],
          ]
        : [
            ['', '', '', '', 'TOTAL', formatRupiah(booking.total_price)],
            ['', '', '', '', 'JUMLAH BAYAR', formatRupiah(showPaidStamp ? booking.total_price : totalWithCode)],
          ],
      footStyles: { fillColor: [245, 245, 245], textColor: dark, fontStyle: 'bold', fontSize: 9, halign: 'right' },
    });
  } else {
    // Compact summary (no breakdown)
    y = drawSectionHeader('TOTAL PEMBAYARAN', y);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primary);
    const headlineAmount = showPaidStamp
      ? booking.total_price
      : isDownPayment
        ? booking.total_price
        : totalWithCode;
    doc.text(formatRupiah(headlineAmount), pageWidth / 2, y + 10, { align: 'center' });
    y += 30;
    if (isDownPayment) {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`DP dibayar: ${formatRupiah(paidAmount)}  •  Sisa: ${formatRupiah(remainingBalance)}`, pageWidth / 2, y, { align: 'center' });
      y += 16;
    }
    // @ts-expect-error -- ensure lastAutoTable equivalent
    doc.lastAutoTable = { finalY: y };
  }

  // After table position
  // @ts-expect-error -- autoTable adds lastAutoTable to doc
  y = (doc.lastAutoTable?.finalY ?? y + 100) + 20;

  // === PAID STAMP ===
  if (showPaidStamp) {
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(3);
    doc.roundedRect(pageWidth / 2 - 60, y, 120, 36, 4, 4, 'S');
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(46, 125, 50);
    doc.text('PAID', pageWidth / 2, y + 25, { align: 'center' });
    y += 56;
  } else if (showBank && bankAccounts.length > 0) {
    // === INSTRUKSI PEMBAYARAN ===
    if (y > 700) { doc.addPage(); y = 50; }
    y = drawSectionHeader(isDownPayment ? 'PELUNASAN PEMBAYARAN' : 'INSTRUKSI PEMBAYARAN', y);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(isDownPayment ? 'Sisa pembayaran yang harus dilunasi:' : 'Silakan transfer sebesar:', marginX, y);
    y += 16;
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...primary);
    const transferAmount = isDownPayment ? remainingBalance : totalWithCode;
    doc.text(formatRupiah(transferAmount), marginX, y);
    if (!isDownPayment) {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(`(termasuk kode unik 3 digit: ${uniqueCode})`, marginX + 130, y);
    }
    y += 18;
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text('Ke salah satu rekening berikut:', marginX, y);
    y += 14;

    bankAccounts.forEach((bank) => {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.setDrawColor(...primary);
      doc.setLineWidth(0.5);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX, y, pageWidth - marginX * 2, 50, 3, 3, 'S');
      doc.setFillColor(...primary);
      doc.rect(marginX, y, 3, 50, 'F');

      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...dark);
      doc.text(bank.bank_name, marginX + 12, y + 16);

      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(10);
      doc.text(`No. Rek: ${bank.account_number}`, marginX + 12, y + 30);
      doc.setTextColor(...muted);
      doc.text(`a.n. ${bank.account_holder_name}`, marginX + 12, y + 44);
      y += 58;
    });

    y += 6;
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    const tip = isDownPayment
      ? 'Tip: lakukan pelunasan minimal 1 hari sebelum check-in agar tidak ada kendala saat tiba.'
      : 'Tip: gunakan nominal persis (termasuk kode unik) agar pembayaran cepat terverifikasi.';
    doc.text(tip, marginX, y);
    y += 14;
  }

  // === QRIS ===
  if (!showPaidStamp && showQris && qrisDataUrl) {
    if (y > 620) { doc.addPage(); y = 50; }
    y = drawSectionHeader('SCAN QRIS', y);
    try {
      doc.addImage(qrisDataUrl, 'PNG', pageWidth / 2 - 70, y, 140, 140, undefined, 'FAST');
      y += 148;
      doc.setFont(fontFamily, 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text('Scan QRIS di atas untuk membayar dengan e-wallet / mobile banking.', pageWidth / 2, y, { align: 'center' });
      y += 14;
    } catch (e) {
      console.warn('Failed to embed QRIS:', e);
    }
  }

  // === CUSTOM NOTES ===
  if (customNotes) {
    if (y > 760) { doc.addPage(); y = 50; }
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    const noteLines = doc.splitTextToSize(customNotes, pageWidth - marginX * 2);
    doc.text(noteLines, marginX, y);
    y += noteLines.length * 12 + 6;
  }

  // === FOOTER ===
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setFillColor(...primary);
  doc.rect(0, footerY - 6, pageWidth, 30, 'F');
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const footerText = `${hotelName}${settings.email_primary ? ` • ${settings.email_primary}` : ''}${settings.phone_primary ? ` • ${settings.phone_primary}` : ''}`;
  doc.text(footerText, pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text(footerCustom || 'Terima kasih atas kepercayaan Anda. Syarat dan ketentuan berlaku.', pageWidth / 2, footerY + 18, { align: 'center' });

  return new Uint8Array(doc.output('arraybuffer'));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, send_email, send_whatsapp, override_email, override_phone } = await req.json();
    // Test mode: when override is supplied, send to that target instead of the guest's real contact.
    const targetEmail: string | null = (override_email && String(override_email).trim()) || null;
    const targetPhone: string | null = (override_phone && String(override_phone).trim()) || null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Generating invoice for booking ${booking_id} (email=${!!send_email}, wa=${!!send_whatsapp})`);

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`*, rooms (*)`)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) throw new Error(bookingError?.message || "Booking not found");

    // Fetch related (incl. invoice template)
    const [
      { data: bookingRooms },
      { data: hotelSettings, error: settingsError },
      { data: bankAccounts },
      { data: bookingAddons },
      { data: invoiceTemplate },
    ] = await Promise.all([
      supabase.from("booking_rooms").select(`*, rooms (name)`).eq("booking_id", booking_id),
      supabase.from("hotel_settings").select("*").single(),
      supabase.from("bank_accounts").select("*").eq("is_active", true).order("display_order"),
      supabase.from("booking_addons").select(`*, room_addons (name, icon_name, price_type)`).eq("booking_id", booking_id),
      supabase.from("invoice_templates").select("*").limit(1).maybeSingle(),
    ]);

    if (settingsError || !hotelSettings) throw new Error(settingsError?.message || "Hotel settings missing");

    const paidAmount = booking.payment_amount || 0;
    const remainingBalance = booking.total_price - paidAmount;
    const uniqueCode = Math.floor(Math.random() * 900 + 100);
    const totalWithCode = booking.total_price + uniqueCode;

    // Payment method label
    let paymentMethodLabel = 'Bank Transfer';
    if (booking.bank_code) paymentMethodLabel = `Bank Transfer (${booking.bank_code.toUpperCase()})`;

    // Transaction status
    const paymentStatus = booking.payment_status || 'pending';
    let transactionStatus = 'Belum Bayar';
    let showPaidStamp = false;
    let isDownPayment = false;
    if (paymentStatus === 'paid' || paymentStatus === 'lunas') {
      transactionStatus = 'LUNAS';
      showPaidStamp = true;
    } else if (paymentStatus === 'down_payment' || paymentStatus === 'partial') {
      transactionStatus = `DP — Sisa ${formatRupiah(remainingBalance)}`;
      isDownPayment = true;
    } else if (paymentStatus === 'pay_at_hotel') {
      transactionStatus = 'Bayar di Hotel';
    } else if (remainingBalance <= 0 && paidAmount > 0) {
      transactionStatus = 'LUNAS';
      showPaidStamp = true;
    }

    // Build room list
    const roomList: BookingRoomItem[] = bookingRooms && bookingRooms.length > 0
      ? (bookingRooms as BookingRoomItem[])
      : [{
          rooms: booking.rooms ? { name: (booking.rooms as { name: string }).name } : null,
          room_number: booking.allocated_room_number || '',
          price_per_night: booking.total_price / booking.total_nights,
        }];

    // Pre-fetch logo + QRIS as data URLs (parallel)
    const tpl = (invoiceTemplate || null) as InvoiceTemplateRow | null;
    const logoUrl = hotelSettings.invoice_logo_url || hotelSettings.logo_url;
    const [logoDataUrl, qrisDataUrl] = await Promise.all([
      (tpl?.show_logo !== false) && logoUrl ? fetchImageDataUrl(logoUrl) : Promise.resolve(null),
      tpl?.show_qris && tpl?.qris_image_url ? fetchImageDataUrl(tpl.qris_image_url) : Promise.resolve(null),
    ]);

    // Generate PDF
    const pdfBytes = buildInvoicePdf({
      booking: booking as BookingRow,
      rooms: roomList,
      addons: (bookingAddons || []) as BookingAddonItem[],
      bankAccounts: (bankAccounts || []) as BankAccountItem[],
      settings: hotelSettings as HotelSettingsRow,
      template: tpl,
      logoDataUrl,
      qrisDataUrl,
      totalWithCode,
      uniqueCode,
      showPaidStamp,
      transactionStatus,
      paymentMethodLabel,
      paidAmount,
      remainingBalance,
      isDownPayment,
    });

    // Upload PDF to storage
    const fileName = `${booking.booking_code}-${Date.now()}.pdf`;
    const filePath = `${booking.id}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("invoices")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Failed to upload invoice PDF:", uploadErr);
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from("invoices").getPublicUrl(filePath);
    const invoicePdfUrl = publicUrlData.publicUrl;
    console.log("Invoice PDF uploaded:", invoicePdfUrl);

    // === Optional: Send via Email (Resend) ===
    let emailSent = false;
    const emailRecipient = targetEmail || booking.guest_email;
    if (send_email && emailRecipient) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          console.error("RESEND_API_KEY not configured");
        } else {
          const hotelName = hotelSettings.hotel_name || 'Pomah Guesthouse';
          // Convert PDF to base64 for attachment
          let binary = '';
          for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);
          const pdfBase64 = btoa(binary);

          const emailTotalLine = isDownPayment
            ? `<strong>Total:</strong> ${formatRupiah(booking.total_price)}<br>
               <strong>DP dibayar:</strong> ${formatRupiah(paidAmount)}<br>
               <strong>Sisa pembayaran:</strong> ${formatRupiah(remainingBalance)}<br>`
            : `<strong>Total:</strong> ${formatRupiah(showPaidStamp ? booking.total_price : totalWithCode)}<br>`;
          const emailHtml = `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222;">
              <h2 style="color:#4a9bd9;">Bukti Pemesanan #${booking.booking_code}</h2>
              <p>Halo <strong>${booking.guest_name}</strong>,</p>
              <p>Terima kasih telah memilih ${hotelName}. Berikut detail pemesanan Anda terlampir dalam bentuk PDF.</p>
              <p><strong>Kode booking:</strong> ${booking.booking_code}<br>
                 ${emailTotalLine}
                 <strong>Status:</strong> ${transactionStatus}</p>
              ${!showPaidStamp ? `<p>Silakan lakukan pembayaran sesuai instruksi di invoice. Setelah transfer, kirim bukti ke WhatsApp kami untuk verifikasi.</p>` : ''}
              <p style="margin-top:30px;font-size:12px;color:#888;">Atau buka invoice online: <a href="${invoicePdfUrl}">${invoicePdfUrl}</a></p>
            </div>
          `;

          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${hotelName} <noreply@notify.pomahguesthouse.com>`,
              to: [emailRecipient],
              subject: `${targetEmail ? "[TEST] " : ""}Bukti Pemesanan #${booking.booking_code} - ${hotelName}`,
              html: emailHtml,
              attachments: [{
                filename: `Invoice-${booking.booking_code}.pdf`,
                content: pdfBase64,
              }],
            }),
          });

          const resendResult = await resendResponse.json();
          if (resendResponse.ok) {
            emailSent = true;
            console.log("Invoice email sent. ID:", resendResult.id);
          } else {
            console.error("Resend error:", resendResult);
          }
        }
      } catch (e) {
        console.error("Email send error:", e);
      }
    }

    // === Optional: Send via WhatsApp (Fonnte) ===
    let whatsappSent = false;
    const phoneRecipient = targetPhone || booking.guest_phone;
    if (send_whatsapp && phoneRecipient) {
      try {
        const fonnteApiKey = Deno.env.get("FONNTE_API_KEY");
        if (!fonnteApiKey) {
          console.error("FONNTE_API_KEY not configured");
        } else {
          const hotelName = hotelSettings.hotel_name || 'Pomah Guesthouse';
          const totalLabel = formatRupiah(showPaidStamp || isDownPayment ? booking.total_price : totalWithCode);
          const checkInLabel = format(new Date(booking.check_in), "dd MMM yyyy", { locale: idLocale });
          const checkOutLabel = format(new Date(booking.check_out), "dd MMM yyyy", { locale: idLocale });

          const bankList = (bankAccounts && bankAccounts.length > 0)
            ? (bankAccounts as BankAccountItem[]).map(b => `🏦 *${b.bank_name}*\nNo. Rek: ${b.account_number}\na.n. ${b.account_holder_name}`).join('\n\n')
            : '';

          const message = showPaidStamp
            ? `Halo *${booking.guest_name}* 👋\n\nTerima kasih telah menginap di ${hotelName}!\n\nBerikut bukti pemesanan Anda (terlampir PDF):\n\n📋 *${booking.booking_code}*\n📅 ${checkInLabel} → ${checkOutLabel} (${booking.total_nights} malam)\n💵 Total: *${totalLabel}* — LUNAS ✅\n\nKami tunggu kunjungan Anda berikutnya 🙏`
            : isDownPayment
              ? `Halo *${booking.guest_name}* 👋\n\nTerima kasih telah memesan di ${hotelName}!\n\nBerikut bukti pemesanan Anda (PDF terlampir):\n\n📋 Kode: *${booking.booking_code}*\n📅 Check-in: ${checkInLabel}\n📅 Check-out: ${checkOutLabel} (${booking.total_nights} malam)\n\n💵 Total: *${totalLabel}*\n✅ DP dibayar: *${formatRupiah(paidAmount)}*\n💳 Sisa pelunasan: *${formatRupiah(remainingBalance)}*\n\n💳 *PELUNASAN PEMBAYARAN*\n${bankList}\n\nSilakan lunasi sisa pembayaran sebesar *${formatRupiah(remainingBalance)}* dan kirim bukti transfer di chat ini ya 🙏\n\n📄 Invoice: ${invoicePdfUrl}`
              : `Halo *${booking.guest_name}* 👋\n\nTerima kasih telah memesan di ${hotelName}!\n\nBerikut detail pesanan Anda (PDF terlampir):\n\n📋 Kode: *${booking.booking_code}*\n📅 Check-in: ${checkInLabel}\n📅 Check-out: ${checkOutLabel} (${booking.total_nights} malam)\n💵 Total bayar: *${formatRupiah(totalWithCode)}*\n_(termasuk kode unik 3 digit untuk identifikasi)_\n\n💳 *INSTRUKSI PEMBAYARAN*\n${bankList}\n\nSilakan lakukan pembayaran dan kirim bukti transfer di chat ini ya. Tim kami akan segera memverifikasi 🙏\n\n📄 Invoice: ${invoicePdfUrl}`;

          // Send PDF directly as multipart/form-data (avoids "url unreachable" errors when Fonnte cannot fetch our public URL)
          const formData = new FormData();
          formData.append("target", phoneRecipient);
          formData.append("message", message);
          formData.append("countryCode", "62");
          const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
          formData.append("file", pdfBlob, `Invoice-${booking.booking_code}.pdf`);

          const fonnteResp = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
              "Authorization": fonnteApiKey,
            },
            body: formData,
          });

          const fonnteResult = await fonnteResp.json();
          if (fonnteResp.ok && fonnteResult.status !== false) {
            whatsappSent = true;
            console.log("Invoice sent via WhatsApp:", booking.guest_phone);
          } else {
            console.error("Fonnte send failed:", fonnteResult);
          }
        }
      } catch (e) {
        console.error("WhatsApp send error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_pdf_url: invoicePdfUrl,
        email_sent: emailSent,
        whatsapp_sent: whatsappSent,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        booking_code: booking.booking_code,
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
