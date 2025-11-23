import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { settings, isLoading, updateSettings, isUpdating, uploadFile } = useHotelSettings();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout>
        <div className="text-center text-muted-foreground">No settings found</div>
      </AdminLayout>
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
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Hotel Settings</h1>
          <p className="text-muted-foreground">Manage your hotel information and configuration</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="social">Social Media</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
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

              <Card>
                <CardHeader>
                  <CardTitle>Informasi Rekening Bank</CardTitle>
                  <CardDescription>Detail rekening untuk pembayaran tamu</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Nama Bank</Label>
                    <Input id="bank_name" name="bank_name" defaultValue={settings.bank_name || ""} placeholder="Contoh: Bank BCA" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Nomor Rekening</Label>
                    <Input id="account_number" name="account_number" defaultValue={settings.account_number || ""} placeholder="Contoh: 1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">Nama Pemilik Rekening</Label>
                    <Input id="account_holder_name" name="account_holder_name" defaultValue={settings.account_holder_name || ""} placeholder="Contoh: Pomah Guesthouse" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_instructions">Instruksi Pembayaran Tambahan</Label>
                    <Textarea 
                      id="payment_instructions" 
                      name="payment_instructions" 
                      rows={3}
                      defaultValue={settings.payment_instructions || ""} 
                      placeholder="Informasi tambahan untuk pembayaran"
                    />
                  </div>
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
    </AdminLayout>
  );
}
