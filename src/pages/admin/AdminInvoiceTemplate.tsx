import { useState, useEffect } from "react";
import { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

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
  { key: "bank_accounts", label: "Daftar Rekening", example: "BCA: 1234567890 (atau 'Lunas' jika sudah bayar)" },
  { key: "booking_status", label: "Status Booking", example: "CONFIRMED" },
];

const AdminInvoiceTemplate = () => {
  const { template, isLoading, updateTemplate, isUpdating, replaceVariables } = useInvoiceTemplate();
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#8B4513");
  const [secondaryColor, setSecondaryColor] = useState("#f8f4f0");
  const [showLogo, setShowLogo] = useState(true);
  const [showBankAccounts, setShowBankAccounts] = useState(true);
  const [footerText, setFooterText] = useState("Kami menantikan kedatangan Anda!");
  const [customNotes, setCustomNotes] = useState("");
  const [copiedVar, setCopiedVar] = useState("");

  useEffect(() => {
    if (template) {
      setWhatsappTemplate(template.whatsapp_template || "");
      setPrimaryColor(template.invoice_primary_color || "#8B4513");
      setSecondaryColor(template.invoice_secondary_color || "#f8f4f0");
      setShowLogo(template.show_logo ?? true);
      setShowBankAccounts(template.show_bank_accounts ?? true);
      setFooterText(template.footer_text || "Kami menantikan kedatangan Anda!");
      setCustomNotes(template.custom_notes || "");
    }
  }, [template]);

  const handleSaveWhatsApp = () => {
    updateTemplate({ whatsapp_template: whatsappTemplate });
  };

  const handleSaveVisual = () => {
    updateTemplate({ 
      invoice_primary_color: primaryColor,
      invoice_secondary_color: secondaryColor,
      show_logo: showLogo,
      show_bank_accounts: showBankAccounts,
      footer_text: footerText,
      custom_notes: customNotes
    });
  };

  const handleCopyVariable = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedVar(key);
    toast.success(`Variable {{${key}}} disalin!`);
    setTimeout(() => setCopiedVar(""), 2000);
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
      <Tabs defaultValue="template" className="w-full">
        <TabsList>
          <TabsTrigger value="template">Template WhatsApp</TabsTrigger>
          <TabsTrigger value="variables">Variabel</TabsTrigger>
          <TabsTrigger value="visual">Pengaturan Visual</TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle>Template Pesan WhatsApp</CardTitle>
              <CardDescription>
                Gunakan variabel seperti {`{{booking_code}}`} untuk menampilkan data booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <Label>Preview Pesan</Label>
                  <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {previewMessage}
                    </pre>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveWhatsApp} 
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle>Variabel yang Tersedia</CardTitle>
              <CardDescription>
                Klik untuk menyalin variabel ke clipboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VARIABLES.map((variable) => (
                  <div
                    key={variable.key}
                    onClick={() => handleCopyVariable(variable.key)}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
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
                      <p className="text-sm font-medium mt-1">{variable.label}</p>
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

        <TabsContent value="visual">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Visual Invoice</CardTitle>
              <CardDescription>
                Sesuaikan tampilan invoice HTML dan PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🎨 Warna Invoice</h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Warna Utama</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#8B4513"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Warna Sekunder</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#f8f4f0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📋 Pengaturan Tampilan</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tampilkan Logo Hotel</Label>
                    <p className="text-sm text-muted-foreground">
                      Menampilkan logo hotel di header invoice
                    </p>
                  </div>
                  <Switch
                    checked={showLogo}
                    onCheckedChange={setShowLogo}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tampilkan Informasi Bank</Label>
                    <p className="text-sm text-muted-foreground">
                      Menampilkan rekening bank (hanya jika belum lunas)
                    </p>
                  </div>
                  <Switch
                    checked={showBankAccounts}
                    onCheckedChange={setShowBankAccounts}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📝 Footer Text</h3>
                <div className="space-y-2">
                  <Label htmlFor="footer-text">Teks Footer</Label>
                  <Textarea
                    id="footer-text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Kami menantikan kedatangan Anda!"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📌 Catatan Khusus (Opsional)</h3>
                <div className="space-y-2">
                  <Label htmlFor="custom-notes">Catatan Tambahan</Label>
                  <Textarea
                    id="custom-notes"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Catatan tambahan yang akan ditampilkan di invoice..."
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    Catatan ini akan ditampilkan di bagian bawah invoice
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🔍 Preview</h3>
                <div 
                  className="border rounded-lg p-6 space-y-4"
                  style={{ 
                    backgroundColor: secondaryColor,
                    borderColor: primaryColor 
                  }}
                >
                  <div 
                    className="p-4 rounded text-white font-bold text-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {showLogo ? "🏨 LOGO HOTEL" : "INVOICE"}
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Preview tampilan invoice dengan warna yang dipilih
                  </div>
                  {customNotes && (
                    <div className="p-3 bg-background/50 rounded text-sm">
                      <strong>Catatan:</strong> {customNotes}
                    </div>
                  )}
                  <div className="text-center text-sm italic">
                    {footerText}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveVisual} 
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                💾 Simpan Pengaturan Visual
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInvoiceTemplate;
