import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelSettings } from "@/hooks/useHotelSettings";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { settings } = useHotelSettings();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (id: string) => {
    setIsMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      {/* FLOATING BAR */}
      <div
        className={`
          pointer-events-auto
          mx-auto max-w-7xl
          transition-all duration-300 ease-in-out
          rounded-2xl
          bg-primary
          ${isScrolled ? "h-14 shadow-xl" : "h-[72px] shadow-lg"}
        `}
      >
        <div className="h-full px-6 flex items-center justify-between">
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={settings?.logo_url || "/logo.png"}
              alt="Pomah Guesthouse"
              className={`
                transition-all duration-300 object-contain
                ${isScrolled ? "h-8" : "h-10"}
              `}
            />
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-8 text-white text-sm font-medium">
            <button onClick={() => handleNav("home")} className="hover:opacity-80">
              Home
            </button>
            <button onClick={() => handleNav("rooms")} className="hover:opacity-80">
              Rooms
            </button>
            <Link to="/explore-semarang" className="hover:opacity-80">
              Explore Semarang
            </Link>
            <button onClick={() => handleNav("amenities")} className="hover:opacity-80">
              Facilities
            </button>
            <button onClick={() => handleNav("news-events")} className="hover:opacity-80">
              News & Events
            </button>
          </nav>

          {/* USER ICON */}
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button size="icon" className="rounded-full bg-white/20 hover:bg-white/30 text-white">
                <User size={18} />
              </Button>
            </Link>

            {/* MOBILE MENU BUTTON */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMenuOpen && (
          <div className="md:hidden px-6 pb-6 pt-4 space-y-4 text-white text-sm">
            <button onClick={() => handleNav("home")} className="block">
              Home
            </button>
            <button onClick={() => handleNav("rooms")} className="block">
              Rooms
            </button>
            <Link to="/explore-semarang">Explore Semarang</Link>
            <button onClick={() => handleNav("amenities")} className="block">
              Facilities
            </button>
            <button onClick={() => handleNav("news-events")} className="block">
              News & Events
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
