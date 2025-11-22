import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, invoiceHtml, invoiceNumber, hotelName } = await req.json();

    if (!recipientEmail || !invoiceHtml || !invoiceNumber) {
      throw new Error("recipientEmail, invoiceHtml, and invoiceNumber are required");
    }

    console.log(`Sending invoice ${invoiceNumber} to ${recipientEmail}`);

    const emailResponse = await resend.emails.send({
      from: `${hotelName || 'Pomah Guesthouse'} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: `Invoice Booking ${invoiceNumber} - ${hotelName || 'Pomah Guesthouse'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #8B4513; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Invoice Booking</h1>
          </div>
          <div style="padding: 20px; background: #f5f5f5;">
            <p>Halo ${recipientName || 'Tamu yang terhormat'},</p>
            <p>Terima kasih telah melakukan booking di ${hotelName || 'Pomah Guesthouse'}!</p>
            <p>Berikut adalah invoice untuk booking Anda dengan nomor: <strong>${invoiceNumber}</strong></p>
            <p style="margin: 20px 0;">
              <a href="#" style="background: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Lihat Detail Invoice
              </a>
            </p>
          </div>
          ${invoiceHtml}
          <div style="padding: 20px; background: #f5f5f5; text-align: center; color: #666; font-size: 12px;">
            <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
            <p>Jika ada pertanyaan, silakan hubungi kami melalui kontak yang tertera pada invoice.</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        response: emailResponse
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});