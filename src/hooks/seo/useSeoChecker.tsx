import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isWebPFormat, getImageFormat, convertUrlToWebP, formatFileSize } from "@/utils/imageConverter";
import { useSeoSettings } from "./useSeoSettings";
import { toast } from "sonner";

export interface SeoIssue {
  id: string;
  type: "error" | "warning" | "info";
  category: "image" | "content" | "structure" | "performance";
  title: string;
  description: string;
  location: string;
  tableName?: string;
  recordId?: string;
  field?: string;
  imageUrl?: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface SeoAuditResult {
  score: number;
  issues: SeoIssue[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
    total: number;
  };
  lastAuditAt: string;
}

export const useSeoChecker = () => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<SeoAuditResult | null>(null);
  const { settings: seoSettings } = useSeoSettings();

  const checkImageAltTexts = useCallback(async (): Promise<SeoIssue[]> => {
    const issues: SeoIssue[] = [];

    // Check rooms - use image_urls column (correct column name)
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, name, image_urls, image_alt, image_alts");

    rooms?.forEach((room) => {
      const imageUrls = (room.image_urls as string[]) || [];
      const imageAlts = (room.image_alts as string[]) || [];
      
      imageUrls.forEach((img, index) => {
        const altText = imageAlts[index];
        if (!altText || altText.trim() === "") {
          issues.push({
            id: `room-${room.id}-img-${index}`,
            type: "error",
            category: "image",
            title: "Alt Text Kosong",
            description: `Gambar ${index + 1} pada kamar "${room.name}" tidak memiliki alt text`,
            location: `Rooms > ${room.name} > Image ${index + 1}`,
            tableName: "rooms",
            recordId: room.id,
            field: `image_alts[${index}]`,
            imageUrl: img,
            suggestion: "Tambahkan deskripsi gambar untuk SEO dan aksesibilitas",
            autoFixable: true,
          });
        } else if (altText.length < 10) {
          issues.push({
            id: `room-${room.id}-img-${index}-short`,
            type: "warning",
            category: "image",
            title: "Alt Text Terlalu Pendek",
            description: `Alt text gambar ${index + 1} pada kamar "${room.name}" kurang dari 10 karakter`,
            location: `Rooms > ${room.name} > Image ${index + 1}`,
            tableName: "rooms",
            recordId: room.id,
            field: `image_alts[${index}]`,
            imageUrl: img,
            suggestion: "Buat alt text lebih deskriptif (minimal 10 karakter)",
            autoFixable: true,
          });
        }
      });
    });

    // Check hero slides
    const { data: heroSlides } = await supabase
      .from("hero_slides")
      .select("id, overlay_text, image_url, alt_text");

    heroSlides?.forEach((slide) => {
      if (!slide.alt_text || slide.alt_text.trim() === "") {
        issues.push({
          id: `hero-${slide.id}`,
          type: "error",
          category: "image",
          title: "Alt Text Kosong",
          description: `Hero slide "${slide.overlay_text || 'Untitled'}" tidak memiliki alt text`,
          location: `Hero Slides > ${slide.overlay_text || 'Untitled'}`,
          tableName: "hero_slides",
          recordId: slide.id,
          field: "alt_text",
          imageUrl: slide.image_url || undefined,
          suggestion: "Tambahkan deskripsi gambar hero untuk SEO",
          autoFixable: true,
        });
      }
    });

    // Check city attractions
    const { data: attractions } = await supabase
      .from("city_attractions")
      .select("id, name, image_url, image_alt, gallery_images, gallery_alts");

    attractions?.forEach((attraction) => {
      if (!attraction.image_alt || attraction.image_alt.trim() === "") {
        issues.push({
          id: `attraction-${attraction.id}`,
          type: "error",
          category: "image",
          title: "Alt Text Kosong",
          description: `Gambar utama atraksi "${attraction.name}" tidak memiliki alt text`,
          location: `City Attractions > ${attraction.name}`,
          tableName: "city_attractions",
          recordId: attraction.id,
          field: "image_alt",
          imageUrl: attraction.image_url || undefined,
          suggestion: "Tambahkan deskripsi gambar atraksi untuk SEO",
          autoFixable: true,
        });
      }

      const galleryImages = attraction.gallery_images || [];
      const galleryAlts = (attraction.gallery_alts as string[]) || [];
      
      galleryImages.forEach((img, index) => {
        const altText = galleryAlts[index];
        if (!altText || altText.trim() === "") {
          issues.push({
            id: `attraction-${attraction.id}-gallery-${index}`,
            type: "warning",
            category: "image",
            title: "Gallery Alt Text Kosong",
            description: `Gallery image ${index + 1} pada "${attraction.name}" tidak memiliki alt text`,
            location: `City Attractions > ${attraction.name} > Gallery ${index + 1}`,
            tableName: "city_attractions",
            recordId: attraction.id,
            field: `gallery_alts[${index}]`,
            imageUrl: img,
            suggestion: "Tambahkan alt text untuk gambar gallery",
            autoFixable: true,
          });
        }
      });
    });

    return issues;
  }, []);

