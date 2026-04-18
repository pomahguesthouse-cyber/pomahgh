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
  totalWithCode: number;
  uniqueCode: number;
  showPaidStamp: boolean;
  transactionStatus: string;
  paymentMethodLabel: string;
}): Uint8Array {
  const {
    booking, rooms, addons, bankAccounts, settings,
    totalWithCode, uniqueCode, showPaidStamp, transactionStatus, paymentMethodLabel,
  } = args;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Brand colors
  const primary: [number, number, number] = [74, 155, 217]; // #4a9bd9
  const secondary: [number, number, number] = [232, 244, 253]; // #e8f4fd
  const dark: [number, number, number] = [34, 34, 34];
  const muted: [number, number, number] = [120, 120, 120];

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, 5, 90, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...dark);
  doc.text('BUKTI PEMESANAN (BOOKING ORDER)', marginX, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  const createdAt = format(new Date(booking.created_at), "d MMM yyyy, HH:mm", { locale: idLocale });
  doc.text(`Booking ID: #${booking.booking_code}`, marginX, 58);
  doc.text(`Tanggal: ${createdAt} WIB`, marginX, 72);

  // Hotel name (top right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primary);
  const hotelName = settings.hotel_name || 'Pomah Guesthouse';
  doc.text(hotelName, pageWidth - marginX, 40, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  if (settings.address) {
    const addrLine = `${settings.address}${settings.city ? `, ${settings.city}` : ''}`;
    doc.text(addrLine, pageWidth - marginX, 56, { align: 'right' });
  }
  if (settings.phone_primary) {
    doc.text(`Telp: ${settings.phone_primary}`, pageWidth - marginX, 70, { align: 'right' });
  }

  // Helper to draw a section header bar
  const drawSectionHeader = (label: string, y: number): number => {
    doc.setFillColor(...secondary);
    doc.rect(marginX, y, pageWidth - marginX * 2, 20, 'F');
    doc.setFillColor(...primary);
    doc.rect(marginX, y, 4, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(label, marginX + 12, y + 14);
    return y + 28;
  };

  let y = 100;

  // === DETAIL PEMBAYARAN ===
  y = drawSectionHeader('DETAIL PEMBAYARAN', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text('Booking ID', marginX, y);
  doc.text('Metode', marginX + 180, y);
  doc.text('Status', marginX + 360, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(booking.booking_code, marginX, y + 14);
  doc.text(paymentMethodLabel, marginX + 180, y + 14);
  doc.text(transactionStatus, marginX + 360, y + 14);
  y += 36;

  // === DATA PEMESAN ===
  y = drawSectionHeader('DATA PEMESAN', y);
  doc.setFont('helvetica', 'normal');
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
  doc.setFont('helvetica', 'bold');
  doc.text(`Check-in  : ${checkInDate}${booking.check_in_time ? ` (${booking.check_in_time})` : ''}`, marginX, y);
  y += 14;
  doc.text(`Check-out : ${checkOutDate}${booking.check_out_time ? ` (${booking.check_out_time})` : ''}`, marginX, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(`Durasi    : ${booking.total_nights} malam`, marginX, y);
  y += 14;
  doc.text(`Tamu      : ${booking.num_guests} orang`, marginX, y);
  y += 18;

  // === DETAIL PEMESANAN (TABLE) ===
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
    foot: [
      ['', '', '', '', 'TOTAL', formatRupiah(booking.total_price)],
      ['', '', '', '', 'JUMLAH BAYAR', formatRupiah(showPaidStamp ? booking.total_price : totalWithCode)],
    ],
    footStyles: { fillColor: [245, 245, 245], textColor: dark, fontStyle: 'bold', fontSize: 9, halign: 'right' },
  });

  // After table position
  // @ts-expect-error -- autoTable adds lastAutoTable to doc
  y = (doc.lastAutoTable?.finalY ?? y + 100) + 20;

  // === PAID STAMP ===
  if (showPaidStamp) {
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(3);
    doc.roundedRect(pageWidth / 2 - 60, y, 120, 36, 4, 4, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(46, 125, 50);
    doc.text('PAID', pageWidth / 2, y + 25, { align: 'center' });
    y += 56;
  } else if (bankAccounts.length > 0) {
    // === INSTRUKSI PEMBAYARAN ===
    if (y > 700) { doc.addPage(); y = 50; }
    y = drawSectionHeader('INSTRUKSI PEMBAYARAN', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text('Silakan transfer sebesar:', marginX, y);
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...primary);
    doc.text(formatRupiah(totalWithCode), marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`(termasuk kode unik 3 digit: ${uniqueCode})`, marginX + 130, y);
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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...dark);
      doc.text(bank.bank_name, marginX + 12, y + 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`No. Rek: ${bank.account_number}`, marginX + 12, y + 30);
      doc.setTextColor(...muted);
      doc.text(`a.n. ${bank.account_holder_name}`, marginX + 12, y + 44);
      y += 58;
    });

    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    const tip = 'Tip: gunakan nominal persis (termasuk kode unik) agar pembayaran cepat terverifikasi.';
    doc.text(tip, marginX, y);
    y += 14;
  }

  // === FOOTER ===
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setFillColor(...primary);
  doc.rect(0, footerY - 6, pageWidth, 30, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const footerText = `${hotelName}${settings.email_primary ? ` • ${settings.email_primary}` : ''}${settings.phone_primary ? ` • ${settings.phone_primary}` : ''}`;
  doc.text(footerText, pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text('Terima kasih atas kepercayaan Anda. Syarat dan ketentuan berlaku.', pageWidth / 2, footerY + 18, { align: 'center' });

  return new Uint8Array(doc.output('arraybuffer'));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, send_email, send_whatsapp } = await req.json();

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

    // Fetch related
    const [{ data: bookingRooms }, { data: hotelSettings, error: settingsError }, { data: bankAccounts }, { data: bookingAddons }] = await Promise.all([
      supabase.from("booking_rooms").select(`*, rooms (name)`).eq("booking_id", booking_id),
      supabase.from("hotel_settings").select("*").single(),
      supabase.from("bank_accounts").select("*").eq("is_active", true).order("display_order"),
      supabase.from("booking_addons").select(`*, room_addons (name, icon_name, price_type)`).eq("booking_id", booking_id),
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
    if (paymentStatus === 'paid' || paymentStatus === 'lunas') {
      transactionStatus = 'LUNAS';
      showPaidStamp = true;
    } else if (paymentStatus === 'down_payment' || paymentStatus === 'partial') {
      transactionStatus = 'DOWN PAYMENT';
      showPaidStamp = true;
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

    // Generate PDF
    const pdfBytes = buildInvoicePdf({
      booking: booking as BookingRow,
      rooms: roomList,
      addons: (bookingAddons || []) as BookingAddonItem[],
      bankAccounts: (bankAccounts || []) as BankAccountItem[],
      settings: hotelSettings as HotelSettingsRow,
      totalWithCode,
      uniqueCode,
      showPaidStamp,
      transactionStatus,
      paymentMethodLabel,
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
    if (send_email && booking.guest_email) {
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

          const emailHtml = `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222;">
              <h2 style="color:#4a9bd9;">Bukti Pemesanan #${booking.booking_code}</h2>
              <p>Halo <strong>${booking.guest_name}</strong>,</p>
              <p>Terima kasih telah memilih ${hotelName}. Berikut detail pemesanan Anda terlampir dalam bentuk PDF.</p>
              <p><strong>Kode booking:</strong> ${booking.booking_code}<br>
                 <strong>Total:</strong> ${formatRupiah(showPaidStamp ? booking.total_price : totalWithCode)}<br>
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
              to: [booking.guest_email],
              subject: `Bukti Pemesanan #${booking.booking_code} - ${hotelName}`,
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
    if (send_whatsapp && booking.guest_phone) {
      try {
        const fonnteApiKey = Deno.env.get("FONNTE_API_KEY");
        if (!fonnteApiKey) {
          console.error("FONNTE_API_KEY not configured");
        } else {
          const hotelName = hotelSettings.hotel_name || 'Pomah Guesthouse';
          const totalLabel = formatRupiah(showPaidStamp ? booking.total_price : totalWithCode);
          const checkInLabel = format(new Date(booking.check_in), "dd MMM yyyy", { locale: idLocale });
          const checkOutLabel = format(new Date(booking.check_out), "dd MMM yyyy", { locale: idLocale });

          const bankList = (bankAccounts && bankAccounts.length > 0)
            ? (bankAccounts as BankAccountItem[]).map(b => `🏦 *${b.bank_name}*\nNo. Rek: ${b.account_number}\na.n. ${b.account_holder_name}`).join('\n\n')
            : '';

          const message = showPaidStamp
            ? `Halo *${booking.guest_name}* 👋\n\nTerima kasih telah menginap di ${hotelName}!\n\nBerikut bukti pemesanan Anda (terlampir PDF):\n\n📋 *${booking.booking_code}*\n📅 ${checkInLabel} → ${checkOutLabel} (${booking.total_nights} malam)\n💵 Total: *${totalLabel}* — LUNAS ✅\n\nKami tunggu kunjungan Anda berikutnya 🙏`
            : `Halo *${booking.guest_name}* 👋\n\nTerima kasih telah memesan di ${hotelName}!\n\nBerikut detail pesanan Anda (PDF terlampir):\n\n📋 Kode: *${booking.booking_code}*\n📅 Check-in: ${checkInLabel}\n📅 Check-out: ${checkOutLabel} (${booking.total_nights} malam)\n💵 Total bayar: *${totalLabel}*\n_(termasuk kode unik 3 digit untuk identifikasi)_\n\n💳 *INSTRUKSI PEMBAYARAN*\n${bankList}\n\nSilakan lakukan pembayaran dan kirim bukti transfer di chat ini ya. Tim kami akan segera memverifikasi 🙏\n\n📄 Invoice: ${invoicePdfUrl}`;

          const fonnteResp = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
              "Authorization": fonnteApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              target: booking.guest_phone,
              message,
              url: invoicePdfUrl, // attaches the PDF
              filename: `Invoice-${booking.booking_code}.pdf`,
              countryCode: "62",
            }),
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
