import { motion } from "framer-motion";
import { CityAttraction } from "@/hooks/useCityAttractions";
import { AttractionCard } from "./AttractionCard";
import { Star } from "lucide-react";

interface FeaturedAttractionsProps {
  attractions: CityAttraction[];
}

export const FeaturedAttractions = ({ attractions }: FeaturedAttractionsProps) => {
  const featuredAttractions = attractions.filter((a) => a.is_featured).slice(0, 4);
  
  if (featuredAttractions.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <span className="text-yellow-600 font-medium tracking-wider uppercase text-sm">
              Must Visit
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Destinasi Unggulan
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jangan lewatkan tempat-tempat ikonik yang wajib dikunjungi saat di Semarang
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredAttractions.map((attraction, index) => (
            <AttractionCard 
              key={attraction.id} 
              attraction={attraction} 
              index={index}
              featured
            />
          ))}
        </div>
      </div>
    </section>
  );
};
