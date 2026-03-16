import { useState, useEffect } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { icons, Circle, type LucideIcon, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface NearbyLocationsElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

interface LocationData {
  id: string;
  name: string;
  category: string;
  icon_name: string;
  distance_km: number;
  travel_time_minutes: number;
}

const getIcon = (name: string): LucideIcon => {
  return (icons[name as keyof typeof icons] as LucideIcon) || Circle;
};

export function NearbyLocationsElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: NearbyLocationsElementProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  const title = element.props.title || "Lokasi Terdekat";
  const columns = element.props.columns || 2;
  const layout = element.props.layout || "list";

  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .from("nearby_locations")
        .select("id, name, category, icon_name, distance_km, travel_time_minutes")
        .eq("is_active", true)
        .order("display_order");
      if (data) setLocations(data);
      setLoading(false);
    };
    fetchLocations();
  }, []);

  const categoryLabels: Record<string, string> = {
    transport: "Transportasi",
    shopping: "Belanja",
    culinary: "Kuliner",
    landmark: "Landmark",
    education: "Pendidikan",
    health: "Kesehatan",
  };

  const content = (
    <div className="w-full py-8" style={{ backgroundColor: element.styles.backgroundColor || undefined }}>
      <div className="max-w-7xl mx-auto px-4">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: element.styles.color || undefined }}>
            {title}
          </h2>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-muted rounded-lg h-16" />
            ))}
          </div>
        ) : locations.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada lokasi terdekat</p>
        ) : layout === "card" ? (
          <div className={cn(
            "grid gap-3 md:gap-4",
            "grid-cols-1 sm:grid-cols-2",
            columns >= 3 && "lg:grid-cols-3",
            columns >= 4 && "xl:grid-cols-4",
          )}>
            {locations.map((loc) => {
              const IconComp = getIcon(loc.icon_name);
              return (
                <div key={loc.id} className="bg-card rounded-xl p-4 md:p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IconComp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-0.5">{loc.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize mb-2">
                        {categoryLabels[loc.category] || loc.category}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {loc.distance_km} km
                        </span>
                        <span>~{loc.travel_time_minutes} menit</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // list layout
          <div className={cn(
            "grid gap-2 md:gap-3",
            "grid-cols-1 sm:grid-cols-2",
            columns >= 3 && "lg:grid-cols-3",
          )}>
            {locations.map((loc) => {
              const IconComp = getIcon(loc.icon_name);
              return (
                <div key={loc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <IconComp className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{loc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {loc.distance_km} km • ~{loc.travel_time_minutes} min
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isPreview) return content;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {content}
    </ElementWrapper>
  );
}
