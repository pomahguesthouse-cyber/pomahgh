import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelSettings } from "@/hooks/useHotelSettings";
export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    settings
  } = useHotelSettings();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const handleNav = (id: string) => {
    setIsMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth"
      });
    } else {
      navigate(`/#${id}`);
    }
  };
  const handleHome = () => {
    setIsMenuOpen(false);
    if (location.pathname === "/") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } else {
      navigate("/");
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }, 100);
    }
  };
  const menuItems = [{
    label: "Home",
    onClick: handleHome
  }, {
    label: "Rooms",
    onClick: () => handleNav("rooms")
  }, {
    label: "Fasilitas",
    onClick: () => handleNav("amenities")
  }, {
    label: "News & Events",
    onClick: () => handleNav("news-events")
  }, {
    label: "Explore Semarang",
    onClick: () => navigate("/explore-semarang")
  }];
  return <>
      {/* ================= DESKTOP HEADER ================= */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50">
        <div className={`
            mx-auto max-w-7xl px-8
            bg-primary/80 backdrop-blur-md
            rounded-b-3xl
            shadow-[0_14px_32px_rgba(0,0,0,0.18)]
            transition-all duration-300
            ${isScrolled ? "h-16" : "h-20"}
          `}>
          <div className="h-full flex items-center justify-between shadow-md">
            <Link to="/" onClick={handleHome} className="flex items-center">
              <img src={settings?.logo_url || "/logo.png"} alt="Pomah Guesthouse" className={`${isScrolled ? "h-9" : "h-11"} transition-all`} />
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
        <div className={`
            mx-auto max-w-sm px-4
            bg-primary/80 backdrop-blur-md
            rounded-b-3xl
            shadow-[0_12px_30px_rgba(0,0,0,0.2)]
            transition-all duration-300
            ${isScrolled ? "h-14" : "h-16"}
          `}>
          <div className="h-full flex items-center justify-between">
            <img src={settings?.logo_url || "/logo.png"} alt="Pomah Guesthouse" className="h-8" />
            <Button size="icon" onClick={() => navigate("/auth")} className="rounded-full bg-white/20 text-white">
              <User size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* ================= BLUR BACKDROP ================= */}
      <div className={`
          md:hidden fixed inset-0 z-40
          transition-all duration-300
          ${isMenuOpen ? "opacity-100 backdrop-blur-md bg-black/30 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `} onClick={() => setIsMenuOpen(false)} />

      {/* ================= DROP-UP MENU (FADE + SCALE) ================= */}
      <div className={`
          md:hidden fixed left-0 right-0 z-50
          flex justify-center
          transition-all duration-300 ease-out
          ${isMenuOpen ? "bottom-[72px] opacity-100 scale-100" : "bottom-[72px] opacity-0 scale-95 pointer-events-none"}
        `}>
        <div onClick={e => e.stopPropagation()} className="
            w-[75%] max-w-xs
            bg-primary
            rounded-2xl
            shadow-[0_20px_40px_rgba(0,0,0,0.35)]
            py-4
          ">
          <nav className="flex flex-col items-center text-white text-sm font-medium text-center">
            {menuItems.map((item, index) => <div key={item.label} className={`
                  w-full flex flex-col items-center
                  transition-all duration-300 ease-out
                  ${isMenuOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
                `} style={{
            transitionDelay: `${index * 60}ms`
          }}>
                <button onClick={item.onClick} className="py-2">
                  {item.label}
                </button>

                {index < menuItems.length - 1 && <div className="w-2/3 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />}
              </div>)}
          </nav>
        </div>
      </div>

      {/* ================= MOBILE BOTTOM BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-sm">
          <div className="
              bg-primary/90 backdrop-blur-md
              rounded-t-3xl
              shadow-[0_-10px_30px_rgba(0,0,0,0.25)]
              flex justify-between items-center
              px-10 py-4
              text-white
            ">
            <button onClick={handleHome}>
              <Home size={22} />
            </button>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-sm font-semibold tracking-widest">
              MENU
            </button>

            <a href="https://wa.me/6281227271799" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>;
}