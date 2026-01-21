import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, ImageIcon, AlertCircle } from "lucide-react";

interface BookingInfo {
  id: string;
  booking_code: string;
  guest_name: string;
  total_price: number;
  status: string;
  payment_proof_url: string | null;
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

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return;

      // Fetch booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id, booking_code, guest_name, total_price, status, payment_proof_url")
        .eq("id", bookingId)
        .single();

      if (bookingError) {
        console.error("Error fetching booking:", bookingError);
        toast.error("Booking tidak ditemukan");
      } else {
        setBooking(bookingData);
        if (bookingData.payment_proof_url) {
          setSubmitted(true);
        }
      }

      // Fetch hotel settings
      const { data: settingsData } = await supabase
        .from("hotel_settings")
        .select("logo_url, hotel_name")
        .single();

      if (settingsData) {
        setHotelLogo(settingsData.logo_url);
        setHotelName(settingsData.hotel_name);
      }

      setLoading(false);
    };

    fetchData();
  }, [bookingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }

      // Validate file type
      if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(selectedFile.type)) {
        toast.error("Format file harus JPG, PNG, atau WebP");
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Pilih file bukti transfer");
      return;
    }

    if (!accountHolder.trim()) {
      toast.error("Masukkan nama pemilik rekening");
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${bookingId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // Update booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_proof_url: urlData.publicUrl,
          payment_account_holder: accountHolder.trim(),
          status: "waiting_confirmation",
        })
        .eq("id", bookingId);

      if (updateError) {
        throw updateError;
      }

      toast.success("Bukti pembayaran berhasil dikirim!");
      setSubmitted(true);
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      toast.error("Gagal mengirim bukti pembayaran. Silakan coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Booking Tidak Ditemukan</h2>
            <p className="text-muted-foreground mt-2">
              Link yang Anda gunakan tidak valid atau booking sudah tidak tersedia.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold">Terima Kasih!</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Bukti pembayaran Anda sudah kami terima dan sedang diproses.
              <br />
              Konfirmasi akan dikirim via WhatsApp.
            </p>
            <div className="mt-6 bg-stone-100 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Kode Booking</p>
              <p className="font-mono font-bold text-lg">{booking.booking_code}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center pb-4">
          {hotelLogo && (
            <img
              src={hotelLogo}
              alt={hotelName}
              className="h-14 mx-auto mb-3 object-contain"
            />
          )}
          <CardTitle className="text-xl">Konfirmasi Pembayaran</CardTitle>
          <CardDescription>
            Booking: <span className="font-mono font-semibold">{booking.booking_code}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Booking Info */}
          <div className="bg-stone-50 rounded-xl p-4 mb-6">
            <div className="mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Nama Tamu</p>
              <p className="font-medium text-base">{booking.guest_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pembayaran</p>
              <p className="text-2xl font-bold text-primary">
                Rp {booking.total_price.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* File Upload */}
            <div>
              <Label className="text-sm font-medium">Bukti Transfer</Label>
              <div className="mt-2">
                <label className="block">
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      preview
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-primary/50"
                    }`}
                  >
                    {preview ? (
                      <div className="space-y-3">
                        <img
                          src={preview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-lg object-contain"
                        />
                        <p className="text-sm text-muted-foreground">
                          Tap untuk ganti gambar
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium">Upload Bukti Transfer</p>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG, atau WebP (Max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Account Holder Name */}
            <div>
              <Label htmlFor="accountHolder" className="text-sm font-medium">
                Nama Pemilik Rekening
              </Label>
              <Input
                id="accountHolder"
                type="text"
                placeholder="Masukkan nama sesuai rekening"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={uploading || !file || !accountHolder.trim()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
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
