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
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Facilities
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
                className="text-center p-6 rounded-lg bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {facility.title}
                </h3>
                <p className="text-muted-foreground">{facility.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
