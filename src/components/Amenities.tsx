import { Waves, Utensils, Wifi, Sparkles, Coffee, Wind } from "lucide-react";

const amenities = [
  {
    icon: Waves,
    title: "Infinity Pool",
    description: "Stunning infinity pool overlooking the ocean, perfect for sunset relaxation.",
  },
  {
    icon: Utensils,
    title: "Fine Dining",
    description: "Authentic Balinese and international cuisine prepared by expert chefs.",
  },
  {
    icon: Wifi,
    title: "High-Speed WiFi",
    description: "Complimentary fast internet access throughout the property.",
  },
  {
    icon: Sparkles,
    title: "Spa Services",
    description: "Traditional Balinese massage and wellness treatments available.",
  },
  {
    icon: Coffee,
    title: "Breakfast Included",
    description: "Daily tropical breakfast served with fresh local ingredients.",
  },
  {
    icon: Wind,
    title: "Ocean Breeze",
    description: "Prime beachfront location with direct access to pristine beaches.",
  },
];

export const Amenities = () => {
  return (
    <section id="amenities" className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Premium Amenities
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Indulge in world-class facilities designed to elevate your stay and create 
            unforgettable memories.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {amenities.map((amenity, index) => {
            const Icon = amenity.icon;
            return (
              <div
                key={index}
                className="text-center p-6 rounded-lg bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {amenity.title}
                </h3>
                <p className="text-muted-foreground">{amenity.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
