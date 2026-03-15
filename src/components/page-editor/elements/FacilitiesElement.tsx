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
          <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-32" />
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada fasilitas</p>
        ) : (
          <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${Math.min(columns, facilities.length)}, 1fr)` }}>
            {facilities.map((facility) => {
              const IconComp = getIcon(facility.icon_name);
              
              if (layout === "minimal") {
                return (
                  <div key={facility.id} className="flex items-center gap-3 p-3">
                    <IconComp className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-sm">{facility.title}</h3>
                      <p className="text-xs text-muted-foreground">{facility.description}</p>
                    </div>
                  </div>
                );
              }

              if (layout === "icon-center") {
                return (
                  <div key={facility.id} className="flex flex-col items-center text-center p-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <IconComp className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{facility.title}</h3>
                    <p className="text-xs text-muted-foreground">{facility.description}</p>
                  </div>
                );
              }

              // card layout (default)
              return (
                <div key={facility.id} className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <IconComp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{facility.title}</h3>
                  <p className="text-sm text-muted-foreground">{facility.description}</p>
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
      element={element}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {content}
    </ElementWrapper>
  );
}
