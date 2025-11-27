import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
DropdownMenu,
DropdownMenuTrigger,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function Header() {
const [menuOpen, setMenuOpen] = useState(false);
const [scrolled, setScrolled] = useState(false);

const navigate = useNavigate();
const { settings } = useHotelSettings();
const { isLoggedIn, logout } = useAdminAuth();

// Detect scroll for fade + backdrop header
useEffect(() => {
const handleScroll = () => {
setScrolled(window.scrollY > 20);
};
window.addEventListener("scroll", handleScroll);
return () => window.removeEventListener("scroll", handleScroll);
}, []);

  // Header customization settings
  const headerBgColor = settings?.header_bg_color || '#000000';
  const headerBgOpacity = settings?.header_bg_opacity ?? 0.4;
  const headerBlur = settings?.header_blur ?? 12;
  const headerTextColor = settings?.header_text_color || '#ffffff';
  const showLogo = settings?.header_show_logo && settings?.logo_url;

  // Convert opacity (0-1) to hex (00-FF)
  const opacityHex = Math.round(headerBgOpacity * 255).toString(16).padStart(2, '0');

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "shadow-md py-2" : "py-4"
      }`}
      style={{
        backgroundColor: scrolled ? `${headerBgColor}${opacityHex}` : 'transparent',
        backdropFilter: scrolled ? `blur(${headerBlur}px)` : 'none',
        WebkitBackdropFilter: scrolled ? `blur(${headerBlur}px)` : 'none',
        color: headerTextColor,
      }}
    >
      <div className="container mx-auto flex items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          {showLogo ? (
            <img 
              src={settings.logo_url} 
              alt={settings.hotel_name || "Hotel Logo"} 
              className="h-8 object-contain"
            />
          ) : (
            <span className="font-bold text-lg" style={{ color: headerTextColor }}>
              {settings?.hotel_name ?? "Pomah Guesthouse"}
            </span>
          )}
        </Link>

        {/* Desktop Menu */}
    <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: headerTextColor }}>
      <Link to="/" className="hover:text-primary transition-colors">
        Home
      </Link>
      <Link to="/rooms" className="hover:text-primary transition-colors">
        Rooms
      </Link>
      <Link to="/gallery" className="hover:text-primary transition-colors">
        Gallery
      </Link>
      <Link to="/contact" className="hover:text-primary transition-colors">
        Contact
      </Link>

      {/* User Dropdown */}
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:text-primary transition-colors" style={{ color: headerTextColor }}>
              <User className="w-4 h-4" />
              Admin
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/admin")}>
              <Shield className="w-4 h-4 mr-2" />
              Dashboard
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/login")}
        >
          <User className="w-4 h-4 mr-2" />
          Login
        </Button>
      )}
    </nav>

    {/* Mobile Toggle */}
    <button
      className="md:hidden p-2"
      onClick={() => setMenuOpen(!menuOpen)}
      style={{ color: headerTextColor }}
    >
      {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  </div>

  {/* Mobile Menu Drawer */}
  <div
    className={`md:hidden absolute left-0 w-full bg-white shadow-xl transition-all duration-300 origin-top ${
      menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
    }`}
  >
    <nav className="flex flex-col gap-4 px-6 py-4 text-sm font-medium">
      <Link
        to="/"
        onClick={() => setMenuOpen(false)}
        className="hover:text-primary"
      >
        Home
      </Link>

      <Link
        to="/rooms"
        onClick={() => setMenuOpen(false)}
        className="hover:text-primary"
      >
        Rooms
      </Link>

      <Link
        to="/gallery"
        onClick={() => setMenuOpen(false)}
        className="hover:text-primary"
      >
        Gallery
      </Link>

      <Link
        to="/contact"
        onClick={() => setMenuOpen(false)}
        className="hover:text-primary"
      >
        Contact
      </Link>

      {isLoggedIn ? (
        <>
          <button
            onClick={() => {
              navigate("/admin");
              setMenuOpen(false);
            }}
            className="flex items-center gap-2 py-2"
          >
            <Shield className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => {
              logout();
              navigate("/");
              setMenuOpen(false);
            }}
            className="flex items-center gap-2 py-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </>
      ) : (
        <button
          className="flex items-center gap-2 py-2"
          onClick={() => {
            navigate("/login");
            setMenuOpen(false);
          }}
        >
          <User className="w-4 h-4" />
          Login
        </button>
      )}
    </nav>
  </div>
</header>
  );
}
