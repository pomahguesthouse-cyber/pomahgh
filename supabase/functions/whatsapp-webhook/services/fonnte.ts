/** Send a WhatsApp message via Fonnte API */
export async function sendWhatsApp(
  phone: string,
  message: string,
  fonnteApiKey: string,
): Promise<{ status: boolean; detail?: string; [key: string]: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
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
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown');
      console.error(`❌ Fonnte API error: HTTP ${response.status} - ${errorText}`);
      return { status: false, detail: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();

    // Fonnte returns { status: false, detail: "..." } on logical errors
    if (result.status === false) {
      console.error(`❌ Fonnte send failed: ${result.detail || JSON.stringify(result)}`);
    }

    return result;
  } catch (err) {
    clearTimeout(timeout);
    const errMsg = (err as Error).name === 'AbortError'
      ? 'Fonnte API timeout (15s)'
      : `Fonnte API error: ${(err as Error).message}`;
    console.error(`❌ ${errMsg}`);
    return { status: false, detail: errMsg };
  }
}
