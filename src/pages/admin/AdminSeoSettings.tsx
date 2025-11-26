import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Loader2, Upload, RefreshCw } from "lucide-react";
import { SeoPreview } from "@/components/admin/SeoPreview";
import { toast } from "@/hooks/use-toast";

const AdminSeoSettings = () => {
  const { settings, isLoading, updateSettings, isUpdating, uploadOgImage, generateSitemap, isGeneratingSitemap } = useSeoSettings();
  const [formData, setFormData] = useState<Partial<typeof settings>>(settings || {});
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleUpdate = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSettings(formData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadOgImage(file);
      handleUpdate('default_og_image', url);
      toast({
        title: "Image Uploaded",
        description: "OG image has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">Manage your website's SEO configuration</p>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="local">Local</TabsTrigger>
                <TabsTrigger value="indexing">Indexing</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* General SEO */}
              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>General SEO</CardTitle>
                    <CardDescription>Basic SEO settings for your website</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="site_title">Site Title</Label>
                      <Input
                        id="site_title"
                        value={formData.site_title || ''}
                        onChange={(e) => handleUpdate('site_title', e.target.value)}
                        placeholder="Pomah Guesthouse - Your Perfect Stay"
                      />
                      <p className="text-sm text-muted-foreground">
                        {formData.site_title?.length || 0}/60 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meta_description">Meta Description</Label>
                      <Textarea
                        id="meta_description"
                        value={formData.meta_description || ''}
                        onChange={(e) => handleUpdate('meta_description', e.target.value)}
                        placeholder="Brief description of your website..."
                        rows={3}
                      />
                      <p className="text-sm text-muted-foreground">
                        {formData.meta_description?.length || 0}/160 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meta_keywords">Meta Keywords</Label>
                      <Input
                        id="meta_keywords"
                        value={formData.meta_keywords || ''}
                        onChange={(e) => handleUpdate('meta_keywords', e.target.value)}
                        placeholder="hotel, guesthouse, accommodation"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="canonical_url">Canonical URL</Label>
                      <Input
                        id="canonical_url"
                        value={formData.canonical_url || ''}
                        onChange={(e) => handleUpdate('canonical_url', e.target.value)}
                        placeholder="https://pomahguesthouse.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="og_image">Default OG Image</Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          id="og_image"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        <Button variant="outline" size="icon" disabled={uploadingImage}>
                          {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>
                      </div>
                      {formData.default_og_image && (
                        <img src={formData.default_og_image} alt="OG Preview" className="mt-2 h-32 rounded object-cover" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Social Media SEO */}
              <TabsContent value="social" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Media SEO</CardTitle>
                    <CardDescription>Configure social media sharing settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="og_site_name">OG Site Name</Label>
                      <Input
                        id="og_site_name"
                        value={formData.og_site_name || ''}
                        onChange={(e) => handleUpdate('og_site_name', e.target.value)}
                        placeholder="Pomah Guesthouse"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="og_locale">OG Locale</Label>
                      <Select
                        value={formData.og_locale || 'id_ID'}
                        onValueChange={(value) => handleUpdate('og_locale', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="id_ID">Indonesian (id_ID)</SelectItem>
                          <SelectItem value="en_US">English (en_US)</SelectItem>
                          <SelectItem value="en_GB">English UK (en_GB)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter_handle">Twitter Handle</Label>
                      <Input
                        id="twitter_handle"
                        value={formData.twitter_handle || ''}
                        onChange={(e) => handleUpdate('twitter_handle', e.target.value)}
                        placeholder="pomahguesthouse"
                      />
                      <p className="text-sm text-muted-foreground">Without @ symbol</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook_app_id">Facebook App ID</Label>
                      <Input
                        id="facebook_app_id"
                        value={formData.facebook_app_id || ''}
                        onChange={(e) => handleUpdate('facebook_app_id', e.target.value)}
                        placeholder="1234567890"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Local SEO */}
              <TabsContent value="local" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Local SEO</CardTitle>
                    <CardDescription>Configure local business SEO</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_type">Business Type</Label>
                      <Select
                        value={formData.business_type || 'Hotel'}
                        onValueChange={(value) => handleUpdate('business_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hotel">Hotel</SelectItem>
                          <SelectItem value="Guesthouse">Guesthouse</SelectItem>
                          <SelectItem value="Resort">Resort</SelectItem>
                          <SelectItem value="Hostel">Hostel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="geo_region">Geo Region</Label>
                      <Input
                        id="geo_region"
                        value={formData.geo_region || ''}
                        onChange={(e) => handleUpdate('geo_region', e.target.value)}
                        placeholder="ID-JT"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="geo_placename">Geo Place Name</Label>
                      <Input
                        id="geo_placename"
                        value={formData.geo_placename || ''}
                        onChange={(e) => handleUpdate('geo_placename', e.target.value)}
                        placeholder="Semarang"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="geo_coordinates">Geo Coordinates</Label>
                      <Input
                        id="geo_coordinates"
                        value={formData.geo_coordinates || ''}
                        onChange={(e) => handleUpdate('geo_coordinates', e.target.value)}
                        placeholder="-6.966667, 110.416664"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_range">Price Range</Label>
                      <Input
                        id="price_range"
                        value={formData.price_range || ''}
                        onChange={(e) => handleUpdate('price_range', e.target.value)}
                        placeholder="Rp"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Indexing Control */}
              <TabsContent value="indexing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Indexing Control</CardTitle>
                    <CardDescription>Control search engine indexing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Indexing</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow search engines to index this site
                        </p>
                      </div>
                      <Switch
                        checked={formData.allow_indexing}
                        onCheckedChange={(checked) => handleUpdate('allow_indexing', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Follow Links</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow search engines to follow links
                        </p>
                      </div>
                      <Switch
                        checked={formData.follow_links}
                        onCheckedChange={(checked) => handleUpdate('follow_links', checked)}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <Label>Robots Meta Tag Preview</Label>
                      <div className="mt-2 p-3 bg-muted rounded-md font-mono text-sm">
                        {formData.allow_indexing 
                          ? (formData.follow_links ? 'index, follow' : 'index, nofollow')
                          : 'noindex, nofollow'
                        }
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Sitemap Settings</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateSitemap()}
                          disabled={isGeneratingSitemap}
                        >
                          {isGeneratingSitemap ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Generate Sitemap
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Auto Generate</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically generate sitemap
                            </p>
                          </div>
                          <Switch
                            checked={formData.sitemap_auto_generate}
                            onCheckedChange={(checked) => handleUpdate('sitemap_auto_generate', checked)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Change Frequency</Label>
                          <Select
                            value={formData.sitemap_change_freq || 'weekly'}
                            onValueChange={(value) => handleUpdate('sitemap_change_freq', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="always">Always</SelectItem>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Home Priority</Label>
                            <Input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={formData.sitemap_priority_home || 1.0}
                              onChange={(e) => handleUpdate('sitemap_priority_home', parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rooms Priority</Label>
                            <Input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={formData.sitemap_priority_rooms || 0.8}
                              onChange={(e) => handleUpdate('sitemap_priority_rooms', parseFloat(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics */}
              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics & Verification</CardTitle>
                    <CardDescription>Configure analytics and verification tags</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                      <Input
                        id="google_analytics_id"
                        value={formData.google_analytics_id || ''}
                        onChange={(e) => handleUpdate('google_analytics_id', e.target.value)}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google_tag_manager_id">Google Tag Manager ID</Label>
                      <Input
                        id="google_tag_manager_id"
                        value={formData.google_tag_manager_id || ''}
                        onChange={(e) => handleUpdate('google_tag_manager_id', e.target.value)}
                        placeholder="GTM-XXXXXXX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google_search_console_verification">Google Search Console</Label>
                      <Input
                        id="google_search_console_verification"
                        value={formData.google_search_console_verification || ''}
                        onChange={(e) => handleUpdate('google_search_console_verification', e.target.value)}
                        placeholder="Verification code"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bing_verification">Bing Webmaster</Label>
                      <Input
                        id="bing_verification"
                        value={formData.bing_verification || ''}
                        onChange={(e) => handleUpdate('bing_verification', e.target.value)}
                        placeholder="Verification code"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook_pixel_id">Facebook Pixel ID</Label>
                      <Input
                        id="facebook_pixel_id"
                        value={formData.facebook_pixel_id || ''}
                        onChange={(e) => handleUpdate('facebook_pixel_id', e.target.value)}
                        placeholder="123456789012345"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced */}
              <TabsContent value="advanced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced SEO</CardTitle>
                    <CardDescription>Advanced SEO configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom_head_scripts">Custom Head Scripts</Label>
                      <Textarea
                        id="custom_head_scripts"
                        value={formData.custom_head_scripts || ''}
                        onChange={(e) => handleUpdate('custom_head_scripts', e.target.value)}
                        placeholder="<script>...</script>"
                        rows={6}
                        className="font-mono text-sm"
                      />
                      <p className="text-sm text-muted-foreground">
                        Add custom scripts to the head section
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="robots_txt_custom">Custom Robots.txt Rules</Label>
                      <Textarea
                        id="robots_txt_custom"
                        value={formData.robots_txt_custom || ''}
                        onChange={(e) => handleUpdate('robots_txt_custom', e.target.value)}
                        placeholder="User-agent: *&#10;Disallow: /admin/"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Structured Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable JSON-LD structured data
                        </p>
                      </div>
                      <Switch
                        checked={formData.structured_data_enabled}
                        onCheckedChange={(checked) => handleUpdate('structured_data_enabled', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* SEO Preview Sidebar */}
          <div className="lg:col-span-1">
            <SeoPreview
              title={formData.site_title || 'Your Site Title'}
              description={formData.meta_description || 'Your meta description...'}
              url={formData.canonical_url || 'https://example.com'}
              ogImage={formData.default_og_image}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSeoSettings;
