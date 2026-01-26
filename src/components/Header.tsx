import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
interface HeaderProps {
  scrollToRooms?: () => void;
  variant?: "transparent" | "solid";
}
export default function Header({
  scrollToRooms,
  variant = "transparent"
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    settings
  } = useHotelSettings();

  // Smart navigation handler for anchor links
  const handleNavClick = (sectionId: string) => {
    setIsMenuOpen(false);
    if (location.pathname === '/') {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({
        behavior: 'smooth'
      });
    } else {
      navigate(`/#${sectionId}`);
    }
  };
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Detect scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling DOWN & passed threshold - hide header
        setIsVisible(false);
      } else {
        // Scrolling UP - show header
        setIsVisible(true);
      }
      setIsScrolled(currentScrollY > 10);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const checkAdminStatus = async (userId: string) => {
    const {
      data
    } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    setIsAdmin(!!data);
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const handleScrollToRooms = () => {
    if (scrollToRooms) {
      scrollToRooms();
    } else {
      navigate("/#rooms");
    }
  };
  return <header className={`fixed top-0 left-0 right-0 z-50 
        transition-transform duration-300 ease-in-out
        ${isVisible ? "translate-y-0" : "-translate-y-full"}
        ${variant === "solid" ? "bg-black/80 backdrop-blur-md" : isScrolled ? "bg-black/60 backdrop-blur-md" : "bg-transparent"}
      `}>
      <div className="container mx-auto px-4 bg-primary opacity-85 shadow-2xl">
        {/* Desktop Layout - Horizontal */}
        <div className="hidden md:flex items-center justify-between h-20">
          {/* Logo on the left */}
          <Link to="/" className="flex items-center">
            <img src={settings?.logo_url || "/logo.png"} alt={settings?.hotel_name || "Logo"} onLoad={e => e.currentTarget.style.opacity = "1"} onError={e => {
            e.currentTarget.src = "/logo.png";
            e.currentTarget.style.opacity = "1";
          }} className="h-[60px] w-auto transition-opacity duration-300 opacity-0 object-contain" />
          </Link>

          {/* Navigation on the right */}
          <nav className="hidden md:flex items-center gap-6 text-white">
            <button onClick={() => handleNavClick('home')} className="hover:text-white/70 transition">
              Home
            </button>
            <button onClick={() => handleNavClick('rooms')} className="hover:text-white/70 transition">
              Rooms
            </button>
            <Link to="/explore-semarang" className="hover:text-white/70 transition">
              Explore Semarang
            </Link>
            <button onClick={() => handleNavClick('amenities')} className="hover:text-white/70 transition">
              ​Facilities
            </button>
            <button onClick={() => handleNavClick('news-events')} className="hover:text-white/70 transition">
              News & Events
            </button>

            {user ? <>
                {!isAdmin && <Link to="/bookings" className="hover:text-white/70 transition">
                    My Bookings
                  </Link>}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="text-white border-white">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="text-black">
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </> : <Link to="/auth">
                <Button variant="outline" className="border-white text-white">
                  Sign In
                </Button>
              </Link>}
          </nav>
        </div>

        {/* Mobile Layout - Horizontal */}
        <div className="flex md:hidden items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img src={settings?.logo_url || "/logo.png"} alt={settings?.hotel_name || "Logo"} onLoad={e => e.currentTarget.style.opacity = "1"} onError={e => {
            e.currentTarget.src = "/logo.png";
            e.currentTarget.style.opacity = "1";
          }} className="h-[50px] w-auto transition-opacity duration-300 opacity-0 object-contain" />
          </Link>

          <button className="text-white p-2 rounded-lg hover:bg-white/10 transition" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && <nav className="md:hidden pb-4 flex flex-col gap-4 text-white">
            <button onClick={() => handleNavClick('home')} className="py-2 text-left">
              Home
            </button>
            <button onClick={() => handleNavClick('rooms')} className="py-2 text-left">
              Rooms
            </button>
            <Link to="/explore-semarang" className="py-2" onClick={() => setIsMenuOpen(false)}>
              Explore Semarang
            </Link>
            <button onClick={() => handleNavClick('amenities')} className="py-2 text-left">
              Facilities
            </button>
            <button onClick={() => handleNavClick('news-events')} className="py-2 text-left">
              News & Events
            </button>

            {user ? <>
                {!isAdmin && <Link to="/bookings" className="py-2" onClick={() => setIsMenuOpen(false)}>
                    My Bookings
                  </Link>}

                <Button onClick={() => {
            handleSignOut();
            setIsMenuOpen(false);
          }} variant="outline" className="w-full text-white border-white">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </> : <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full text-white border-white">
                  Sign In
                </Button>
              </Link>}
          </nav>}
      </div>
    </header>;
}