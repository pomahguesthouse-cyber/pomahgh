import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail } from "lucide-react";
import { useHotelSettings } from "@/hooks/useHotelSettings";

interface ContactProps {
  editorMode?: boolean;
}

export const Contact = ({ editorMode = false }: ContactProps) => {
  const { settings: hotelSettings } = useHotelSettings();
  
  const heading = "Get in Touch";
  const subtext = "Ready to experience paradise? Contact us to book your stay or ask any questions.";

  const fullAddress = [
    hotelSettings?.address,
    hotelSettings?.city,
    hotelSettings?.state,
    hotelSettings?.postal_code,
    hotelSettings?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section id="contact" className="py-20 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16 animate-slide-up">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2">
            {heading}
          </h2>
          
          <div className="h-1 bg-primary mx-auto mb-4 sm:mb-6 w-24" />
          
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            {subtext}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">Location</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {fullAddress || "Jimbaran Beach, Bali, Indonesia, 80361"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">Phone</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {hotelSettings?.phone_primary || "+62 361 123 4567"}
                  {hotelSettings?.phone_secondary && (
                    <>
                      <br />
                      {hotelSettings.phone_secondary}
                    </>
                  )}
                  <br />
                  Available 24/7
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">Email</h3>
                <p className="text-muted-foreground">
                  {hotelSettings?.email_primary || "info@pomahguesthouse.com"}
                  {hotelSettings?.email_reservations && (
                    <>
                      <br />
                      {hotelSettings.email_reservations}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card p-4 sm:p-6 md:p-8 rounded-lg shadow-lg">
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your stay preferences..."
                  className="w-full min-h-32"
                />
              </div>

              <Button variant="luxury" size="lg" className="w-full">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