  const checkImageFormats = useCallback(async (): Promise<SeoIssue[]> => {
    const issues: SeoIssue[] = [];

    // Check rooms images - use correct column name image_urls
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, name, image_urls");

    rooms?.forEach((room) => {
      const imageUrls = (room.image_urls as string[]) || [];
      imageUrls.forEach((img, index) => {
        if (img && !isWebPFormat(img)) {
          issues.push({
            id: `room-format-${room.id}-${index}`,
            type: "warning",
            category: "performance",
            title: "Format Bukan WebP",
            description: `Gambar ${index + 1} kamar "${room.name}" menggunakan format ${getImageFormat(img)}`,
            location: `Rooms > ${room.name} > Image ${index + 1}`,
            tableName: "rooms",
            recordId: room.id,
            field: `image_urls[${index}]`,
            imageUrl: img,
            suggestion: "Konversi ke WebP untuk ukuran file lebih kecil dan loading lebih cepat",
            autoFixable: true,
          });
        }
      });
    });

    // Check hero slides
    const { data: heroSlides } = await supabase
      .from("hero_slides")
      .select("id, overlay_text, image_url");

    heroSlides?.forEach((slide) => {
      if (slide.image_url && !isWebPFormat(slide.image_url)) {
        issues.push({
          id: `hero-format-${slide.id}`,
          type: "warning",
          category: "performance",
          title: "Format Bukan WebP",
          description: `Hero slide "${slide.overlay_text || 'Untitled'}" menggunakan format ${getImageFormat(slide.image_url)}`,
          location: `Hero Slides > ${slide.overlay_text || 'Untitled'}`,
          tableName: "hero_slides",
          recordId: slide.id,
          field: "image_url",
          imageUrl: slide.image_url,
          suggestion: "Konversi ke WebP untuk performa lebih baik",
          autoFixable: true,
        });
      }
    });

    return issues;
  }, []);

