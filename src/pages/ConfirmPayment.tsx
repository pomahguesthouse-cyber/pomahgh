import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, ImageIcon, AlertCircle, Trash2 } from "lucide-react";
import { v4 as uuid } from "uuid";

interface BookingInfo {
  id: string;
  booking_code: string;
  guest_name: string;
  total_price: number;
  status: string;
  payment_proof_path: string | null;
}

const ConfirmPayment = () => {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [accountHolder, setAccountHolder] = useState("");

  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [hotelLogo, setHotelLogo] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState("Hotel");

  // ================= FETCH DATA =================
  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return;

      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("id, booking_code, guest_name, total_price, status, payment_proof_path")
        .eq("id", bookingId)
        .single();

      if (error || !bookingData) {
        toast.error("Booking tidak ditemukan");
        setLoading(false);
        return;
      }

      setBooking(bookingData);
      if (bookingData.payment_proof_path) {
        setSubmitted(true);
      }

      const { data: settings } = await supabase.from("hotel_settings").select("logo_url, hotel_name").single();

      if (settings) {
        setHotelLogo(settings.logo_url);
        setHotelName(settings.hotel_name);
      }

      setLoading(false);
    };

    fetchData();
  }, [bookingId]);

  // ================= FILE HANDLER =================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      toast.error("Format harus JPG, PNG, atau WebP");
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const resetImage = () => {
    setFile(null);
    setPreview(null);
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || uploading) return;

    if (booking.status !== "pending_payment") {
      toast.error("Booking ini tidak menerima pembayaran");
      return;
    }

    if (!file || !accountHolder.trim()) {
      toast.error("Lengkapi data terlebih dahulu");
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const filePath = `${booking.id}/${uuid()}.${ext}`;

      // Upload PRIVATE
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) throw uploadError;

      // Update booking (SIMPAN PATH, BUKAN URL)
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_proof_path: filePath,
          payment_account_holder: accountHolder.trim(),
          status: "waiting_confirmation",
        })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      toast.success("Bukti pembayaran berhasil dikirim");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim bukti pembayaran");
    } finally {
      setUploading(false);
    }
  };

  // ================= UI STATES =================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <AlertCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Booking Tidak Ditemukan</h2>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Terima Kasih!</h2>
          <p className="text-muted-foreground mt-2">Bukti pembayaran sedang diverifikasi.</p>
          <div className="mt-4 bg-stone-100 rounded-lg p-3">
            <p className="text-sm">Kode Booking</p>
            <p className="font-mono font-bold">{booking.booking_code}</p>
          </div>
        </Card>
      </div>
    );
  }

  // ================= FORM =================
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          {hotelLogo && <img src={hotelLogo} alt={hotelName} className="h-12 mx-auto" />}
          <CardTitle>Konfirmasi Pembayaran</CardTitle>
          <CardDescription>
            Booking: <span className="font-mono">{booking.booking_code}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Upload */}
            <div>
              <Label>Bukti Transfer</Label>
              <label className="block mt-2 cursor-pointer">
                <div className="border-2 border-dashed rounded-xl p-5 text-center">
                  {preview ? (
                    <>
                      <img src={preview} className="max-h-48 mx-auto rounded-lg" />
                      <Button type="button" variant="ghost" size="sm" onClick={resetImage} className="mt-2">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Ganti Gambar
                      </Button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm mt-2">Upload bukti transfer</p>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {/* Account Holder */}
            <div>
              <Label>Nama Pemilik Rekening</Label>
              <Input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Sesuai rekening"
                className="mt-2"
              />
            </div>

            <Button type="submit" className="w-full h-12" disabled={uploading || !file || !accountHolder.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Kirim Bukti Pembayaran
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmPayment;
