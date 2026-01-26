import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelSettings } from "@/hooks/useHotelSettings";

interface HeaderProps {
  variant?: "transparent" | "solid";
}

export default function Header({ variant = "transparent" }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { settings } = useHotelSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // ===============================
  // Scroll behavior
  // ===============================
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ===============================
  // Navigation helper
  // ===============================
  const handleNav = (id: string) => {
    setIsMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* INNER BAR */}
      <div
        className={`
          mx-auto mt-0
          max-w-7xl
          px-6
          transition-all duration-300 ease-in-out
          bg-primary/80 backdrop-blur-md
          rounded-b-3xl
          shadow-[0_12px_30px_rgba(0,0,0,0.18)]
          ${isScrolled ? "h-16" : "h-20"}
        `}
      >
        <div className="h-full flex items-center justify-between">
          {/* LOGO */}
          <Link to="/" className="flex items-center">
            <img
              src={settings?.logo_url || "/logo.png"}
              alt={settings?.hotel_name || "Pomah Guesthouse"}
              className={`
                transition-all duration-300 object-contain
                ${isScrolled ? "h-9" : "h-11"}
              `}
              onError={(e) => (e.currentTarget.src = "/logo.png")}
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

          {/* RIGHT ACTION */}
          <div className="flex items-center gap-3">
            {/* SIGN IN — FIXED */}
            <Button
              size="icon"
              onClick={() => navigate("/auth")}
              className="rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <User size={18} />
            </Button>

            {/* MOBILE MENU */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMenuOpen && (
          <div className="md:hidden pb-6 pt-4 space-y-4 text-white text-sm">
            <button onClick={() => handleNav("home")}>Home</button>
            <button onClick={() => handleNav("rooms")}>Rooms</button>
            <Link to="/explore-semarang">Explore Semarang</Link>
            <button onClick={() => handleNav("amenities")}>Facilities</button>
            <button onClick={() => handleNav("news-events")}>News & Events</button>
          </div>
        )}
      </div>
    </header>
  );
}
