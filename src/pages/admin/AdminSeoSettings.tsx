import { useSeoSettings } from "@/hooks/useSeoSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useState, useRef, useEffect } from "react";
import { Loader2, Upload, RefreshCw, Search, TrendingUp } from "lucide-react";
import { SeoPreview } from "@/components/admin/SeoPreview";
import { SeoChecker, RankingsTab } from "@/components/admin/seo-checker";
import { toast } from "@/hooks/use-toast";

type SeoSettingsType = Record<string, any>; // fallback safe type

const AdminSeoSettings = () => {
  const { settings, isLoading, updateSettings, isUpdating, uploadOgImage, generateSitemap, isGeneratingSitemap } =
    useSeoSettings();

  const [formData, setFormData] = useState<SeoSettingsType>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sync settings → formData when loaded
  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  // Refs for smooth scroll
  const generalRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const indexingRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);
  const checkerRef = useRef<HTMLDivElement>(null);
  const rankingsRef = useRef<HTMLDivElement>(null);

  const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
    general: generalRef,
    social: socialRef,
    local: localRef,
    indexing: indexingRef,
    analytics: analyticsRef,
    advanced: advancedRef,
    checker: checkerRef,
    rankings: rankingsRef,
  };

  const handleUpdate = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => updateSettings(formData);

  const handleTabChange = (value: string) => {
    refMap[value]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadOgImage(file);
      handleUpdate("default_og_image", url);

      toast({
        title: "Image Uploaded",
        description: "OG image has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Manage your website&apos;s SEO configuration</p>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-2">
          <Tabs className="space-y-4" defaultValue="general" onValueChange={handleTabChange}>
            <TabsList
              className="
                flex w-full overflow-x-auto scrollbar-hide
                sticky top-0 z-10 bg-background/95 backdrop-blur-sm shadow-sm
              "
            >
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="indexing">Indexing</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="checker" className="flex items-center gap-1">
                <Search className="w-4 h-4" />
                Checker
              </TabsTrigger>
              <TabsTrigger value="rankings" className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Rankings
              </TabsTrigger>
            </TabsList>

            {/* GENERAL */}
            <TabsContent value="general">
              <div ref={generalRef} className="scroll-mt-20 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>General SEO</CardTitle>
                    <CardDescription>Basic SEO settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                      <Label>Site Title</Label>
                      <Input
                        value={formData.site_title || ""}
                        onChange={(e) => handleUpdate("site_title", e.target.value)}
                        placeholder="Pomah Guesthouse - Your Perfect Stay"
                      />
                      <p className="text-sm text-muted-foreground">{formData.site_title?.length || 0}/60 characters</p>
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-2">
                      <Label>Meta Description</Label>
                      <Textarea
                        rows={3}
                        value={formData.meta_description || ""}
                        onChange={(e) => handleUpdate("meta_description", e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        {formData.meta_description?.length || 0}/160 characters
                      </p>
                    </div>

                    {/* Keywords */}
                    <div className="space-y-2">
                      <Label>Meta Keywords</Label>
                      <Input
                        value={formData.meta_keywords || ""}
                        onChange={(e) => handleUpdate("meta_keywords", e.target.value)}
                      />
                    </div>

                    {/* Canonical */}
                    <div className="space-y-2">
                      <Label>Canonical URL</Label>
                      <Input
                        value={formData.canonical_url || ""}
                        onChange={(e) => handleUpdate("canonical_url", e.target.value)}
                      />
                    </div>

                    {/* OG Image */}
                    <div className="space-y-2">
                      <Label>Default OG Image</Label>
                      <div className="flex gap-2">
                        <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                        <Button variant="outline" size="icon" disabled={uploadingImage}>
                          {uploadingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {formData.default_og_image && (
                        <img src={formData.default_og_image} className="mt-2 h-32 w-full object-cover rounded" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SOCIAL */}
            <TabsContent value="social">
              <div ref={socialRef} className="scroll-mt-20 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Media SEO</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* OG Site Name */}
                    <div className="space-y-2">
                      <Label>OG Site Name</Label>
                      <Input
                        value={formData.og_site_name || ""}
                        onChange={(e) => handleUpdate("og_site_name", e.target.value)}
                      />
                    </div>

                    {/* Locale */}
                    <div className="space-y-2">
                      <Label>OG Locale</Label>
                      <Select value={formData.og_locale || "id_ID"} onValueChange={(v) => handleUpdate("og_locale", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="id_ID">Indonesian</SelectItem>
                          <SelectItem value="en_US">English US</SelectItem>
                          <SelectItem value="en_GB">English UK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Twitter Handle */}
                    <div className="space-y-2">
                      <Label>Twitter Handle</Label>
                      <Input
                        value={formData.twitter_handle || ""}
                        onChange={(e) => handleUpdate("twitter_handle", e.target.value)}
                        placeholder="pomahguesthouse"
                      />
                    </div>

                    {/* FB App ID */}
                    <div className="space-y-2">
                      <Label>Facebook App ID</Label>
                      <Input
                        value={formData.facebook_app_id || ""}
                        onChange={(e) => handleUpdate("facebook_app_id", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* LOCAL */}
            <TabsContent value="local">
              <div ref={localRef} className="scroll-mt-20 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Local SEO</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Type */}
                    <div className="space-y-2">
                      <Label>Business Type</Label>
                      <Select
                        value={formData.business_type || "Hotel"}
                        onValueChange={(v) => handleUpdate("business_type", v)}
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
                      <Label>Geo Region</Label>
                      <Input
                        value={formData.geo_region || ""}
                        onChange={(e) => handleUpdate("geo_region", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Place Name</Label>
                      <Input
                        value={formData.geo_placename || ""}
                        onChange={(e) => handleUpdate("geo_placename", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Coordinates</Label>
                      <Input
                        value={formData.geo_coordinates || ""}
                        onChange={(e) => handleUpdate("geo_coordinates", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* INDEXING */}
            <TabsContent value="indexing">
              <div ref={indexingRef} className="scroll-mt-20 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Indexing Control</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Indexing Switch */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Indexing</Label>
                      </div>
                      <Switch
                        checked={formData.allow_indexing}
                        onCheckedChange={(v) => handleUpdate("allow_indexing", v)}
                      />
                    </div>

                    {/* Follow Links */}
                    <div className="flex items-center justify-between">
                      <Label>Follow Links</Label>
                      <Switch
                        checked={formData.follow_links}
                        onCheckedChange={(v) => handleUpdate("follow_links", v)}
                      />
                    </div>

                    {/* Robots Preview */}
                    <div className="pt-4 border-t">
                      <Label>Robots Meta Preview</Label>
                      <div className="mt-2 p-3 bg-muted rounded font-mono text-sm">
                        {formData.allow_indexing
                          ? formData.follow_links
                            ? "index, follow"
                            : "index, nofollow"
                          : "noindex, nofollow"}
                      </div>
                    </div>

                    {/* Sitemap */}
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex justify-between">
                        <Label>Sitemap Generator</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateSitemap()}
                          disabled={isGeneratingSitemap}
                        >
                          {isGeneratingSitemap ? (
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 w-4 h-4" />
                          )}
                          Generate
                        </Button>
                      </div>

                      {/* Auto Generate */}
                      <div className="flex justify-between">
                        <Label>Auto Generate</Label>
                        <Switch
                          checked={formData.sitemap_auto_generate}
                          onCheckedChange={(v) => handleUpdate("sitemap_auto_generate", v)}
                        />
                      </div>

                      {/* Frequency */}
                      <div className="space-y-2">
                        <Label>Change Frequency</Label>
                        <Select
                          value={formData.sitemap_change_freq || "weekly"}
                          onValueChange={(v) => handleUpdate("sitemap_change_freq", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Home Priority</Label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={formData.sitemap_priority_home || 1}
                            onChange={(e) => handleUpdate("sitemap_priority_home", parseFloat(e.target.value))}
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
                            onChange={(e) => handleUpdate("sitemap_priority_rooms", parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ANALYTICS */}
            <TabsContent value="analytics">
              <div ref={analyticsRef} className="scroll-mt-20 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics & Verification</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Google Analytics */}
                    <div>
                      <Label>Google Analytics ID</Label>
                      <Input
                        value={formData.google_analytics_id || ""}
                        onChange={(e) => handleUpdate("google_analytics_id", e.target.value)}
                      />
                    </div>

                    {/* GTM */}
                    <div>
                      <Label>Google Tag Manager ID</Label>
                      <Input
                        value={formData.google_tag_manager_id || ""}
                        onChange={(e) => handleUpdate("google_tag_manager_id", e.target.value)}
                      />
                    </div>

                    {/* Google Verification */}
                    <div>
                      <Label>Google Search Console</Label>
                      <Input
                        value={formData.google_search_console_verification || ""}
                        onChange={(e) => handleUpdate("google_search_console_verification", e.target.value)}
                      />
                    </div>

                    {/* Bing */}
                    <div>
                      <Label>Bing Webmaster Verification</Label>
                      <Input
                        value={formData.bing_verification || ""}
                        onChange={(e) => handleUpdate("bing_verification", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ADVANCED */}
            <TabsContent value="advanced">
              <div ref={advancedRef} className="scroll-mt-20 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced SEO</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Head Script */}
                    <div>
                      <Label>Custom Head Scripts</Label>
                      <Textarea
                        rows={6}
                        value={formData.custom_head_scripts || ""}
                        onChange={(e) => handleUpdate("custom_head_scripts", e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Robots */}
                    <div>
                      <Label>Custom robots.txt</Label>
                      <Textarea
                        rows={6}
                        value={formData.robots_txt_custom || ""}
                        onChange={(e) => handleUpdate("robots_txt_custom", e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Structured Data */}
                    <div className="flex items-center justify-between">
                      <Label>Enable Structured Data (JSON-LD)</Label>
                      <Switch
                        checked={formData.structured_data_enabled}
                        onCheckedChange={(v) => handleUpdate("structured_data_enabled", v)}
                      />
                    </div>

                    {/* Custom JSON-LD */}
                    <div>
                      <Label>Custom JSON-LD Schema</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Add custom structured data in JSON-LD format. Must be valid JSON.
                      </p>
                      <Textarea
                        rows={8}
                        value={formData.custom_json_ld || ""}
                        onChange={(e) => handleUpdate("custom_json_ld", e.target.value)}
                        className="font-mono text-sm"
                        placeholder='{"@context": "https://schema.org", "@type": "FAQPage", ...}'
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* CHECKER */}
            <TabsContent value="checker">
              <div ref={checkerRef} className="scroll-mt-20">
                <SeoChecker />
              </div>
            </TabsContent>

            {/* RANKINGS */}
            <TabsContent value="rankings">
              <div ref={rankingsRef} className="scroll-mt-20">
                <RankingsTab />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <SeoPreview
            title={formData.site_title || "Your Site Title"}
            description={formData.meta_description || "Your meta description..."}
            url={formData.canonical_url || "https://example.com"}
            ogImage={formData.default_og_image}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminSeoSettings;