  const checkMetaTags = useCallback(async (): Promise<SeoIssue[]> => {
    const issues: SeoIssue[] = [];

    if (!seoSettings) return issues;

    // Check site title
    if (!seoSettings.site_title || seoSettings.site_title.length < 10) {
      issues.push({
        id: "meta-title-missing",
        type: "error",
        category: "content",
        title: "Site Title Kosong/Pendek",
        description: "Site title tidak ada atau terlalu pendek",
        location: "SEO Settings > General",
        suggestion: "Tambahkan site title yang deskriptif (10-60 karakter)",
        autoFixable: false,
      });
    } else if (seoSettings.site_title.length > 60) {
      issues.push({
        id: "meta-title-long",
        type: "warning",
        category: "content",
        title: "Site Title Terlalu Panjang",
        description: `Site title memiliki ${seoSettings.site_title.length} karakter (max 60)`,
        location: "SEO Settings > General",
        suggestion: "Persingkat site title menjadi maksimal 60 karakter",
        autoFixable: false,
      });
    }

    // Check meta description
    if (!seoSettings.meta_description || seoSettings.meta_description.length < 50) {
      issues.push({
        id: "meta-desc-missing",
        type: "error",
        category: "content",
        title: "Meta Description Kosong/Pendek",
        description: "Meta description tidak ada atau terlalu pendek",
        location: "SEO Settings > General",
        suggestion: "Tambahkan meta description yang informatif (50-160 karakter)",
        autoFixable: false,
      });
    } else if (seoSettings.meta_description.length > 160) {
      issues.push({
        id: "meta-desc-long",
        type: "warning",
        category: "content",
        title: "Meta Description Terlalu Panjang",
        description: `Meta description memiliki ${seoSettings.meta_description.length} karakter (max 160)`,
        location: "SEO Settings > General",
        suggestion: "Persingkat meta description menjadi maksimal 160 karakter",
        autoFixable: false,
      });
    }

    // Check canonical URL
    if (!seoSettings.canonical_url) {
      issues.push({
        id: "canonical-missing",
        type: "warning",
        category: "structure",
        title: "Canonical URL Tidak Diset",
        description: "Canonical URL belum dikonfigurasi",
        location: "SEO Settings > General",
        suggestion: "Set canonical URL untuk menghindari duplikat konten",
        autoFixable: false,
      });
    }

    // Check OG image - use default_og_image which is the actual column
    if (!seoSettings.default_og_image) {
      issues.push({
        id: "og-image-missing",
        type: "warning",
        category: "content",
        title: "OG Image Tidak Ada",
        description: "Open Graph image belum diset untuk sharing di social media",
        location: "SEO Settings > Social",
        suggestion: "Upload gambar OG (1200x630px) untuk tampilan lebih baik di social media",
        autoFixable: false,
      });
    }

    // Check keywords
    if (!seoSettings.meta_keywords || seoSettings.meta_keywords.length < 3) {
      issues.push({
        id: "keywords-missing",
        type: "info",
        category: "content",
        title: "Meta Keywords Kurang",
        description: "Meta keywords kosong atau kurang dari 3 kata kunci",
        location: "SEO Settings > General",
        suggestion: "Tambahkan 5-10 kata kunci yang relevan",
        autoFixable: false,
      });
    }

    return issues;
  }, [seoSettings]);

  const checkRoomDescriptions = useCallback(async (): Promise<SeoIssue[]> => {
    const issues: SeoIssue[] = [];

    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, name, description");

    rooms?.forEach((room) => {
      if (!room.description || room.description.length < 100) {
        issues.push({
          id: `room-desc-${room.id}`,
          type: "warning",
          category: "content",
          title: "Deskripsi Kamar Pendek",
          description: `Kamar "${room.name}" memiliki deskripsi kurang dari 100 karakter`,
          location: `Rooms > ${room.name}`,
          tableName: "rooms",
          recordId: room.id,
          field: "description",
          suggestion: "Tulis deskripsi lebih detail untuk SEO (min 100 karakter)",
          autoFixable: false,
        });
      }
    });

    return issues;
  }, []);

  const runFullAudit = useCallback(async (): Promise<SeoAuditResult> => {
    setIsAuditing(true);

    try {
      const [altTextIssues, formatIssues, metaIssues, descIssues] = await Promise.all([
        checkImageAltTexts(),
        checkImageFormats(),
        checkMetaTags(),
        checkRoomDescriptions(),
      ]);

      const allIssues = [...altTextIssues, ...formatIssues, ...metaIssues, ...descIssues];
      
      const errors = allIssues.filter((i) => i.type === "error").length;
      const warnings = allIssues.filter((i) => i.type === "warning").length;
      
      // Calculate score
      const totalChecks = allIssues.length + 50; // Base of 50 passed checks
      const passed = totalChecks - errors - warnings;
      const score = Math.max(0, Math.round((passed / totalChecks) * 100 - errors * 5 - warnings * 2));

      const result: SeoAuditResult = {
        score: Math.min(100, score),
        issues: allIssues,
        summary: {
          errors,
          warnings,
          passed,
          total: allIssues.length,
        },
        lastAuditAt: new Date().toISOString(),
      };

      setAuditResult(result);
      return result;
    } finally {
      setIsAuditing(false);
    }
  }, [checkImageAltTexts, checkImageFormats, checkMetaTags, checkRoomDescriptions]);

