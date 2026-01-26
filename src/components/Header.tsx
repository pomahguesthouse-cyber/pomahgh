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

  // ===============================
  // Scroll detector
  // ===============================
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ===============================
  // Section navigation
  // ===============================
  const handleNav = (id: string) => {
    setIsMenuOpen(false);

    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
      });
    } else {
      navigate(`/#${id}`);
    }
  };

  // ===============================
  // HOME button (FIXED)
  // ===============================
  const handleHome = () => {
    setIsMenuOpen(false);

    if (location.pathname === "/") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      navigate("/");
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 100);
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
            <Link to="/" onClick={handleHome} className="flex items-center">
              <img
                src={settings?.logo_url || "/logo.png"}
                alt="Pomah Guesthouse"
                className={`${isScrolled ? "h-9" : "h-11"} transition-all`}
              />
            </Link>

            <nav className="flex items-center gap-8 text-white text-sm font-medium">
              <button onClick={handleHome}>Home</button>
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

      {/* ================= DROP-UP MENU ================= */}
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
          ${isMenuOpen ? "bottom-[72px] opacity-100 translate-y-0" : "bottom-[56px] opacity-0 translate-y-4"}
        `}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            w-[75%] max-w-xs
            bg-primary
            rounded-2xl
            shadow-[0_20px_40px_rgba(0,0,0,0.35)]
            py-4
          "
        >
          <nav className="flex flex-col text-white text-sm font-medium text-center">
            <button onClick={handleHome} className="py-3 border-b border-white/30">
              Home
            </button>
            <button onClick={() => handleNav("rooms")} className="py-3 border-b border-white/30">
              Rooms
            </button>
            <button onClick={() => handleNav("amenities")} className="py-3 border-b border-white/30">
              Fasilitas
            </button>
            <button onClick={() => handleNav("news-events")} className="py-3">
              News & Events
            </button>
          </nav>
        </div>
      </div>

      {/* ================= MOBILE BOTTOM BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-sm">
          <div
            className="
              bg-primary/90 backdrop-blur-md
              rounded-t-3xl
              shadow-[0_-10px_30px_rgba(0,0,0,0.25)]
              flex justify-between items-center
              px-10 py-4
              text-white
            "
          >
            {/* HOME (FIXED) */}
            <button onClick={handleHome}>
              <Home size={22} />
            </button>

            {/* MENU */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-sm font-semibold tracking-widest">
              MENU
            </button>

            {/* WHATSAPP ICON */}
            <a href="https://wa.me/6281227271799" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
                <path d="M19.11 17.43c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.6-1.52-1.87-.16-.27-.02-.41.12-.54.13-.13.27-.32.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29 0 1.35.98 2.65 1.12 2.84.14.18 1.93 2.95 4.69 4.13.66.28 1.17.45 1.57.58.66.21 1.26.18 1.74.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
