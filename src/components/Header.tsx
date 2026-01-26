import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, Home } from "lucide-react";
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
    <>
      {/* ================= DESKTOP HEADER ================= */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50">
        <div
          className={`
            mx-auto max-w-7xl px-8
            bg-primary/80 backdrop-blur-md
            rounded-b-3xl
            shadow-[0_14px_32px_rgba(0,0,0,0.18)]
            transition-all duration-300
            ${isScrolled ? "h-16" : "h-20"}
          `}
        >
          <div className="h-full flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img
                src={settings?.logo_url || "/logo.png"}
                alt="Pomah Guesthouse"
                className={`${isScrolled ? "h-9" : "h-11"} transition-all`}
              />
            </Link>

            <nav className="flex items-center gap-8 text-white text-sm font-medium">
              <button onClick={() => handleNav("home")}>Home</button>
              <button onClick={() => handleNav("rooms")}>Rooms</button>
              <Link to="/explore-semarang">Explore Semarang</Link>
              <button onClick={() => handleNav("amenities")}>Facilities</button>
              <button onClick={() => handleNav("news-events")}>News & Events</button>
            </nav>

            <Button size="icon" onClick={() => navigate("/auth")} className="rounded-full bg-white/20 text-white">
              <User size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* ================= MOBILE HEADER ================= */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50">
        <div
          className={`
            mx-auto max-w-sm px-4
            bg-primary/80 backdrop-blur-md
            rounded-b-3xl
            shadow-[0_12px_30px_rgba(0,0,0,0.2)]
            transition-all duration-300
            ${isScrolled ? "h-14" : "h-16"}
          `}
        >
          <div className="h-full flex items-center justify-between">
            <img src={settings?.logo_url || "/logo.png"} alt="Pomah Guesthouse" className="h-8" />
            <Button size="icon" onClick={() => navigate("/auth")} className="rounded-full bg-white/20 text-white">
              <User size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* ================= DROP-UP MENU (SMOOTH + AUTO HIDE) ================= */}
      {/* Backdrop */}
      <div
        className={`
          md:hidden fixed inset-0 z-40
          transition-opacity duration-300
          ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Menu Card */}
      <div
        className={`
          md:hidden fixed left-0 right-0 z-50
          flex justify-center
          transition-all duration-300 ease-out
          ${isMenuOpen ? "bottom-[88px] opacity-100 translate-y-0" : "bottom-[72px] opacity-0 translate-y-6"}
        `}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            w-[85%] max-w-sm
            bg-primary
            rounded-3xl
            shadow-[0_25px_60px_rgba(0,0,0,0.35)]
            py-6
          "
        >
          <nav className="flex flex-col text-white text-lg font-medium text-center">
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
                setIsMenuOpen(false);
                navigate("/explore-semarang");
              }}
              className="py-4"
            >
              Explore Semarang
            </button>
          </nav>
        </div>
      </div>

      {/* ================= MOBILE BOTTOM BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-sm px-6 pb-4">
          <div className="bg-primary/90 rounded-full shadow-xl flex justify-between px-8 py-3 text-white">
            <button onClick={() => navigate("/")}>
              <Home size={22} />
            </button>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="font-semibold tracking-widest">
              MENU
            </button>

            <a href="https://wa.me/6281227271799" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