  const updateAltText = useCallback(
    async (tableName: string, recordId: string, field: string, altText: string) => {
      if (field.includes("[")) {
        // Handle array field like image_alts[0]
        const match = field.match(/^([a-z_]+)\[(\d+)\]$/);
        if (!match) return;
        
        const [, arrayField, indexStr] = match;
        const index = parseInt(indexStr);

        // Get current array
        const { data } = await supabase
          .from(tableName as "rooms")
          .select(arrayField)
          .eq("id", recordId)
          .single();

        if (data) {
          const dataRecord = data as unknown as Record<string, string[]>;
          const currentArray = [...(dataRecord[arrayField] || [])];
          // Ensure array is long enough
          while (currentArray.length <= index) {
            currentArray.push("");
          }
          currentArray[index] = altText;

          await supabase
            .from(tableName as "rooms")
            .update({ [arrayField]: currentArray })
            .eq("id", recordId);
        }
      } else {
        await supabase
          .from(tableName as "rooms")
          .update({ [field]: altText })
          .eq("id", recordId);
      }
    },
    []
  );

  const getBucketForTable = (tableName: string): string => {
    const bucketMap: Record<string, string> = {
      rooms: "room-images",
      hero_slides: "hero-images",
      city_attractions: "attraction-images",
      explore_hero_slides: "explore-hero-images",
      facility_hero_slides: "facility-hero-images",
    };
    return bucketMap[tableName] || "images";
  };

  const convertImageToWebP = useCallback(
    async (
      tableName: string,
      recordId: string,
      field: string,
      imageUrl: string,
      onProgress?: (status: string) => void
    ): Promise<{ success: boolean; newUrl?: string; savedBytes?: number }> => {
      try {
        onProgress?.("Downloading...");

        // Convert URL to WebP
        const { blob, originalSize, newSize } = await convertUrlToWebP(imageUrl, 0.85);

        onProgress?.("Uploading WebP...");

        // Upload to appropriate storage bucket
        const bucket = getBucketForTable(tableName);
        const fileName = `converted/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, { contentType: "image/webp" });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        onProgress?.("Updating database...");

        // Update database with new URL
        if (field.includes("[")) {
          // Handle array field like image_urls[0]
          const match = field.match(/^([a-z_]+)\[(\d+)\]$/);
          if (!match) throw new Error("Invalid field format");
          
          const [, arrayField, indexStr] = match;
          const index = parseInt(indexStr);

          const { data } = await supabase
            .from(tableName as "rooms")
            .select(arrayField)
            .eq("id", recordId)
            .single();

          if (data) {
            const dataRecord = data as unknown as Record<string, string[]>;
            const currentArray = [...(dataRecord[arrayField] || [])];
            currentArray[index] = publicUrl;

            await supabase
              .from(tableName as "rooms")
              .update({ [arrayField]: currentArray })
              .eq("id", recordId);
          }
        } else {
          await supabase
            .from(tableName as "rooms")
            .update({ [field]: publicUrl })
            .eq("id", recordId);
        }

        const savedBytes = originalSize - newSize;
        const savedPercent = Math.round((savedBytes / originalSize) * 100);

        onProgress?.(`Done! Saved ${formatFileSize(savedBytes)} (${savedPercent}%)`);
        toast.success("Image converted to WebP", {
          description: `Saved ${formatFileSize(savedBytes)} (${savedPercent}% smaller)`,
        });

        return {
          success: true,
          newUrl: publicUrl,
          savedBytes,
        };
      } catch (error: any) {
        console.error("WebP conversion failed:", error);
        toast.error("Conversion failed", { description: error.message });
        return { success: false };
      }
    },
    []
  );

  return {
    isAuditing,
    auditResult,
    runFullAudit,
    updateAltText,
    convertImageToWebP,
    checkImageAltTexts,
    checkImageFormats,
    checkMetaTags,
  };
};












