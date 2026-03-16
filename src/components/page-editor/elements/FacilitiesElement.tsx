import { useState, useEffect } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { icons, Circle, type LucideIcon } from "lucide-react";

interface FacilitiesElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

interface FacilityData {
  id: string;
  title: string;
  description: string;
  icon_name: string;
}

const getIcon = (name: string): LucideIcon => {
  return (icons[name as keyof typeof icons] as LucideIcon) || Circle;
};

export function FacilitiesElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: FacilitiesElementProps) {
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [loading, setLoading] = useState(true);

  const title = element.props.title || "Fasilitas Hotel";
  const columns = element.props.columns || 3;
  const layout = element.props.layout || "card";

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data } = await supabase
        .from("facilities")
        .select("id, title, description, icon_name")
        .eq("is_active", true)
        .order("display_order");
      if (data) setFacilities(data);
      setLoading(false);
    };
    fetchFacilities();
  }, []);

  const content = (
    <div className="w-full py-8" style={{ backgroundColor: element.styles.backgroundColor || undefined }}>
      <div className="max-w-7xl mx-auto px-4">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: element.styles.color || undefined }}>
            {title}
          </h2>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-32" />
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada fasilitas</p>
        ) : (
          <div className={cn(
            "grid gap-4 md:gap-6",
            "grid-cols-1 sm:grid-cols-2",
            columns >= 3 && "lg:grid-cols-3",
            columns >= 4 && "xl:grid-cols-4",
          )}>
            {facilities.map((facility) => {
              const IconComp = getIcon(facility.icon_name);
              
              if (layout === "minimal") {
                return (
                  <div key={facility.id} className="flex items-center gap-3 p-3">
                    <IconComp className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-sm">{facility.title}</h3>
                      <p className="text-xs text-muted-foreground">{facility.description}</p>
                    </div>
                  </div>
                );
              }

              if (layout === "icon-center") {
                return (
                  <div key={facility.id} className="flex flex-col items-center text-center p-4 md:p-6">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <IconComp className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{facility.title}</h3>
                    <p className="text-xs text-muted-foreground">{facility.description}</p>
                  </div>
                );
              }

              // card layout (default)
              return (
                <div key={facility.id} className="bg-card rounded-xl p-4 md:p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                    <IconComp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">{facility.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{facility.description}</p>
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
