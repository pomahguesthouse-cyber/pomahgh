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
      {/* ================= HEADER (TOP) ================= */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
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
            <img src={settings?.logo_url || "/logo.png"} alt="Pomah Guesthouse" className="h-8 object-contain" />

            <Button size="icon" onClick={() => navigate("/auth")} className="rounded-full bg-white/20 text-white">
              <User size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* ================= DROP-UP MENU ================= */}
      {isMenuOpen && (
        <div className="fixed bottom-[88px] left-0 right-0 z-40 md:hidden flex justify-center">
          <div
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
      )}

      {/* ================= BOTTOM BAR (MENTOK BAWAH) ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-auto max-w-sm px-6 pb-4">
          <div
            className="
              bg-primary/90 backdrop-blur-md
              rounded-full
              shadow-[0_10px_30px_rgba(0,0,0,0.25)]
              flex items-center justify-between
              px-8 py-3
            "
          >
            {/* HOME */}
            <button onClick={() => navigate("/")} className="text-white">
              <Home size={22} />
            </button>

            {/* MENU */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white font-semibold tracking-widest">
              MENU
            </button>

            {/* WHATSAPP */}
            <a href="https://wa.me/6281227271799" target="_blank" rel="noopener noreferrer" className="text-white">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor">
                <path d="M19.11 17.43c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.6-1.52-1.87-.16-.27-.02-.41.12-.54.13-.13.27-.32.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29 0 1.35.98 2.65 1.12 2.84.14.18 1.93 2.95 4.69 4.13.66.28 1.17.45 1.57.58.66.21 1.26.18 1.74.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
