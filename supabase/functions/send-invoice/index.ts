import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatInvoiceWhatsAppMessage(data: any): string {
  const { booking, room, hotelSettings, invoiceNumber } = data;
  
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

  let message = `🏨 *INVOICE BOOKING*\n`;
  message += `${hotelSettings.hotel_name || 'Pomah Guesthouse'}\n\n`;
  
  message += `📋 *No. Invoice:* ${invoiceNumber}\n`;
  message += `📅 *Tanggal:* ${formatDate(booking.created_at)}\n\n`;
  
  message += `👤 *Detail Tamu*\n`;
  message += `Nama: ${booking.guest_name}\n`;
  message += `Email: ${booking.guest_email}\n`;
  if (booking.guest_phone) {
    message += `Telepon: ${booking.guest_phone}\n`;
  }
  message += `\n`;
  
  message += `🛏️ *Detail Booking*\n`;
  message += `Kamar: ${room.name}\n`;
  message += `Check-in: ${formatDate(booking.check_in)} (${booking.check_in_time || '14:00'})\n`;
  message += `Check-out: ${formatDate(booking.check_out)} (${booking.check_out_time || '12:00'})\n`;
  message += `Jumlah Malam: ${booking.total_nights}\n`;
  message += `Jumlah Tamu: ${booking.num_guests}\n`;
  message += `Status: ${booking.status.toUpperCase()}\n\n`;
  
  message += `💰 *Rincian Biaya*\n`;
  message += `Harga/malam: ${formatCurrency(booking.total_price / booking.total_nights)}\n`;
  message += `Subtotal: ${formatCurrency(subtotal)}\n`;
  
  if (taxAmount > 0) {
    message += `${hotelSettings.tax_name || 'Pajak'} (${hotelSettings.tax_rate}%): ${formatCurrency(taxAmount)}\n`;
  }
  
  message += `${'─'.repeat(30)}\n`;
  message += `*TOTAL: ${formatCurrency(total)}*\n\n`;
  
  if (amountPaid > 0) {
    message += `✅ Terbayar: ${formatCurrency(amountPaid)}\n`;
    message += `⚠️ *Sisa: ${formatCurrency(amountDue)}*\n\n`;
  }
  
  if (amountDue > 0 && hotelSettings.payment_instructions) {
    message += `💳 *Instruksi Pembayaran:*\n`;
    message += `${hotelSettings.payment_instructions}\n\n`;
  }
  
  if (booking.special_requests) {
    message += `📝 *Permintaan Khusus:*\n`;
    message += `${booking.special_requests}\n\n`;
  }
  
  message += `${hotelSettings.invoice_footer_text || 'Terima kasih telah memilih kami!'}\n\n`;
  message += `📞 *Kontak:*\n`;
  message += `Email: ${hotelSettings.email_primary}\n`;
  message += `Telepon: ${hotelSettings.phone_primary}`;

  return message;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, sendEmail = true, sendWhatsApp = true } = await req.json();
    
    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Processing invoice for booking ${bookingId}`);

    // Generate invoice HTML
    const generateResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-invoice`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ bookingId })
      }
    );

    if (!generateResponse.ok) {
      const error = await generateResponse.json();
      throw new Error(`Failed to generate invoice: ${error.error}`);
    }

    const { html, invoiceNumber } = await generateResponse.json();

    // Fetch booking details for sending
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, rooms(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    const { data: hotelSettings } = await supabase
      .from('hotel_settings')
      .select('*')
      .single();

    const results: any = {
      success: true,
      invoiceNumber,
      emailSent: false,
      whatsappSent: false,
      errors: []
    };

    // Send email
    if (sendEmail) {
      try {
        const emailResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-invoice-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              recipientEmail: booking.guest_email,
              recipientName: booking.guest_name,
              invoiceHtml: html,
              invoiceNumber,
              hotelName: hotelSettings?.hotel_name
            })
          }
        );

        if (emailResponse.ok) {
          results.emailSent = true;
          console.log(`Email sent successfully to ${booking.guest_email}`);
        } else {
          const error = await emailResponse.json();
          results.errors.push(`Email error: ${error.error}`);
          console.error('Email sending failed:', error);
        }
      } catch (error: any) {
        results.errors.push(`Email error: ${error.message}`);
        console.error('Email sending error:', error);
      }
    }

    // Send WhatsApp
    if (sendWhatsApp && booking.guest_phone) {
      try {
        const whatsappMessage = formatInvoiceWhatsAppMessage({
          booking,
          room: booking.rooms,
          hotelSettings,
          invoiceNumber
        });

        const whatsappResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              phone: booking.guest_phone,
              message: whatsappMessage,
              type: 'invoice'
            })
          }
        );

        if (whatsappResponse.ok) {
          results.whatsappSent = true;
          console.log(`WhatsApp sent successfully to ${booking.guest_phone}`);
        } else {
          const error = await whatsappResponse.json();
          results.errors.push(`WhatsApp error: ${error.error}`);
          console.error('WhatsApp sending failed:', error);
        }
      } catch (error: any) {
        results.errors.push(`WhatsApp error: ${error.message}`);
        console.error('WhatsApp sending error:', error);
      }
    }

    // Log invoice sending
    const { error: logError } = await supabase
      .from('invoice_logs')
      .insert({
        booking_id: bookingId,
        invoice_number: invoiceNumber,
        sent_to_email: booking.guest_email,
        email_sent: results.emailSent,
        sent_to_whatsapp: booking.guest_phone,
        whatsapp_sent: results.whatsappSent,
        error_message: results.errors.length > 0 ? results.errors.join(', ') : null
      });

    if (logError) {
      console.error('Failed to log invoice:', logError);
    }

    // Update booking
    await supabase
      .from('bookings')
      .update({ 
        last_invoice_sent_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    console.log(`Invoice ${invoiceNumber} processed. Email: ${results.emailSent}, WhatsApp: ${results.whatsappSent}`);

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error sending invoice:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});