import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye, FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { InvoicePreviewDialog } from "@/components/InvoicePreviewDialog";

type PaymentStatus = "all" | "pending" | "paid" | "failed";

interface BookingRow {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  total_price: number;
  payment_status: string | null;
  payment_proof_url: string | null;
  created_at: string;
  status: string;
}

export const PaymentMonitorPanel = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PaymentStatus>("all");
  const [search, setSearch] = useState("");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<BookingRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [invoiceFor, setInvoiceFor] = useState<BookingRow | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["payment-monitor", filter],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, booking_code, guest_name, guest_email, guest_phone, total_price, payment_status, payment_proof_url, created_at, status")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter === "pending") q = q.in("payment_status", ["pending", "unpaid"]);
      if (filter === "paid") q = q.in("payment_status", ["paid", "lunas"]);
      if (filter === "failed") q = q.in("payment_status", ["failed", "expired"]);
      const { data, error } = await q;
      if (error) throw error;
      return data as BookingRow[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (booking: BookingRow) => {
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: "paid", status: "confirmed" })
        .eq("id", booking.id);
      if (error) throw error;
      // Notify guest
      await supabase.functions.invoke("notify-payment-decision", {
        body: { booking_id: booking.id, decision: "approve" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-monitor"] });
      toast.success("Pembayaran disetujui & tamu dinotifikasi");
    },
    onError: (e) => toast.error(`Gagal: ${e instanceof Error ? e.message : "error"}`),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ booking, reason }: { booking: BookingRow; reason: string }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: "failed", cancellation_reason: reason })
        .eq("id", booking.id);
      if (error) throw error;
      await supabase.functions.invoke("notify-payment-decision", {
        body: { booking_id: booking.id, decision: "reject", reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-monitor"] });
      setRejectDialog(null);
      setRejectReason("");
      toast.success("Pembayaran ditolak & tamu dinotifikasi");
    },
    onError: (e) => toast.error(`Gagal: ${e instanceof Error ? e.message : "error"}`),
  });

  const filteredBookings = bookings?.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.booking_code.toLowerCase().includes(s) ||
      b.guest_name.toLowerCase().includes(s) ||
      b.guest_email.toLowerCase().includes(s)
    );
  });

  const statusBadge = (s: string | null) => {
    if (s === "paid" || s === "lunas") return <Badge className="bg-emerald-600">✅ Lunas</Badge>;
    if (s === "failed" || s === "expired") return <Badge variant="destructive">❌ Gagal</Badge>;
    if (s === "partial" || s === "down_payment") return <Badge className="bg-amber-500">⏳ DP</Badge>;
    return <Badge variant="secondary">⏱ Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Daftar Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as PaymentStatus)}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kode/nama/email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : !filteredBookings || filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Tidak ada booking.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 px-2">Booking ID</th>
                    <th className="py-2 px-2">Tamu</th>
                    <th className="py-2 px-2">Total</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Bukti</th>
                    <th className="py-2 px-2">Tanggal</th>
                    <th className="py-2 px-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2 font-mono text-xs">{b.booking_code}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{b.guest_name}</div>
                        <div className="text-xs text-muted-foreground">{b.guest_email}</div>
                      </td>
                      <td className="py-2 px-2 font-semibold">{formatRupiahID(b.total_price)}</td>
                      <td className="py-2 px-2">{statusBadge(b.payment_status)}</td>
                      <td className="py-2 px-2">
                        {b.payment_proof_url ? (
                          <button onClick={() => setProofPreview(b.payment_proof_url)} className="hover:opacity-80">
                            <img src={b.payment_proof_url} alt="bukti" className="h-10 w-10 object-cover rounded border" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {format(new Date(b.created_at), "dd MMM, HH:mm", { locale: idLocale })}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setInvoiceFor(b)} title="Invoice">
                            <FileText className="h-4 w-4" />
                          </Button>
                          {b.payment_status !== "paid" && b.payment_status !== "lunas" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-600 hover:text-emerald-700"
                                onClick={() => approveMutation.mutate(b)}
                                disabled={approveMutation.isPending}
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setRejectDialog(b)}
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proof preview */}
      <Dialog open={!!proofPreview} onOpenChange={() => setProofPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bukti Pembayaran</DialogTitle></DialogHeader>
          {proofPreview && <img src={proofPreview} alt="bukti" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tolak Pembayaran</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Alasan penolakan (akan dikirim ke tamu)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectDialog && rejectMutation.mutate({ booking: rejectDialog, reason: rejectReason })}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Tolak & Notifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice preview */}
      {invoiceFor && (
        <InvoicePreviewDialog
          open={!!invoiceFor}
          onOpenChange={(o) => !o && setInvoiceFor(null)}
          bookingId={invoiceFor.id}
          guestName={invoiceFor.guest_name}
          guestEmail={invoiceFor.guest_email}
          guestPhone={invoiceFor.guest_phone}
          bookingCode={invoiceFor.booking_code}
        />
      )}
    </div>
  );
};
