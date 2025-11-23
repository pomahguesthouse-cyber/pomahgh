import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
export default function Header({ scrollToRooms }: { scrollToRooms?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { settings } = useHotelSettings();
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
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
  const handleScrollToRooms = () => {
    if (scrollToRooms) {
      scrollToRooms();
    } else {
      navigate("/#rooms");
    }
  };
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled ? "bg-black/60 backdrop-blur-md" : "bg-transparent"}
      `}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center">
            <img
              src={settings?.logo_url || "/logo.png"}
              alt={settings?.hotel_name || "Logo"}
              onLoad={(e) => (e.currentTarget.style.opacity = "1")}
              onError={(e) => {
                e.currentTarget.src = "/logo.png";
                e.currentTarget.style.opacity = "1";
              }}
              className="
      h-[80px]
      sm:h-[100px]
      md:h-[120x]
      w-auto
      transition-opacity duration-300 opacity-0
      object-contain
    "
            />
          </Link>

          {/* 🔥 DESKTOP MENU PUTIH */}
          <nav className="hidden md:flex items-center gap-6 text-white">
            <a href="#home" className="hover:text-white/70 transition">
              Home
            </a>
            <a href="#rooms" className="hover:text-white/70 transition">
              Rooms
            </a>
            <a href="#amenities" className="hover:text-white/70 transition">
              Amenities
            </a>
            <a href="#contact" className="hover:text-white/70 transition">
              Contact
            </a>

            {user ? (
              <>
                <Link to="/bookings" className="hover:text-white/70 transition">
                  My Bookings
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="text-white border-white">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="text-black">
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

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

            <Button onClick={handleScrollToRooms} className="bg-white text-black hover:bg-white/90">
              Book Now
            </Button>
          </nav>

          {/* 🔥 MOBILE BUTTON PUTIH */}
          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* 🔥 MOBILE MENU PUTIH */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-4 text-white">
            <a href="#home" className="py-2" onClick={() => setIsMenuOpen(false)}>
              Home
            </a>
            <a href="#rooms" className="py-2" onClick={() => setIsMenuOpen(false)}>
              Rooms
            </a>
            <a href="#amenities" className="py-2" onClick={() => setIsMenuOpen(false)}>
              Amenities
            </a>
            <a href="#contact" className="py-2" onClick={() => setIsMenuOpen(false)}>
              Contact
            </a>

            {user ? (
              <>
                <Link to="/bookings" className="py-2" onClick={() => setIsMenuOpen(false)}>
                  My Bookings
                </Link>

                {isAdmin && (
                  <Link to="/admin" className="py-2" onClick={() => setIsMenuOpen(false)}>
                    Admin Dashboard
                  </Link>
                )}

                <Button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full text-white border-white"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full text-white border-white">
                  Sign In
                </Button>
              </Link>
            )}

            <Button
              onClick={() => {
                handleScrollToRooms();
                setIsMenuOpen(false);
              }}
              className="w-full bg-white text-black hover:bg-white/90"
            >
              Book Now
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
