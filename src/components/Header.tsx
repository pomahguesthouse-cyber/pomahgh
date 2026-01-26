import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface HeaderProps {
  scrollToRooms?: () => void;
}

export default function Header({ scrollToRooms }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useHotelSettings();

  // ===============================
  // Scroll Detection (Collapsible)
  // ===============================
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ===============================
  // Auth
  // ===============================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) checkAdmin(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
      else setIsAdmin(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleNavClick = (id: string) => {
    setIsMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };

  // ===============================
  // Render
  // ===============================
  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300 ease-in-out
        ${isScrolled ? "h-16 bg-primary/95 backdrop-blur-md shadow-lg" : "h-20 bg-primary"}
      `}
    >
      {/* subtle gradient bottom (nyatu ke hero) */}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-primary to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* ================= LOGO ================= */}
        <Link to="/" className="flex items-center">
          <img
            src={settings?.logo_url || "/logo.png"}
            alt={settings?.hotel_name || "Logo"}
            className={`
              transition-all duration-300 object-contain
              ${isScrolled ? "h-[42px]" : "h-[60px]"}
            `}
            onError={(e) => {
              e.currentTarget.src = "/logo.png";
            }}
          />
        </Link>

        {/* ================= DESKTOP NAV ================= */}
        <nav className="hidden md:flex items-center gap-6 text-white font-medium">
          <button onClick={() => handleNavClick("home")} className="hover:opacity-80">
            Home
          </button>
          <button onClick={() => handleNavClick("rooms")} className="hover:opacity-80">
            Rooms
          </button>
          <Link to="/explore-semarang" className="hover:opacity-80">
            Explore Semarang
          </Link>
          <button onClick={() => handleNavClick("amenities")} className="hover:opacity-80">
            Facilities
          </button>
          <button onClick={() => handleNavClick("news-events")} className="hover:opacity-80">
            News & Events
          </button>

          {user ? (
            <>
              {!isAdmin && (
                <Link to="/bookings" className="hover:opacity-80">
                  My Bookings
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="border-white text-white">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="border-white text-white">
                Sign In
              </Button>
            </Link>
          )}
        </nav>

        {/* ================= MOBILE ================= */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10"
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* ================= MOBILE MENU ================= */}
      {isMenuOpen && (
        <div className="md:hidden bg-primary text-white px-4 pb-6 space-y-4">
          <button onClick={() => handleNavClick("home")} className="block w-full text-left">
            Home
          </button>
          <button onClick={() => handleNavClick("rooms")} className="block w-full text-left">
            Rooms
          </button>
          <Link to="/explore-semarang" onClick={() => setIsMenuOpen(false)}>
            Explore Semarang
          </Link>
          <button onClick={() => handleNavClick("amenities")} className="block w-full text-left">
            Facilities
          </button>
          <button onClick={() => handleNavClick("news-events")} className="block w-full text-left">
            News & Events
          </button>

          {user ? (
            <Button onClick={handleSignOut} variant="outline" className="w-full border-white text-white">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="w-full border-white text-white">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
