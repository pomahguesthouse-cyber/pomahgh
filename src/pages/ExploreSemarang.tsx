import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ExploreSEO } from "@/components/explore/ExploreSEO";
import { ExploreHero } from "@/components/explore/ExploreHero";
import { ExploreIntro } from "@/components/explore/ExploreIntro";
import { FeaturedAttractions } from "@/components/explore/FeaturedAttractions";
import { CategoryTabs } from "@/components/explore/CategoryTabs";
import { NearbyFromHotel } from "@/components/explore/NearbyFromHotel";
import { GettingHere } from "@/components/explore/GettingHere";
import { ExploreCTA } from "@/components/explore/ExploreCTA";
import { useCityAttractions } from "@/hooks/useCityAttractions";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

const ExploreSemarang = () => {
  const { attractions, isLoading } = useCityAttractions();

  return (
    <div className="min-h-screen bg-background">
      <ExploreSEO attractions={attractions} />
      <Header />
      
      <main>
        <ExploreHero />
        
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
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
        <GettingHere />
        <ExploreCTA />
      </main>
      
      <Footer />
    </div>
  );
};

export default ExploreSemarang;
