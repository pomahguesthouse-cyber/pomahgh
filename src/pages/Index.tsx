import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import OptimizedHero from "@/components/OptimizedHero";
import { Welcome } from "@/components/Welcome";
import { GoogleRating } from "@/components/GoogleRating";
import { Rooms } from "@/components/Rooms";
import { Amenities } from "@/components/Amenities";
import { Location } from "@/components/Location";
import { NewsEvents } from "@/components/NewsEvents";
import { Footer } from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { PublicPageRenderer } from "@/components/page-editor/PublicPageRenderer";
import { EditorElement } from "@/stores/editorStore";
import { queryKeys, queryPresets } from "@/lib/query";

const Index = () => {
  const location = useLocation();

  const { data: homepageSchema } = useQuery({
    queryKey: queryKeys.sitePages.homepage,
    ...queryPresets.publicPage,
    queryFn: async () => {
      const { data: homepageByFlag, error: homepageErr } = await supabase
        .from("site_pages")
        .select("page_schema")
        .eq("status", "published")
        .eq("is_homepage", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (homepageErr) throw homepageErr;

      let data = homepageByFlag;

      if (!data) {
        const { data: fallbackHome, error: fallbackErr } = await supabase
          .from("site_pages")
          .select("page_schema")
          .eq("route_path", "/")
          .eq("status", "published")
          .maybeSingle();

        if (fallbackErr) throw fallbackErr;
        data = fallbackHome;
      }

      if (!data) return null;
      return Array.isArray(data.page_schema) ? (data.page_schema as unknown as EditorElement[]) : null;
    },
  });

  // Handle hash navigation from other pages
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [location.hash]);

  if (homepageSchema && homepageSchema.length > 0) {
    return <PublicPageRenderer elements={homepageSchema} />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <OptimizedHero />
        <Welcome />
        <GoogleRating />
        <Rooms />
        <Amenities />
        <Location />
        <NewsEvents />
      </main>
      <Footer />
      <ChatbotWidget />
      {/* Hidden on mobile (already handled by component) */}
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;
