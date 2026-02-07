import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, X, Sparkles, AlertCircle } from "lucide-react";
import { LandingPage } from "@/pages/admin/AdminLandingPages";
import { LandingPageAIAssist } from "./LandingPageAIAssist";
import { HeroSliderManager, HeroSlide } from "./HeroSliderManager";
import { MediaPickerField } from "./MediaPickerField";

const formSchema = z.object({
  page_title: z
    .string()
    .min(1, "Judul halaman wajib diisi")
    .max(60, "Maksimal 60 karakter untuk SEO optimal"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug harus lowercase, gunakan tanda hubung"
    ),
  meta_description: z
    .string()
    .max(160, "Maksimal 160 karakter untuk SEO optimal")
    .optional(),
  primary_keyword: z.string().min(1, "Keyword utama wajib diisi"),
  secondary_keywords: z.array(z.string()).default([]),
  hero_headline: z.string().min(1, "Headline H1 wajib diisi"),
  subheadline: z.string().optional(),
  page_content: z.string().optional(),
  cta_text: z.string().default("Booking via WhatsApp"),
  whatsapp_number: z.string().optional(),
  whatsapp_message_template: z.string().optional(),
  hero_image_url: z.string().optional(),
  hero_image_alt: z.string().optional(),
  hero_slides: z.array(z.object({
    id: z.string(),
    image_url: z.string(),
    alt_text: z.string(),
  })).default([]),
  og_image_url: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPage: LandingPage | null;
}

export function LandingPageFormDialog({ open, onOpenChange, editingPage }: Props) {
  const [newKeyword, setNewKeyword] = useState("");
  const [showAIAssist, setShowAIAssist] = useState(false);
  const queryClient = useQueryClient();

  const { data: hotelSettings } = useQuery({
    queryKey: ["hotel-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hotel_settings")
        .select("whatsapp_number")
        .single();
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      page_title: "",
      slug: "",
      meta_description: "",
      primary_keyword: "penginapan dekat Undip Tembalang",
      secondary_keywords: [],
      hero_headline: "",
      subheadline: "",
      page_content: "",
      cta_text: "Booking via WhatsApp",
      whatsapp_number: "",
      whatsapp_message_template: "",
      hero_image_url: "",
      hero_image_alt: "",
      hero_slides: [],
      og_image_url: "",
      status: "draft",
    },
  });

  useEffect(() => {
    if (editingPage) {
      // Parse hero_slides safely
      let heroSlides: HeroSlide[] = [];
      if (editingPage.hero_slides && Array.isArray(editingPage.hero_slides)) {
        heroSlides = editingPage.hero_slides as HeroSlide[];
      }
      
      form.reset({
        page_title: editingPage.page_title,
        slug: editingPage.slug,
        meta_description: editingPage.meta_description || "",
        primary_keyword: editingPage.primary_keyword,
        secondary_keywords: editingPage.secondary_keywords || [],
        hero_headline: editingPage.hero_headline,
        subheadline: editingPage.subheadline || "",
        page_content: editingPage.page_content || "",
        cta_text: editingPage.cta_text || "Booking via WhatsApp",
        whatsapp_number: editingPage.whatsapp_number || "",
        whatsapp_message_template: editingPage.whatsapp_message_template || "",
        hero_image_url: editingPage.hero_image_url || "",
        hero_image_alt: editingPage.hero_image_alt || "",
        hero_slides: heroSlides,
        og_image_url: editingPage.og_image_url || "",
        status: editingPage.status,
      });
    } else {
      form.reset({
        page_title: "",
        slug: "",
        meta_description: "",
        primary_keyword: "penginapan dekat Undip Tembalang",
        secondary_keywords: [
          "penginapan wisuda Undip",
          "guesthouse dekat Undip Semarang",
          "penginapan keluarga dekat Undip",
        ],
        hero_headline: "",
        subheadline: "",
        page_content: "",
        cta_text: "Booking via WhatsApp",
        whatsapp_number: hotelSettings?.whatsapp_number || "",
        whatsapp_message_template: "",
        hero_image_url: "",
        hero_image_alt: "",
        hero_slides: [],
        og_image_url: "",
        status: "draft",
      });
    }
  }, [editingPage, form, hotelSettings]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (value: string) => {
    form.setValue("page_title", value);
    if (!editingPage) {
      form.setValue("slug", generateSlug(value));
    }
  };

  const addSecondaryKeyword = () => {
    if (newKeyword.trim()) {
      const current = form.getValues("secondary_keywords");
      if (!current.includes(newKeyword.trim())) {
        form.setValue("secondary_keywords", [...current, newKeyword.trim()]);
      }
      setNewKeyword("");
    }
  };

  const removeSecondaryKeyword = (keyword: string) => {
    const current = form.getValues("secondary_keywords");
    form.setValue(
      "secondary_keywords",
      current.filter((k) => k !== keyword)
    );
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        page_title: values.page_title,
        slug: values.slug,
        meta_description: values.meta_description || null,
        primary_keyword: values.primary_keyword,
        secondary_keywords: values.secondary_keywords,
        hero_headline: values.hero_headline,
        subheadline: values.subheadline || null,
        page_content: values.page_content || null,
        cta_text: values.cta_text || "Booking via WhatsApp",
        whatsapp_number: values.whatsapp_number || null,
        whatsapp_message_template: values.whatsapp_message_template || null,
        hero_image_url: values.hero_image_url || null,
        hero_image_alt: values.hero_image_alt || null,
        hero_slides: (values.hero_slides || []) as unknown as import("@/integrations/supabase/types").Json,
        og_image_url: values.og_image_url || null,
        status: values.status,
        published_at: undefined as string | undefined,
      };

      if (values.status === "published" && !editingPage?.published_at) {
        payload.published_at = new Date().toISOString();
      }

      if (editingPage) {
        const { error } = await supabase
          .from("landing_pages")
          .update(payload)
          .eq("id", editingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("landing_pages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success(editingPage ? "Halaman diperbarui" : "Halaman dibuat");
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Slug sudah digunakan");
      } else {
        toast.error("Gagal menyimpan halaman");
      }
    },
  });

  const pageTitle = form.watch("page_title");
  const metaDesc = form.watch("meta_description");
  const pageContent = form.watch("page_content");
  const primaryKeyword = form.watch("primary_keyword");

  const contentWordCount = pageContent?.split(/\s+/).filter(Boolean).length || 0;
  const keywordInFirst100 =
    pageContent?.toLowerCase().slice(0, 500).includes(primaryKeyword.toLowerCase()) || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {editingPage ? "Edit Halaman" : "Buat Halaman Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <Tabs defaultValue="seo" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mx-6 max-w-[calc(100%-3rem)]">
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="content">Konten</TabsTrigger>
                <TabsTrigger value="cta">CTA</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh] px-6 pb-6">
                <TabsContent value="seo" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="page_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Judul Halaman (SEO Title)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="Penginapan Dekat Undip Tembalang | Pomah Guesthouse"
                          />
                        </FormControl>
                        <FormDescription className="flex justify-between">
                          <span>Maksimal 60 karakter untuk SEO optimal</span>
                          <span
                            className={
                              pageTitle.length > 60
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {pageTitle.length}/60
                          </span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <span className="text-muted-foreground mr-1">/</span>
                            <Input
                              {...field}
                              placeholder="penginapan-dekat-undip-tembalang"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          URL halaman: /{field.value}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meta_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Penginapan nyaman dekat Undip Tembalang. Cocok untuk wisuda, keluarga, tamu. Parkir luas, AC, WiFi. Booking mudah via WhatsApp."
                          />
                        </FormControl>
                        <FormDescription className="flex justify-between">
                          <span>Maksimal 160 karakter</span>
                          <span
                            className={
                              (metaDesc?.length || 0) > 160
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {metaDesc?.length || 0}/160
                          </span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primary_keyword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keyword Utama</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="penginapan dekat Undip Tembalang"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keyword Sekunder</FormLabel>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {field.value.map((keyword) => (
                            <Badge
                              key={keyword}
                              variant="secondary"
                              className="gap-1"
                            >
                              {keyword}
                              <button
                                type="button"
                                onClick={() => removeSecondaryKeyword(keyword)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            placeholder="Tambah keyword..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSecondaryKeyword();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addSecondaryKeyword}
                          >
                            Tambah
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Konten Halaman</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIAssist(true)}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Assist
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="hero_headline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headline (H1)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Penginapan Nyaman Dekat Undip Tembalang"
                          />
                        </FormControl>
                        <FormDescription>
                          Masukkan keyword utama secara natural
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subheadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subheadline (H2)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Lokasi strategis, cocok untuk wisuda, keluarga, dan tamu bisnis"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="page_content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Konten (Markdown)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={15}
                            placeholder="Tulis konten SEO-friendly minimal 600 kata..."
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <div className="space-y-2">
                          <FormDescription className="flex justify-between">
                            <span>Minimum 600 kata untuk SEO optimal</span>
                            <span
                              className={
                                contentWordCount < 600
                                  ? "text-amber-500"
                                  : "text-green-500"
                              }
                            >
                              {contentWordCount} kata
                            </span>
                          </FormDescription>
                          {contentWordCount > 0 && !keywordInFirst100 && (
                            <div className="flex items-center gap-2 text-amber-500 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              Keyword utama tidak ditemukan di 100 kata pertama
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="cta" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="cta_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teks CTA</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Booking via WhatsApp" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor WhatsApp</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="6281234567890" />
                        </FormControl>
                        <FormDescription>
                          Format internasional tanpa + (contoh: 6281234567890)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp_message_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Pesan WhatsApp</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Halo, saya tertarik booking kamar di Pomah Guesthouse. Saya menemukan info dari halaman {page_title}."
                          />
                        </FormControl>
                        <FormDescription>
                          Gunakan {"{page_title}"} untuk menyisipkan judul halaman
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="media" className="space-y-6 mt-4">
                  {/* Hero Slider */}
                  <FormField
                    control={form.control}
                    name="hero_slides"
                    render={({ field }) => (
                      <FormItem>
                        <HeroSliderManager
                          slides={(field.value || []) as HeroSlide[]}
                          onChange={field.onChange}
                        />
                        <FormDescription>
                          Tambahkan beberapa gambar untuk slider hero. Drag untuk mengatur urutan.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3 text-muted-foreground">
                      Atau gunakan single hero image (legacy):
                    </p>
                    
                    <MediaPickerField
                      label="Hero Image"
                      value={form.watch("hero_image_url") || ""}
                      onChange={(url) => form.setValue("hero_image_url", url)}
                      altText={form.watch("hero_image_alt") || ""}
                      onAltChange={(alt) => form.setValue("hero_image_alt", alt)}
                      showAltField={true}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <MediaPickerField
                      label="OG Image (Social Media)"
                      value={form.watch("og_image_url") || ""}
                      onChange={(url) => form.setValue("og_image_url", url)}
                      description="Gambar untuk sharing di social media (1200×630)"
                    />
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="flex justify-end gap-3 p-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingPage ? "Simpan Perubahan" : "Buat Halaman"}
              </Button>
            </div>
          </form>
        </Form>

        <LandingPageAIAssist
          open={showAIAssist}
          onOpenChange={setShowAIAssist}
          primaryKeyword={primaryKeyword}
          secondaryKeywords={form.watch("secondary_keywords")}
          onApplyContent={(content) => {
            form.setValue("page_content", content);
            setShowAIAssist(false);
          }}
          onApplyTitle={(title) => {
            handleTitleChange(title);
          }}
          onApplyMeta={(meta) => {
            form.setValue("meta_description", meta);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
