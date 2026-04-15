

# Sinkronisasi Flow Multi-Agent Sesuai Diagram

## Gap Analysis
Orchestrator saat ini hanya routing ke FAQ dan Booking. Complaint Agent, Payment Agent, error escalation, dan UNKNOWN intent belum terimplementasi di webhook layer.

## Perubahan

### 1. Update `detectIntent()` — 4 intent types
Tambahkan deteksi `complaint` (kata emosi: marah, kecewa, komplain, parah, dll) dan `payment` (bukti transfer, sudah bayar, invoice, dll). Default UNKNOWN → `faq` (bukan booking).

```text
faq       → FAQ Agent → Knowledge Base
booking   → Booking Agent → Booking DB
complaint → Complaint Agent → Human Staff (Super Admin)
payment   → Payment Agent → validasi pembayaran
unknown   → FAQ Agent (fallback)
```

### 2. Buat `complaint.ts` di whatsapp-webhook/agents/
- Deteksi sentimen negatif dan tingkat urgensi (low/medium/high/critical)
- Kirim respons empatis ke tamu
- Notifikasi semua Super Admin via WhatsApp (menggunakan Fonnte)
- Log ke conversation

### 3. Buat `payment.ts` di whatsapp-webhook/agents/
- Handle pesan terkait pembayaran (bukti transfer, status bayar, invoice)
- Panggil chatbot AI dengan payment-specific tools
- Setelah bukti diterima → notify manager untuk validasi

### 4. Update `orchestrator.ts`
- Import dan routing ke `handleComplaint` dan `handlePayment`
- Tambahkan intent `complaint` dan `payment` di flow routing
- Tambahkan error handling: jika agent throw error → log + kirim notifikasi ke Human Staff (manager)
- UNKNOWN intent → FAQ Agent (bukan Booking)

### 5. Update `booking.ts` — Payment handoff
- Setelah `create_booking_draft` berhasil → return status yang trigger Payment Agent
- Orchestrator mendeteksi handoff dan meneruskan ke Payment Agent

### 6. Error → Human Staff escalation
- Wrap setiap agent call dalam try-catch
- Jika error: log, kirim notifikasi WhatsApp ke Super Admin, balas tamu "Maaf ada kendala, tim kami akan menghubungi Anda"

## File yang dibuat/diubah
- **Buat**: `supabase/functions/whatsapp-webhook/agents/complaint.ts`
- **Buat**: `supabase/functions/whatsapp-webhook/agents/payment.ts`
- **Edit**: `supabase/functions/whatsapp-webhook/agents/orchestrator.ts`
- **Edit**: `supabase/functions/whatsapp-webhook/agents/booking.ts` (payment handoff)

## Arsitektur Final
```text
User → WhatsApp API → Webhook → Load Memory → Orchestrator
                                                    │
                                              Intent Agent
                                         ┌──────┼──────┬──────────┐
                                      FAQ    BOOKING  COMPLAINT  PAYMENT
                                       │        │        │          │
                                   FAQ Agent  Booking  Complaint  Payment
                                       │      Agent    Agent      Agent
                                  Knowledge    │  │       │         │
                                   Base     Pricing Payment    Manager
                                            Agent  Agent     Validasi
                                              │      │
                                          Booking DB  │
                                                      │
                              Error from any agent → Human Staff (Super Admin)
```

