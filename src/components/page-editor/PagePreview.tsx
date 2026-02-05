 import { useEffect, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useEditorStore } from "@/stores/editorStore";
 import { LandingPageHeroSlider, HeroSlide } from "@/components/landing/LandingPageHeroSlider";
 import { LandingRoomSlider } from "@/components/landing/LandingRoomSlider";
 import Markdown from "react-markdown";
 import { Button } from "@/components/ui/button";
 import { MessageCircle } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface PageData {
   hero_headline: string;
   subheadline?: string;
   hero_image_url?: string;
   hero_slides?: HeroSlide[];
   page_content?: string;
   cta_text?: string;
   whatsapp_number?: string;
   whatsapp_message_template?: string;
 }
 
 export function PagePreview() {
   const { pageSettings, viewMode } = useEditorStore();
   const [pageData, setPageData] = useState<PageData | null>(null);
   const [isLoading, setIsLoading] = useState(true);
 
   useEffect(() => {
     const loadPageData = async () => {
       if (!pageSettings.id) {
         setIsLoading(false);
         return;
       }
 
       try {
         const { data, error } = await supabase
           .from("landing_pages")
           .select("hero_headline, subheadline, hero_image_url, hero_slides, page_content, cta_text, whatsapp_number, whatsapp_message_template")
           .eq("id", pageSettings.id)
           .single();
 
         if (error) throw error;
         
         // Parse hero_slides
         const heroSlides = data.hero_slides 
           ? (Array.isArray(data.hero_slides) ? data.hero_slides : [])
           : data.hero_image_url 
             ? [{ id: 'legacy', image_url: data.hero_image_url, alt_text: data.hero_headline }]
             : [];
 
         setPageData({
           ...data,
           hero_slides: heroSlides as HeroSlide[],
         });
       } catch (error) {
         console.error("Error loading page data:", error);
       } finally {
         setIsLoading(false);
       }
     };
 
     loadPageData();
   }, [pageSettings.id]);
 
   const getPreviewWidth = () => {
     switch (viewMode) {
       case "mobile":
         return "375px";
       case "tablet":
         return "768px";
       default:
         return "100%";
     }
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center min-h-[400px]">
         <div className="animate-pulse text-muted-foreground">Loading preview...</div>
       </div>
     );
   }
 
   if (!pageData) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-border rounded-lg">
         <div className="text-center text-muted-foreground">
           <p className="text-lg font-medium mb-2">Halaman Baru</p>
           <p className="text-sm">Simpan halaman terlebih dahulu untuk melihat preview</p>
         </div>
       </div>
     );
   }
 
   return (
     <div 
       style={{ width: getPreviewWidth(), maxWidth: "100%" }}
       className={cn(
         "bg-background shadow-lg rounded-lg overflow-hidden transition-all",
         viewMode !== "desktop" && "mx-auto"
       )}
     >
       {/* Hero Section */}
       {pageData.hero_slides && pageData.hero_slides.length > 0 && (
         <LandingPageHeroSlider 
           slides={pageData.hero_slides} 
           headline={pageData.hero_headline}
           subheadline={pageData.subheadline}
         />
       )}
 
       {/* Content Section */}
       <div className="px-4 md:px-8 py-8">
         {/* CTA Block */}
         {pageData.cta_text && (
           <div className="mb-8 p-6 bg-primary/10 rounded-xl border border-primary/20 text-center">
             <p className="text-lg font-medium text-foreground mb-4">
               {pageData.cta_text}
             </p>
             <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
               <MessageCircle className="h-5 w-5" />
               Hubungi via WhatsApp
             </Button>
           </div>
         )}
 
         {/* Markdown Content */}
         {pageData.page_content && (
           <article className="prose prose-lg md:prose-xl max-w-4xl mx-auto 
             prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
             prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:mt-8 prose-h1:mb-4
             prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-primary
             prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-6 prose-h3:mb-3
             prose-p:text-muted-foreground prose-p:leading-relaxed
             prose-strong:text-foreground prose-strong:font-semibold
             prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
             prose-ul:space-y-2 prose-ol:space-y-2
             prose-li:text-muted-foreground
             prose-a:text-primary prose-a:no-underline hover:prose-a:underline
             prose-img:rounded-xl prose-img:shadow-lg">
             <Markdown>{pageData.page_content}</Markdown>
           </article>
         )}
 
         {/* Room Slider */}
         <div className="mt-12">
           <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
             Pilihan Kamar Kami
           </h2>
           <LandingRoomSlider />
         </div>
 
         {/* Footer CTA */}
         <div className="mt-12 p-8 bg-primary rounded-2xl text-center">
           <h3 className="text-xl md:text-2xl font-bold mb-4 text-primary-foreground">
             Booking Sekarang!
           </h3>
           <p className="text-primary-foreground/90 mb-6">
             Jangan sampai kehabisan kamar di momen spesial Anda
           </p>
           <Button size="lg" variant="secondary" className="gap-2">
             <MessageCircle className="h-5 w-5" />
             Chat via WhatsApp
           </Button>
         </div>
       </div>
     </div>
   );
 }