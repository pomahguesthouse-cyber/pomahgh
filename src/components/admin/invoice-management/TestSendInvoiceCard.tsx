import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Mail, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Test sender: pick a booking, override email, send a test invoice.
 * Useful to verify Resend integration end-to-end.
 */
export const TestSendInvoiceCard = () => {
  const [bookingId, setBookingId] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState<"email" | "wa" | "preview" | null>(null);
  const [lastUrl, setLastUrl] = useState<string>("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["test-invoice-bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_code, guest_name, guest_email, guest_phone, total_price")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const selected = bookings?.find((b) => b.id === bookingId);

  const runTest = async (mode: "email" | "wa" | "preview") => {
    if (!bookingId) {
      toast.error("Pilih booking dulu");
      return;
    }
    if (mode === "email" && !testEmail) {
      toast.error("Masukkan email test");
      return;
    }
    if (mode === "wa" && !testPhone) {
      toast.error("Masukkan nomor WhatsApp test");
      return;
    }
    setSending(mode);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: {
          booking_id: bookingId,
          send_email: mode === "email",
          send_whatsapp: mode === "wa",
          override_email: mode === "email" ? testEmail : undefined,
          override_phone: mode === "wa" ? testPhone : undefined,
        },
      });
      if (error) throw error;

      if (data?.invoice_pdf_url) setLastUrl(data.invoice_pdf_url);
      if (mode === "preview") {
        toast.success("PDF berhasil di-generate");
      } else if (mode === "email") {
        if (data?.email_sent) toast.success(`📧 Email test terkirim ke ${testEmail}`);
        else toast.error("Gagal kirim email test (cek API key Resend)");
      }
    } catch (e) {
      toast.error(`Test gagal: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setSending(null);
    }
  };

  return (
    <Card className="border-dashed border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Test Kirim PDF Invoice
        </CardTitle>
        <CardDescription>
          Verifikasi end-to-end generate PDF + integrasi Email (Resend) tanpa mengganggu data tamu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Pilih Booking Sample</Label>
          <Select value={bookingId} onValueChange={setBookingId} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Memuat..." : "Pilih booking..."} />
            </SelectTrigger>
            <SelectContent>
              {bookings?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.booking_code} · {b.guest_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <p className="text-xs text-muted-foreground mt-1">
              Aktual: {selected.guest_email} {selected.guest_phone ? `· ${selected.guest_phone}` : ""}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Email Test (override)</Label>
            <Input
              type="email"
              placeholder="email@anda.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => runTest("preview")}
            disabled={!bookingId || sending !== null}
          >
            {sending === "preview" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Generate PDF Saja
          </Button>
          <Button
            variant="outline"
            onClick={() => runTest("email")}
            disabled={!bookingId || !testEmail || sending !== null}
          >
            {sending === "email" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Test Kirim Email
          </Button>
        </div>

        {lastUrl && (
          <div className="text-xs bg-muted p-2 rounded flex items-center justify-between gap-2">
            <span className="truncate">PDF: {lastUrl}</span>
            <Button asChild size="sm" variant="ghost">
              <a href={lastUrl} target="_blank" rel="noopener noreferrer">Buka</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
