import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useHotelSettings } from "@/hooks/useHotelSettings";

export const Footer = () => {
  const { settings } = useHotelSettings();

  return (
    <footer className="bg-primary text-primary-foreground py-12 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">
              {settings?.hotel_name?.toUpperCase() || "POMAH GUESTHOUSE"}
            </h3>
            <p className="text-primary-foreground/80">
              {settings?.description || "Your tropical paradise awaits in the heart of Bali's most beautiful landscapes."}
            </p>
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
              {settings?.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings?.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings?.twitter_url && (
                <a
                  href={settings.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {settings?.youtube_url && (
                <a
                  href={settings.youtube_url}
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
          <p>&copy; {new Date().getFullYear()} {settings?.hotel_name || "Pomah Guesthouse"}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
