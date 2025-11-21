import * as Icons from "lucide-react";
import { useFacilities } from "@/hooks/useFacilities";
import { Loader2 } from "lucide-react";

export const Amenities = () => {
  const { data: facilities, isLoading } = useFacilities();

  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    return IconComponent || Icons.Circle;
  };

  if (isLoading) {
    return (
      <section id="amenities" className="py-20 px-4 bg-background">
        <div className="container mx-auto flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </section>
    );
  }

  if (!facilities || facilities.length === 0) {
    return null;
  }

  return (
    <section id="amenities" className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-12 sm:mb-16 animate-slide-up">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2">
            Facilities
          </h2>
          <div className="w-16 sm:w-24 h-1 bg-primary mx-auto mb-4 sm:mb-6"></div>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Indulge in world-class facilities designed to elevate your stay and create 
            unforgettable memories.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {facilities.map((facility) => {
            const Icon = getIconComponent(facility.icon_name);
            return (
              <div
                key={facility.id}
                className="text-center p-4 sm:p-6 rounded-lg bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-primary/10 mb-3 sm:mb-4">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-2">
                  {facility.title}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{facility.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
