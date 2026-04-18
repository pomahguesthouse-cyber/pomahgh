import { useState, useEffect } from "react";
import { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TestSendInvoiceCard } from "./TestSendInvoiceCard";

export const InvoiceSettingsPanel = () => {
  const { template, isLoading, updateTemplate, isUpdating } = useInvoiceTemplate();
  const { settings, updateSettings, isUpdating: isUpdatingHotel, uploadFile } = useHotelSettings();

  const [hotelName, setHotelName] = useState("");
  const [footer, setFooter] = useState("");
  const [deadline, setDeadline] = useState(24);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingQris, setUploadingQris] = useState(false);

  useEffect(() => {
    if (settings) setHotelName(settings.hotel_name || "");
    if (template) {
      setFooter(template.footer_text || "");
      setDeadline(template.payment_deadline_hours || 24);
    }
  }, [settings, template]);

  const handleQrisUpload = async () => {
    if (!qrisFile || !template?.id) return;
    setUploadingQris(true);
    try {
      const fileName = `qris-${Date.now()}.${qrisFile.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("qris-images")
        .upload(fileName, qrisFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("qris-images").getPublicUrl(fileName);
      updateTemplate({ qris_image_url: data.publicUrl });
      setQrisFile(null);
      toast.success("QRIS terunggah");
    } catch (e) {
      toast.error(`Gagal upload QRIS: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setUploadingQris(false);
    }
  };

  const handleSave = async () => {
    const hotelUpdates: Record<string, unknown> = { hotel_name: hotelName };
    if (logoFile) {
      const url = await uploadFile(logoFile, "invoice_logo");
      hotelUpdates.invoice_logo_url = url;
    }
    updateSettings(hotelUpdates);
    updateTemplate({ footer_text: footer, payment_deadline_hours: deadline });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-6">Memuat pengaturan...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Bisnis</CardTitle>
          <CardDescription>Data ini muncul di header invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nama Bisnis</Label>
            <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} />
          </div>
          <div>
            <Label>Logo Invoice</Label>
            {settings?.invoice_logo_url && (
              <img src={settings.invoice_logo_url} alt="Logo" className="h-16 object-contain my-2" />
            )}
            <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QRIS</CardTitle>
          <CardDescription>Gambar QRIS statis untuk ditampilkan di invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template?.qris_image_url && (
            <div className="flex items-start gap-4">
              <img src={template.qris_image_url} alt="QRIS" className="h-40 w-40 object-contain border rounded" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTemplate({ qris_image_url: null })}
              >
                <X className="h-4 w-4 mr-2" />Hapus QRIS
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input type="file" accept="image/*" onChange={(e) => setQrisFile(e.target.files?.[0] || null)} />
            <Button onClick={handleQrisUpload} disabled={!qrisFile || uploadingQris}>
              {uploadingQris ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            QRIS hanya ditampilkan di invoice jika opsi <strong>Show QRIS</strong> aktif (Tab Template).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pembayaran & Footer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Batas Waktu Pembayaran (jam)</Label>
            <Input
              type="number"
              min={1}
              max={168}
              value={deadline}
              onChange={(e) => setDeadline(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">Default 24 jam. Booking yang tidak dibayar dalam waktu ini otomatis dibatalkan.</p>
          </div>
          <div>
            <Label>Pesan Footer Invoice</Label>
            <Textarea rows={3} value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Detail rekening bank dikelola di <strong>Bank Accounts</strong> menu utama. Dapat juga diatur via tab ini di kemudian hari.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isUpdating || isUpdatingHotel}>
        {(isUpdating || isUpdatingHotel) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Simpan Pengaturan
      </Button>
    </div>
  );
};
