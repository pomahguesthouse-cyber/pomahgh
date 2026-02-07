import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Clock, Star } from "lucide-react";
import * as Icons from "lucide-react";
import { CityAttraction } from "@/hooks/useCityAttractions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface AttractionCardProps {
  attraction: CityAttraction;
  index?: number;
  featured?: boolean;
}

const categoryColors: Record<string, string> = {
  wisata: "bg-blue-500",
  kuliner: "bg-orange-500",
  alam: "bg-green-500",
  belanja: "bg-purple-500",
  budaya: "bg-red-500",
};

const categoryLabels: Record<string, string> = {
  wisata: "Wisata",
  kuliner: "Kuliner",
  alam: "Alam",
  belanja: "Belanja",
  budaya: "Budaya",
};

export const AttractionCard = ({ attraction, index = 0, featured = false }: AttractionCardProps) => {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[attraction.icon_name] || Icons.MapPin;
  
  const defaultImages: Record<string, string> = {
    wisata: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80",
    kuliner: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    alam: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    belanja: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80",
  };
  
  const imageUrl = attraction.image_url || defaultImages[attraction.category] || defaultImages.wisata;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link to={`/explore-semarang/${attraction.slug}`}>
        <Card className={`group overflow-hidden hover:shadow-xl transition-all duration-300 ${featured ? 'h-full' : ''}`}>
          <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-48'}`}>
            <OptimizedImage
              src={imageUrl}
              alt={attraction.name}
              width={featured ? 600 : 400}
              height={featured ? 256 : 192}
              placeholder="blur"
              className={`w-full ${featured ? 'h-64' : 'h-48'} group-hover:scale-110 transition-transform duration-500`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Category Badge */}
            <Badge className={`absolute top-3 left-3 ${categoryColors[attraction.category]} text-white border-0`}>
              {categoryLabels[attraction.category]}
            </Badge>
            
            {/* Featured Star */}
            {attraction.is_featured && (
              <div className="absolute top-3 right-3 bg-yellow-500 p-1.5 rounded-full">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
            )}
            
            {/* Icon */}
            <div className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <IconComponent className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <CardContent className="p-4">
            <h3 className={`font-semibold text-foreground group-hover:text-primary transition-colors ${featured ? 'text-xl' : 'text-lg'}`}>
              {attraction.name}
            </h3>
            
            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
              {attraction.description}
            </p>
            
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              {attraction.distance_km && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{attraction.distance_km} km</span>
                </div>
              )}
              {attraction.travel_time_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{attraction.travel_time_minutes} menit</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};
