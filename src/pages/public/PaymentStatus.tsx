import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PaymentStatus = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("loading");
  const [bookingCode, setBookingCode] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (bookingId) checkStatus();
  }, [bookingId]);

  const checkStatus = async () => {
    if (!bookingId) return;
    setIsRefreshing(true);

    // First check local payment_transactions
    const { data: txn } = await supabase
      .from("payment_transactions")
      .select("status, merchant_order_id")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get booking code
    const { data: booking } = await supabase
      .from("bookings")
      .select("booking_code, payment_status")
      .eq("id", bookingId)
      .single();

    if (booking) setBookingCode(booking.booking_code);

    if (booking?.payment_status === "paid" || txn?.status === "paid") {
      setStatus("paid");
    } else if (txn) {
      // Also try checking with Duitku
      try {
        const { data: checkResult } = await supabase.functions.invoke("duitku-check-status", {
          body: { merchant_order_id: txn.merchant_order_id },
        });
        setStatus(checkResult?.status || txn.status);
      } catch {
        setStatus(txn.status);
      }
    } else {
      setStatus("not_found");
    }
    setIsRefreshing(false);
  };

  const getStatusContent = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Loader2 className="w-16 h-16 animate-spin text-primary" />,
          title: "Mengecek Status...",
          description: "Mohon tunggu sebentar",
          color: "text-primary",
        };
      case "paid":
        return {
          icon: <CheckCircle2 className="w-16 h-16 text-primary" />,
          title: "Pembayaran Berhasil!",
          description: `Booking ${bookingCode} telah dikonfirmasi. Terima kasih!`,
          color: "text-primary",
        };
      case "pending":
        return {
          icon: <Clock className="w-16 h-16 text-accent-foreground" />,
          title: "Menunggu Pembayaran",
          description: "Pembayaran Anda sedang diproses. Silakan selesaikan pembayaran.",
          color: "text-accent-foreground",
        };
      case "expired":
        return {
          icon: <XCircle className="w-16 h-16 text-muted-foreground" />,
          title: "Pembayaran Kedaluwarsa",
          description: "Waktu pembayaran telah habis. Silakan buat transaksi baru.",
          color: "text-muted-foreground",
        };
      case "failed":
        return {
          icon: <XCircle className="w-16 h-16 text-destructive" />,
          title: "Pembayaran Gagal",
          description: "Terjadi kesalahan. Silakan coba lagi.",
          color: "text-destructive",
        };
      default:
        return {
          icon: <XCircle className="w-16 h-16 text-muted-foreground" />,
          title: "Status Tidak Diketahui",
          description: "Tidak dapat menemukan informasi pembayaran.",
          color: "text-muted-foreground",
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="flex justify-center">{content.icon}</div>
          <div className="space-y-2">
            <h2 className={`text-xl font-bold ${content.color}`}>{content.title}</h2>
            <p className="text-muted-foreground text-sm">{content.description}</p>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {status === "pending" && (
              <Button
                onClick={checkStatus}
                variant="outline"
                disabled={isRefreshing}
                className="w-full"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Cek Ulang Status
              </Button>
            )}

            {(status === "expired" || status === "failed") && bookingId && (
              <Button
                onClick={() => navigate(`/payment/${bookingId}`)}
                className="w-full"
              >
                Bayar Ulang
              </Button>
            )}

            <Button
              variant={status === "paid" ? "default" : "ghost"}
              onClick={() => navigate("/")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStatus;
