import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { EditableText } from '@/components/admin/editor-mode/EditableText';
import { usePublicOverrides } from '@/contexts/PublicOverridesContext';
import { useWidgetStyles } from '@/hooks/useWidgetStyles';
import { useContext } from 'react';
import { EditorModeContext } from '@/contexts/EditorModeContext';

interface FooterProps {
  editorMode?: boolean;
}

export const Footer = ({ editorMode = false }: FooterProps) => {
  const { settings: hotelSettings } = useHotelSettings();
  const { getElementStyles } = usePublicOverrides();
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? editorMode;
  const { settings, contentStyle } = useWidgetStyles('footer');
  
  const hotelName = settings.title_override || hotelSettings?.hotel_name?.toUpperCase() || "POMAH GUESTHOUSE";
  const description = settings.subtitle_override || hotelSettings?.description || "Your tropical paradise awaits in the heart of Bali's most beautiful landscapes.";

  // Apply footer background from widget settings if specified
  const footerBgStyle: React.CSSProperties = settings.content_bg_color && settings.content_bg_color !== 'transparent'
    ? { backgroundColor: settings.content_bg_color }
    : {};

  return (
    <footer 
      className="bg-primary text-primary-foreground py-12 px-4"
      style={footerBgStyle}
    >
      <div className="container mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            {isEditorMode ? (
              <EditableText
                widgetId="footer"
                field="title"
                value={hotelName}
                as="h3"
                className="text-2xl font-bold mb-4"
              />
            ) : (
              <h3 
                className="text-2xl font-bold mb-4"
                style={getElementStyles('footer-title')}
              >
                {hotelName}
              </h3>
            )}
            {isEditorMode ? (
              <EditableText
                widgetId="footer"
                field="subtitle"
                value={description}
                as="p"
                multiline
                className="text-primary-foreground/80"
              />
            ) : (
              <p 
                className="text-primary-foreground/80"
                style={getElementStyles('footer-subtitle')}
              >
                {description}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/#home" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/#rooms" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Rooms
                </Link>
              </li>
              <li>
                <Link to="/explore-semarang" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Explore Semarang
                </Link>
              </li>
              <li>
                <Link to="/#amenities" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Amenities
                </Link>
              </li>
              <li>
                <Link to="/#contact" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-lg font-bold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              {hotelSettings?.facebook_url && (
                <a
                  href={hotelSettings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {hotelSettings?.instagram_url && (
                <a
                  href={hotelSettings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {hotelSettings?.twitter_url && (
                <a
                  href={hotelSettings.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {hotelSettings?.youtube_url && (
                <a
                  href={hotelSettings.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} {hotelSettings?.hotel_name || "Pomah Guesthouse"}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
