import { MapPin, Phone, Mail, Clock, Navigation } from "lucide-react";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useNearbyLocations } from "@/hooks/useNearbyLocations";
import { Card, CardContent } from "@/components/ui/card";
import * as LucideIcons from "lucide-react";
import { useContext } from "react";
import { EditorModeContext } from "@/contexts/EditorModeContext";
import { EditableText } from "@/components/admin/editor-mode/EditableText";
import { usePublicOverrides } from "@/contexts/PublicOverridesContext";
import { useWidgetStyles } from "@/hooks/useWidgetStyles";
export const Location = () => {
  const {
    settings: hotelSettings,
    isLoading
  } = useHotelSettings();
  const {
    locations,
    isLoading: locationsLoading
  } = useNearbyLocations();
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? false;
  const {
    getElementStyles
  } = usePublicOverrides();
  const {
    settings,
    lineStyle
  } = useWidgetStyles('location');
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || MapPin;
    return Icon;
  };

  // Get text from widget settings or use defaults
  const title = settings.title_override || "Lokasi Kami";
  const subtitle = settings.subtitle_override || "Temukan kami di lokasi strategis yang mudah diakses";
  if (isLoading || !hotelSettings) {
    return null;
  }
  const {
    latitude,
    longitude,
    address,
    city,
    state,
    postal_code,
    country,
    phone_primary,
    email_primary,
    hotel_name
  } = hotelSettings;
  const fullAddress = [address, city, state, postal_code, country].filter(Boolean).join(", ");
  const mapUrl = latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}&output=embed` : `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;
  return <section id="location" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          {isEditorMode ? <EditableText widgetId="location" field="title" value={title} as="h2" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" /> : <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 font-sans text-primary" style={getElementStyles('location-title')}>
              {title}
            </h2>}
          
          {/* Line with widget styling */}
          {settings.line_height && settings.line_height > 0 && <div className="h-1 bg-primary mx-auto mb-3 sm:mb-4" style={{
          width: lineStyle.width || '96px',
          height: lineStyle.height || '4px',
          backgroundColor: lineStyle.backgroundColor || undefined
        }} />}
          
          {isEditorMode ? <EditableText widgetId="location" field="subtitle" value={subtitle} as="p" className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto" /> : <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto font-sans" style={getElementStyles('location-subtitle')}>
              {subtitle}
            </p>}
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Map */}
          <Card className="overflow-hidden h-[300px] sm:h-[400px] md:h-[450px]">
            <CardContent className="p-0 h-full">
              <iframe src={mapUrl} width="100%" height="100%" style={{
              border: 0
            }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Map of ${hotel_name}`} />
            </CardContent>
          </Card>

          {/* Nearby Locations */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2 sm:text-lg">
                <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Lokasi Terdekat (Radius 5km)
              </h3>
              
              {locationsLoading ? <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="w-10 h-10 bg-muted rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>)}
                </div> : locations && locations.length > 0 ? <div className="space-y-3">
                  {locations.map(location => {
                const Icon = getIcon(location.icon_name);
                return <div key={location.id} className="flex items-center p-3 sm:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors gap-[10px] px-[10px] py-[5px]">
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-destructive-foreground">
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate sm:text-sm">
                            {location.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                            {location.category}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-primary">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                            {location.distance_km} km
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            ~{location.travel_time_minutes} menit
                          </div>
                        </div>
                      </div>;
              })}
                </div> : <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada data lokasi terdekat.
                </p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>;
};