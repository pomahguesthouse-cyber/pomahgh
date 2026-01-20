import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityAttraction } from "@/hooks/explore/useCityAttractions";
import { AttractionCard } from "./AttractionCard";
import { Building2, UtensilsCrossed, TreePine, ShoppingBag, Sparkles } from "lucide-react";

interface CategoryTabsProps {
  attractions: CityAttraction[];
}

const categories = [
  { value: "all", label: "Semua", icon: Sparkles },
  { value: "wisata", label: "Wisata", icon: Building2 },
  { value: "kuliner", label: "Kuliner", icon: UtensilsCrossed },
  { value: "alam", label: "Alam", icon: TreePine },
  { value: "belanja", label: "Belanja", icon: ShoppingBag },
];

export const CategoryTabs = ({ attractions }: CategoryTabsProps) => {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Jelajahi Berdasarkan Kategori
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Temukan destinasi menarik di Semarang sesuai minat Anda
          </p>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto mb-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger
                  key={category.value}
                  value={category.value}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-full border"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {category.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {attractions.map((attraction, index) => (
                <AttractionCard key={attraction.id} attraction={attraction} index={index} />
              ))}
            </div>
          </TabsContent>
          
          {categories.slice(1).map((category) => (
            <TabsContent key={category.value} value={category.value} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {attractions
                  .filter((a) => a.category === category.value)
                  .map((attraction, index) => (
                    <AttractionCard key={attraction.id} attraction={attraction} index={index} />
                  ))}
              </div>
              {attractions.filter((a) => a.category === category.value).length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  Belum ada destinasi di kategori ini
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};












