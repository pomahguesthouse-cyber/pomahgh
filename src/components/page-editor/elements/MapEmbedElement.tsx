import { useState, useEffect } from "react";
import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MapEmbedElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function MapEmbedElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: MapEmbedElementProps) {
  const {
    embedUrl = "",
    useHotelLocation = true,
    title = "",
    subtitle = "",
    showTitle = false,
    titleColor,
    subtitleColor,
    titleFontFamily,
    subtitleFontFamily,
    shadowEnabled = false,
    containerBgColor,
    containerPadding = "0px",
    mapHeight = "400px",
    mapBorderRadius = "8px",
    mapZoom = 15,
  } = element.props;

  const {
    width = "100%",
    marginTop,
    marginBottom,
  } = element.styles;

  const [hotelMapUrl, setHotelMapUrl] = useState<string>("");

  useEffect(() => {
    if (useHotelLocation && !embedUrl) {
      supabase
        .from("hotel_settings")
        .select("latitude, longitude, hotel_name, address, google_place_id")
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) {
            if (data.google_place_id) {
              setHotelMapUrl(
                `https://www.google.com/maps?q=place_id:${data.google_place_id}&z=${mapZoom}&output=embed`
              );
            } else if (data.latitude && data.longitude) {
              const query = encodeURIComponent(
                data.hotel_name
                  ? `${data.hotel_name}, ${data.address || ""}`
                  : `${data.latitude},${data.longitude}`
              );
              setHotelMapUrl(
                `https://www.google.com/maps?q=${query}&z=${mapZoom}&output=embed`
              );
            }
          }
        });
    }
  }, [useHotelLocation, embedUrl, mapZoom]);

  const finalUrl = embedUrl || hotelMapUrl;
  const borderRadius = mapBorderRadius;

  const containerStyle: React.CSSProperties = {
    width,
    marginTop,
    marginBottom,
    backgroundColor: containerBgColor || undefined,
    padding: containerPadding,
    borderRadius,
    ...(shadowEnabled ? { boxShadow: "0 4px 24px -4px hsl(var(--foreground) / 0.1)" } : {}),
  };

  const content = (
    <div style={containerStyle}>
      {showTitle && (title || subtitle) && (
        <div className="mb-3 text-center">
          {title && (
            <h3
              className="text-xl font-semibold"
              style={{ color: titleColor || undefined, fontFamily: titleFontFamily || undefined }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className="text-sm text-muted-foreground mt-1"
              style={{ color: subtitleColor || undefined, fontFamily: subtitleFontFamily || undefined }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      {finalUrl ? (
        <iframe
          src={finalUrl}
          width="100%"
          height={mapHeight}
          style={{ border: 0, borderRadius }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Maps"
        />
      ) : (
        <div
          className="w-full bg-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground"
          style={{ height: mapHeight, borderRadius }}
        >
          <MapPin className="h-8 w-8 opacity-40" />
          <span className="text-sm font-medium">Google Maps Embed</span>
          <span className="text-xs opacity-60">
            Aktifkan "Gunakan Lokasi Hotel" atau paste embed URL
          </span>
        </div>
      )}
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
