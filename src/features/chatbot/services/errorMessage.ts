export function getChatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("429") || message.includes("rate limit")) {
    return "Maaf, sedang ada banyak permintaan. Silakan coba lagi dalam beberapa saat.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Koneksi sedang bermasalah. Silakan coba lagi.";
  }

  return "Maaf, terjadi kesalahan. Silakan coba lagi.";
}
