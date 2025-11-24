import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";
import { Loader2, Palette, Type, Layout, FileText, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function AdminInvoiceTemplate() {
  const { template, isLoading, updateTemplate, isUpdating, resetTemplate, isResetting } = useInvoiceTemplate();
  const [localTemplate, setLocalTemplate] = useState(template);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center text-muted-foreground">
        Template tidak ditemukan. Silakan refresh halaman.
      </div>
    );
  }

  const handleUpdate = async (updates: any) => {
    const newTemplate = { ...localTemplate, ...updates };
    setLocalTemplate(newTemplate);
    await updateTemplate(updates);
  };

  const handleReset = async () => {
    if (confirm("Apakah Anda yakin ingin reset template ke default?")) {
      await resetTemplate();
      setLocalTemplate(template);
    }
  };

  const currentTemplate = localTemplate || template;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Invoice</h2>
          <p className="text-muted-foreground">Customize tampilan invoice Anda</p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset ke Default
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="colors">
                <Palette className="h-4 w-4 mr-1" />
                Warna
              </TabsTrigger>
              <TabsTrigger value="fonts">
                <Type className="h-4 w-4 mr-1" />
                Font
              </TabsTrigger>
              <TabsTrigger value="layout">
                <Layout className="h-4 w-4 mr-1" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="content">
                <FileText className="h-4 w-4 mr-1" />
                Konten
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skema Warna</CardTitle>
                  <CardDescription>Sesuaikan warna invoice</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <Input
                        type="color"
                        value={currentTemplate.primary_color}
                        onChange={(e) => handleUpdate({ primary_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <Input
                        type="color"
                        value={currentTemplate.secondary_color}
                        onChange={(e) => handleUpdate({ secondary_color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <Input
                        type="color"
                        value={currentTemplate.text_color}
                        onChange={(e) => handleUpdate({ text_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Background</Label>
                      <Input
                        type="color"
                        value={currentTemplate.background_color}
                        onChange={(e) => handleUpdate({ background_color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <Input
                      type="color"
                      value={currentTemplate.accent_color}
                      onChange={(e) => handleUpdate({ accent_color: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fonts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tipografi</CardTitle>
                  <CardDescription>Atur font dan ukuran</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={currentTemplate.font_family}
                      onValueChange={(value) => handleUpdate({ font_family: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Base Font Size (pt)</Label>
                      <Input
                        type="number"
                        min="8"
                        max="16"
                        value={currentTemplate.font_size_base}
                        onChange={(e) => handleUpdate({ font_size_base: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Heading Size (pt)</Label>
                      <Input
                        type="number"
                        min="16"
                        max="32"
                        value={currentTemplate.font_size_heading}
                        onChange={(e) => handleUpdate({ font_size_heading: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Layout & Spacing</CardTitle>
                  <CardDescription>Atur tampilan dan jarak</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Layout Style</Label>
                    <Select
                      value={currentTemplate.layout_style}
                      onValueChange={(value) => handleUpdate({ layout_style: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Border Style</Label>
                    <Select
                      value={currentTemplate.border_style}
                      onValueChange={(value) => handleUpdate({ border_style: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Spacing</Label>
                    <Select
                      value={currentTemplate.spacing}
                      onValueChange={(value) => handleUpdate({ spacing: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Show Logo</Label>
                      <Switch
                        checked={currentTemplate.show_logo}
                        onCheckedChange={(checked) => handleUpdate({ show_logo: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Section Visibility</CardTitle>
                  <CardDescription>Tampilkan/sembunyikan bagian</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Guest Details</Label>
                    <Switch
                      checked={currentTemplate.show_guest_details}
                      onCheckedChange={(checked) => handleUpdate({ show_guest_details: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Hotel Details</Label>
                    <Switch
                      checked={currentTemplate.show_hotel_details}
                      onCheckedChange={(checked) => handleUpdate({ show_hotel_details: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Special Requests</Label>
                    <Switch
                      checked={currentTemplate.show_special_requests}
                      onCheckedChange={(checked) => handleUpdate({ show_special_requests: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Payment Instructions</Label>
                    <Switch
                      checked={currentTemplate.show_payment_instructions}
                      onCheckedChange={(checked) => handleUpdate({ show_payment_instructions: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Text</CardTitle>
                  <CardDescription>Tambahkan teks kustom</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Custom Header Text</Label>
                    <Textarea
                      placeholder="Teks di bagian atas invoice (opsional)"
                      value={currentTemplate.custom_header_text || ""}
                      onChange={(e) => handleUpdate({ custom_header_text: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Title</Label>
                    <Input
                      placeholder="Instruksi Pembayaran"
                      value={currentTemplate.payment_title}
                      onChange={(e) => handleUpdate({ payment_title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Footer Text</Label>
                    <Textarea
                      placeholder="Teks di bagian bawah invoice (opsional)"
                      value={currentTemplate.custom_footer_text || ""}
                      onChange={(e) => handleUpdate({ custom_footer_text: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Terms & Conditions</Label>
                    <Textarea
                      placeholder="Syarat dan ketentuan (opsional)"
                      value={currentTemplate.terms_and_conditions || ""}
                      onChange={(e) => handleUpdate({ terms_and_conditions: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Preview akan ditampilkan dengan data sample
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="text-center text-sm text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-2" />
                  <p>Preview akan update otomatis saat Anda</p>
                  <p>mengubah pengaturan template</p>
                  <p className="mt-4 text-xs">
                    Untuk melihat preview lengkap, buka halaman <br />
                    Bookings dan klik "Send Invoice"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
