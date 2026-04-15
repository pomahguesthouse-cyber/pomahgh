/** Send a WhatsApp message via Fonnte API */
export async function sendWhatsApp(
  phone: string,
  message: string,
  fonnteApiKey: string,
): Promise<{ status: boolean; [key: string]: unknown }> {
  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': fonnteApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: phone,
      message,
      countryCode: '62',
    }),
  });
  return response.json();
}
