import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useHotelSettings, WhatsAppContact } from "@/hooks/useHotelSettings";
import { Loader2, Upload, Plus, Trash2, MessageSquare, Phone, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  const { settings, isLoading, updateSettings, isUpdating, uploadFile } = useHotelSettings();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // WhatsApp contact management
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactLabel, setNewContactLabel] = useState("");
  
  // Whitelist management
  const [newWhitelistNumber, setNewWhitelistNumber] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center text-muted-foreground">No settings found</div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates: Record<string, any> = {};

    formData.forEach((value, key) => {
      if (value && value !== "") {
        updates[key] = value;
      }
    });

    try {
      setIsUploading(true);

      if (logoFile) {
        const logoUrl = await uploadFile(logoFile, "logo");
        updates.logo_url = logoUrl;
      }

      if (faviconFile) {
        const faviconUrl = await uploadFile(faviconFile, "favicon");
        updates.favicon_url = faviconUrl;
      }

      updateSettings(updates);
      setLogoFile(null);
      setFaviconFile(null);
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Main details about your hotel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel_name">Hotel Name</Label>
                  <Input id="hotel_name" name="hotel_name" defaultValue={settings.hotel_name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" name="tagline" defaultValue={settings.tagline || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea id="description" name="description" defaultValue={settings.description || ""} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="about_us">About Us</Label>
                  <Textarea id="about_us" name="about_us" defaultValue={settings.about_us || ""} rows={6} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>How guests can reach you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" defaultValue={settings.address} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" defaultValue={settings.city || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input id="state" name="state" defaultValue={settings.state || ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input id="postal_code" name="postal_code" defaultValue={settings.postal_code || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" name="country" defaultValue={settings.country || ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_primary">Primary Phone</Label>
                    <Input id="phone_primary" name="phone_primary" defaultValue={settings.phone_primary || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_secondary">Secondary Phone</Label>
                    <Input id="phone_secondary" name="phone_secondary" defaultValue={settings.phone_secondary || ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email_primary">Primary Email</Label>
                    <Input id="email_primary" name="email_primary" type="email" defaultValue={settings.email_primary || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_reservations">Reservations Email</Label>
                    <Input id="email_reservations" name="email_reservations" type="email" defaultValue={settings.email_reservations || ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                  <Input id="whatsapp_number" name="whatsapp_number" defaultValue={settings.whatsapp_number || ""} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Location Details</CardTitle>
                <CardDescription>Set your hotel's location for map display</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input 
                      id="latitude" 
                      name="latitude" 
                      type="number" 
                      step="any"
                      defaultValue={settings.latitude || ""} 
                      placeholder="e.g. -8.6705"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input 
                      id="longitude" 
                      name="longitude" 
                      type="number" 
                      step="any"
                      defaultValue={settings.longitude || ""} 
                      placeholder="e.g. 115.2126"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tip: You can find your coordinates on Google Maps by right-clicking on your location.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Branding & Visual Identity</CardTitle>
                <CardDescription>Customize your hotel's look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo</Label>
                  {settings.logo_url && (
                    <div className="mb-2">
                      <img src={settings.logo_url} alt="Current logo" className="h-16 object-contain" />
                    </div>
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  {logoFile && <p className="text-sm text-muted-foreground">Selected: {logoFile.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon">Favicon</Label>
                  {settings.favicon_url && (
                    <div className="mb-2">
                      <img src={settings.favicon_url} alt="Current favicon" className="h-8 object-contain" />
                    </div>
                  )}
                  <Input
                    id="favicon"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                  />
                  {faviconFile && <p className="text-sm text-muted-foreground">Selected: {faviconFile.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <Input id="primary_color" name="primary_color" type="color" defaultValue={settings.primary_color || "#8B4513"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <Input id="secondary_color" name="secondary_color" type="color" defaultValue={settings.secondary_color || "#D2691E"} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Social Media</CardTitle>
                <CardDescription>Connect your social media profiles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook_url">Facebook URL</Label>
                  <Input id="facebook_url" name="facebook_url" type="url" defaultValue={settings.facebook_url || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram URL</Label>
                  <Input id="instagram_url" name="instagram_url" type="url" defaultValue={settings.instagram_url || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter_url">Twitter URL</Label>
                  <Input id="twitter_url" name="twitter_url" type="url" defaultValue={settings.twitter_url || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok_url">TikTok URL</Label>
                  <Input id="tiktok_url" name="tiktok_url" type="url" defaultValue={settings.tiktok_url || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube_url">YouTube URL</Label>
                  <Input id="youtube_url" name="youtube_url" type="url" defaultValue={settings.youtube_url || ""} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Settings</CardTitle>
                <CardDescription>Operating hours and financial settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="check_in_time">Check-in Time</Label>
                    <Input id="check_in_time" name="check_in_time" type="time" defaultValue={settings.check_in_time || "14:00"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check_out_time">Check-out Time</Label>
                    <Input id="check_out_time" name="check_out_time" type="time" defaultValue={settings.check_out_time || "12:00"} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reception_hours_start">Reception Opens</Label>
                    <Input id="reception_hours_start" name="reception_hours_start" type="time" defaultValue={settings.reception_hours_start || "07:00"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reception_hours_end">Reception Closes</Label>
                    <Input id="reception_hours_end" name="reception_hours_end" type="time" defaultValue={settings.reception_hours_end || "22:00"} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency_code">Currency Code</Label>
                    <Input id="currency_code" name="currency_code" defaultValue={settings.currency_code || "IDR"} placeholder="IDR" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency_symbol">Currency Symbol</Label>
                    <Input id="currency_symbol" name="currency_symbol" defaultValue={settings.currency_symbol || "Rp"} placeholder="Rp" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input id="tax_rate" name="tax_rate" type="number" step="0.01" defaultValue={settings.tax_rate || 0} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_name">Tax Name</Label>
                    <Input id="tax_name" name="tax_name" defaultValue={settings.tax_name || "Tax"} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_stay_nights">Minimum Stay (Nights)</Label>
                    <Input id="min_stay_nights" name="min_stay_nights" type="number" min="1" defaultValue={settings.min_stay_nights || 1} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_stay_nights">Maximum Stay (Nights)</Label>
                    <Input id="max_stay_nights" name="max_stay_nights" type="number" min="1" defaultValue={settings.max_stay_nights || 30} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kebijakan Hotel</CardTitle>
                <CardDescription>Atur kebijakan dan peraturan hotel yang harus disetujui tamu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle Enable */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="space-y-1">
                    <Label htmlFor="hotel_policies_enabled">Tampilkan Kebijakan Hotel</Label>
                    <p className="text-sm text-muted-foreground">
                      Aktifkan untuk menampilkan kebijakan di form booking
                    </p>
                  </div>
                  <Switch
                    id="hotel_policies_enabled"
                    checked={settings.hotel_policies_enabled !== false}
                    onCheckedChange={(checked) => updateSettings({ hotel_policies_enabled: checked })}
                  />
                </div>

                {/* Textarea Kebijakan */}
                {settings.hotel_policies_enabled !== false && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hotel_policies_text">Kebijakan & Peraturan Hotel</Label>
                      <Textarea
                        id="hotel_policies_text"
                        name="hotel_policies_text"
                        defaultValue={settings.hotel_policies_text || ""}
                        placeholder={`Contoh:
• Check-in mulai pukul 14:00, check-out maksimal pukul 12:00
• Dilarang merokok di dalam kamar
• Jam tenang pukul 22:00 - 07:00
• Hewan peliharaan tidak diperkenankan
• Tamu wajib menunjukkan KTP/identitas saat check-in
• Kerusakan fasilitas kamar akan dikenakan biaya perbaikan
• Pembayaran dilakukan saat check-in`}
                        rows={12}
                      />
                    </div>

                    {/* Preview */}
                    <div className="pt-4 border-t">
                      <Label className="mb-2 block">Preview</Label>
                      <div className="bg-muted/50 p-4 rounded-lg max-h-64 overflow-y-auto">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Kebijakan Hotel
                        </h4>
                        <div className="text-sm whitespace-pre-line text-muted-foreground">
                          {settings.hotel_policies_text || "Belum ada kebijakan yang ditulis"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-4">
            {/* Session Timeout */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Pengaturan Session
                </CardTitle>
                <CardDescription>Atur timeout session chatbot WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_session_timeout">Session Timeout</Label>
                  <Select
                    value={String(settings.whatsapp_session_timeout_minutes || 15)}
                    onValueChange={(value) => updateSettings({ whatsapp_session_timeout_minutes: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 menit</SelectItem>
                      <SelectItem value="10">10 menit</SelectItem>
                      <SelectItem value="15">15 menit</SelectItem>
                      <SelectItem value="30">30 menit</SelectItem>
                      <SelectItem value="60">1 jam</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Session akan direset setelah tidak ada aktivitas selama waktu ini
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Numbers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Daftar Kontak
                </CardTitle>
                <CardDescription>Nomor-nomor kontak yang bisa dihubungi tamu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new contact */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nomor (e.g. 628123456789)"
                    value={newContactNumber}
                    onChange={(e) => setNewContactNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Label (e.g. Reservasi)"
                    value={newContactLabel}
                    onChange={(e) => setNewContactLabel(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newContactNumber || !newContactLabel) {
                        toast({ title: "Error", description: "Isi nomor dan label", variant: "destructive" });
                        return;
                      }
                      const contacts = [...(settings.whatsapp_contact_numbers || [])];
                      contacts.push({ number: newContactNumber, label: newContactLabel });
                      updateSettings({ whatsapp_contact_numbers: contacts });
                      setNewContactNumber("");
                      setNewContactLabel("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* List contacts */}
                <div className="space-y-2">
                  {(settings.whatsapp_contact_numbers || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada kontak</p>
                  ) : (
                    (settings.whatsapp_contact_numbers || []).map((contact: WhatsAppContact, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{contact.label}</p>
                          <p className="text-sm text-muted-foreground">{contact.number}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const contacts = [...(settings.whatsapp_contact_numbers || [])];
                            contacts.splice(index, 1);
                            updateSettings({ whatsapp_contact_numbers: contacts });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Whitelist (numbers that won't be served by AI) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="w-5 h-5" />
                  Whitelist Nomor (Non-AI)
                </CardTitle>
                <CardDescription>Nomor-nomor yang TIDAK akan dilayani oleh AI (hanya admin yang merespon)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new whitelist */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nomor (e.g. 628123456789)"
                    value={newWhitelistNumber}
                    onChange={(e) => setNewWhitelistNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newWhitelistNumber) {
                        toast({ title: "Error", description: "Isi nomor", variant: "destructive" });
                        return;
                      }
                      const whitelist = [...(settings.whatsapp_ai_whitelist || [])];
                      // Normalize number
                      let normalized = newWhitelistNumber.replace(/\D/g, '');
                      if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
                      if (!normalized.startsWith('62')) normalized = '62' + normalized;
                      
                      if (whitelist.includes(normalized)) {
                        toast({ title: "Error", description: "Nomor sudah ada", variant: "destructive" });
                        return;
                      }
                      whitelist.push(normalized);
                      updateSettings({ whatsapp_ai_whitelist: whitelist });
                      setNewWhitelistNumber("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* List whitelist */}
                <div className="flex flex-wrap gap-2">
                  {(settings.whatsapp_ai_whitelist || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada nomor whitelist</p>
                  ) : (
                    (settings.whatsapp_ai_whitelist || []).map((number: string, index: number) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {number}
                        <button
                          type="button"
                          onClick={() => {
                            const whitelist = [...(settings.whatsapp_ai_whitelist || [])];
                            whitelist.splice(index, 1);
                            updateSettings({ whatsapp_ai_whitelist: whitelist });
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Nomor di whitelist akan otomatis masuk mode takeover (admin harus merespon manual)
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isUpdating || isUploading}>
            {(isUpdating || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
