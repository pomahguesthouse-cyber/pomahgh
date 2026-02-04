import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { memo } from 'react';

interface FooterProps {
  editorMode?: boolean;
}

export const Footer = memo(({ editorMode = false }: FooterProps) => {
  const { settings: hotelSettings } = useHotelSettings();

  const hotelName = hotelSettings?.hotel_name?.toUpperCase() || "POMAH GUESTHOUSE";
  const description = hotelSettings?.description || "Your tropical paradise awaits in the heart of Bali's most beautiful landscapes.";

  return (
    <footer className="bg-primary text-primary-foreground py-8 sm:py-10 md:py-12 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Brand */}
          <div className="text-center sm:text-left">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-4 font-sans">
              {hotelName}
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-primary-foreground/80">
              {description}
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center sm:text-left">
            <h4 className="text-sm sm:text-base md:text-lg font-bold mb-2 sm:mb-4 font-mono">Quick Links</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base">
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
          <div className="text-center sm:text-left">
            <h4 className="text-sm sm:text-base md:text-lg font-bold mb-2 sm:mb-4 font-mono">Follow Us</h4>
            <div className="flex gap-3 sm:gap-4 justify-center sm:justify-start">
              {hotelSettings?.facebook_url && (
                <a href={hotelSettings.facebook_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              )}
              {hotelSettings?.instagram_url && (
                <a href={hotelSettings.instagram_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              )}
              {hotelSettings?.twitter_url && (
                <a href={hotelSettings.twitter_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
                  <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              )}
              {hotelSettings?.youtube_url && (
                <a href={hotelSettings.youtube_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
                  <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-4 sm:pt-6 md:pt-8 text-center text-primary-foreground/60">
          <p className="text-xs sm:text-sm">&copy; {new Date().getFullYear()} {hotelSettings?.hotel_name || "Pomah Guesthouse"}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
