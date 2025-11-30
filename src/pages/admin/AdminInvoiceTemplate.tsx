import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Copy, Check } from "lucide-react";
import { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";
import { toast } from "sonner";

const VARIABLES = [
  { key: "hotel_name", label: "Nama Hotel", example: "Pomah Guesthouse" },
  { key: "hotel_address", label: "Alamat Hotel", example: "Jl. Dewi Sartika IV" },
  { key: "hotel_phone", label: "Telepon Hotel", example: "+62 123 456 7890" },
  { key: "hotel_email", label: "Email Hotel", example: "info@pomah.com" },
  { key: "booking_code", label: "Kode Booking", example: "PMH-ABC123" },
  { key: "guest_name", label: "Nama Tamu", example: "Budi Santoso" },
  { key: "guest_email", label: "Email Tamu", example: "budi@email.com" },
  { key: "guest_phone", label: "Telepon Tamu", example: "+62 812 3456 7890" },
  { key: "check_in_date", label: "Tanggal Check-in", example: "28 November 2024" },
  { key: "check_in_time", label: "Waktu Check-in", example: "14:00 WIB" },
  { key: "check_out_date", label: "Tanggal Check-out", example: "30 November 2024" },
  { key: "check_out_time", label: "Waktu Check-out", example: "12:00 WIB" },
  { key: "total_nights", label: "Total Malam", example: "2 malam" },
  { key: "num_guests", label: "Jumlah Tamu", example: "2 orang" },
  { key: "room_list", label: "Daftar Kamar", example: "• Deluxe #204 - Rp 800.000" },
  { key: "total_price", label: "Total Harga", example: "Rp 1.600.000" },
  { key: "payment_amount", label: "Jumlah Terbayar", example: "Rp 500.000" },
  { key: "remaining_balance", label: "Sisa Pembayaran", example: "Rp 1.100.000" },
  { key: "payment_status", label: "Status Pembayaran", example: "BELUM LUNAS" },
  { key: "bank_accounts", label: "Daftar Rekening", example: "BCA: 1234567890" },
  { key: "booking_status", label: "Status Booking", example: "CONFIRMED" },
];

export default function AdminInvoiceTemplate() {
  const { template, isLoading, updateTemplate, isUpdating, replaceVariables } = useInvoiceTemplate();
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Initialize whatsapp template when loaded
  useEffect(() => {
    if (template?.whatsapp_template) {
      setWhatsappTemplate(template.whatsapp_template);
    }
  }, [template]);

  const handleSave = () => {
    updateTemplate({ whatsapp_template: whatsappTemplate });
  };

  const handleCopyVariable = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedVar(key);
    toast.success(`Variable {{${key}}} disalin!`);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  // Create preview with example data
  const exampleVariables = VARIABLES.reduce((acc, v) => {
    acc[v.key] = v.example;
    return acc;
  }, {} as Record<string, string>);

  const previewMessage = replaceVariables(whatsappTemplate || template?.whatsapp_template || "", exampleVariables);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading template...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Template Invoice</h1>
        <p className="text-muted-foreground">
          Atur template pesan WhatsApp untuk invoice booking
        </p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="whatsapp">Template WhatsApp</TabsTrigger>
          <TabsTrigger value="variables">Variabel</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Pesan WhatsApp</CardTitle>
              <CardDescription>
                Gunakan variabel seperti {`{{booking_code}}`} untuk menampilkan data booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-template">Template Pesan</Label>
                <Textarea
                  id="whatsapp-template"
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Masukkan template pesan WhatsApp..."
                />
                <p className="text-xs text-muted-foreground">
                  💡 Gunakan * untuk <strong>bold</strong>, _ untuk <em>italic</em> di WhatsApp
                </p>
              </div>

              <Button onClick={handleSave} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? "Menyimpan..." : "Simpan Template"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview Pesan</CardTitle>
              <CardDescription>Preview dengan data contoh</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {previewMessage}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Variabel yang Tersedia</CardTitle>
              <CardDescription>
                Klik untuk menyalin variabel ke clipboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VARIABLES.map((variable) => (
                  <div
                    key={variable.key}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleCopyVariable(variable.key)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {`{{${variable.key}}}`}
                        </Badge>
                        {copiedVar === variable.key && (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {variable.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Contoh: {variable.example}
                      </p>
                    </div>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}