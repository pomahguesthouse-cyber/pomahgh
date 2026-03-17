import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExploreSEO } from "@/components/explore/ExploreSEO";
import { ExploreHeroSlider } from "@/components/explore/ExploreHeroSlider";
import { ExploreIntro } from "@/components/explore/ExploreIntro";
import { FeaturedAttractions } from "@/components/explore/FeaturedAttractions";
import { CategoryTabs } from "@/components/explore/CategoryTabs";
import { NearbyFromHotel } from "@/components/explore/NearbyFromHotel";
import { GettingHere } from "@/components/explore/GettingHere";
import { ExploreCTA } from "@/components/explore/ExploreCTA";
import UpcomingEvents from "@/components/explore/UpcomingEvents";
import { useCityAttractions } from "@/hooks/useCityAttractions";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicPageRenderer } from "@/components/page-editor/PublicPageRenderer";
import { EditorElement } from "@/stores/editorStore";

const ExploreSemarang = () => {
  const { attractions, isLoading } = useCityAttractions();
  const { data: exploreSchema } = useQuery({
    queryKey: ["site-page-route", "/explore-semarang"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("page_schema, status")
        .eq("route_path", "/explore-semarang")
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return Array.isArray(data.page_schema) ? (data.page_schema as unknown as EditorElement[]) : null;
    },
  });

  if (exploreSchema && exploreSchema.length > 0) {
    return <PublicPageRenderer elements={exploreSchema} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ExploreSEO attractions={attractions} />
      <Header />
      
      <main>
        <ExploreHeroSlider />
        
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb
            items={[
              { label: "Explore Semarang" },
            ]}
          />
        </div>
        
        <ExploreIntro />
        
        {isLoading ? (
          <div className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <FeaturedAttractions attractions={attractions} />
            <CategoryTabs attractions={attractions} />
          </>
        )}
        
        <NearbyFromHotel />
        <UpcomingEvents />
        <GettingHere />
        <ExploreCTA />
      </main>
      
      <Footer />
    </div>
  );
};

export default ExploreSemarang;
