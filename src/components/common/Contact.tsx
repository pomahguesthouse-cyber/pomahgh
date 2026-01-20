import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail } from "lucide-react";
import { useHotelSettings } from "@/hooks/shared/useHotelSettings";
import { EditableText } from '@/components/admin/editor-mode/EditableText';
import { usePublicOverrides } from '@/contexts/PublicOverridesContext';
import { useWidgetStyles } from '@/hooks/shared/useWidgetStyles';
import { useContext, useState } from 'react';
import { EditorModeContext } from '@/contexts/EditorModeContext';

interface ContactProps {
  editorMode?: boolean;
}

export const Contact = ({ editorMode = false }: ContactProps) => {
  const { settings: hotelSettings } = useHotelSettings();
  const { getElementStyles } = usePublicOverrides();
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? editorMode;
  const { settings, lineStyle, buttonStyle } = useWidgetStyles('contact');
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  
  const heading = settings.title_override || "Get in Touch";
  const subtext = settings.subtitle_override || "Ready to experience paradise? Contact us to book your stay or ask any questions.";

  const fullAddress = [
    hotelSettings?.address,
    hotelSettings?.city,
    hotelSettings?.state,
    hotelSettings?.postal_code,
    hotelSettings?.country,
  ]
    .filter(Boolean)
    .join(", ");

  // Compute button styles from widget settings
  const computedButtonStyle: React.CSSProperties = settings.button_bg_color
    ? {
        background: isButtonHovered && settings.button_hover_color 
          ? settings.button_hover_color 
          : settings.button_bg_color,
        color: settings.button_text_color || undefined,
        borderRadius: settings.button_border_radius !== 'default' 
          ? settings.button_border_radius 
          : undefined,
      }
    : {};

  return (
    <section id="contact" className="py-20 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16 animate-slide-up">
          {isEditorMode ? (
            <EditableText
              widgetId="contact"
              field="title"
              value={heading}
              as="h2"
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2"
            />
          ) : (
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2"
              style={getElementStyles('contact-title')}
            >
              {heading}
            </h2>
          )}
          
          {/* Line with widget styling */}
          <div 
            className="h-1 bg-primary mx-auto mb-4 sm:mb-6"
            style={{
              width: lineStyle.width || '96px',
              height: lineStyle.height || '4px',
              backgroundColor: lineStyle.backgroundColor || undefined,
            }}
          />
          
          {isEditorMode ? (
            <EditableText
              widgetId="contact"
              field="subtitle"
              value={subtext}
              as="p"
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
            />
          ) : (
            <p 
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
              style={getElementStyles('contact-subtitle')}
            >
              {subtext}
            </p>
          )}
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

              <Button 
                variant="luxury" 
                size="lg" 
                className="w-full"
                style={computedButtonStyle}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
              >
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};












