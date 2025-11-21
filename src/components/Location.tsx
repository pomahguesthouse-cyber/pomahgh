import { MapPin, Phone, Mail } from "lucide-react";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { Card, CardContent } from "@/components/ui/card";
export const Location = () => {
  const {
    settings,
    isLoading
  } = useHotelSettings();
  if (isLoading || !settings) {
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
  } = settings;
  const fullAddress = [address, city, state, postal_code, country].filter(Boolean).join(", ");
  const mapUrl = latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}&output=embed` : `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;
  return <section id="location" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Lokasi Kami</h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Temukan kami di lokasi strategis yang mudah diakses
          </p>
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

          {/* Contact Info */}
          
        </div>
      </div>
    </section>;
};