import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelSettings } from "@/hooks/useHotelSettings";

interface HeaderProps {
  variant?: "transparent" | "solid";
}

export default function Header({ variant = "transparent" }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    setIsMobileMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <>
      {/* ================= HEADER ================= */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div
          className={`
            mx-auto
            max-w-7xl
            px-6
            bg-primary/80 backdrop-blur-md
            rounded-b-3xl
            shadow-[0_14px_32px_rgba(0,0,0,0.18)]
            transition-all duration-300 ease-in-out
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
              {/* SIGN IN */}
              <Button
                size="icon"
                onClick={() => navigate("/auth")}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <User size={18} />
              </Button>

              {/* MOBILE MENU BUTTON */}
              <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-white">
                <Menu />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MOBILE LUXURY MENU ================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex justify-center items-start pt-28">
          {/* BACKDROP */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />

          {/* MENU CARD */}
          <div
            className="
              relative z-50
              w-[85%] max-w-sm
              bg-primary
              rounded-3xl
              shadow-[0_25px_60px_rgba(0,0,0,0.35)]
              pb-6
            "
          >
            {/* CLOSE CIRCLE */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="
                absolute -top-8 left-1/2 -translate-x-1/2
                w-16 h-16
                rounded-full
                bg-primary
                flex items-center justify-center
                shadow-xl
              "
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* MENU ITEMS */}
            <nav className="mt-12 flex flex-col text-white text-xl font-medium text-center">
              <button onClick={() => handleNav("rooms")} className="py-4 border-b border-white/30">
                Rooms
              </button>

              <button onClick={() => handleNav("amenities")} className="py-4 border-b border-white/30">
                Fasilitas
              </button>

              <button onClick={() => handleNav("news-events")} className="py-4 border-b border-white/30">
                News & Events
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/explore-semarang");
                }}
                className="py-4"
              >
                Explore Semarang
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
