import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const scrollToRooms = () => {
    document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="text-2xl font-bold tracking-wider text-primary">
            POMAH GUESTHOUSE
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#home" className="text-foreground/80 hover:text-foreground transition-colors">
              Home
            </a>
            <a href="#rooms" className="text-foreground/80 hover:text-foreground transition-colors">
              Rooms
            </a>
            <a href="#amenities" className="text-foreground/80 hover:text-foreground transition-colors">
              Amenities
            </a>
            <a href="#contact" className="text-foreground/80 hover:text-foreground transition-colors">
              Contact
            </a>
            {user ? (
              <>
                <Link to="/bookings" className="text-foreground/80 hover:text-foreground transition-colors">
                  My Bookings
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
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
                <Button variant="outline">
                  Sign In
                </Button>
              </Link>
            )}
            <Button onClick={scrollToRooms}>
              Book Now
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-4">
            <a
              href="#home"
              className="text-foreground/80 hover:text-foreground transition-colors block py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </a>
            <a
              href="#rooms"
              className="text-foreground/80 hover:text-foreground transition-colors block py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Rooms
            </a>
            <a
              href="#amenities"
              className="text-foreground/80 hover:text-foreground transition-colors block py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Amenities
            </a>
            <a
              href="#contact"
              className="text-foreground/80 hover:text-foreground transition-colors block py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </a>
            {user ? (
              <>
                <Link
                  to="/bookings"
                  className="text-foreground/80 hover:text-foreground transition-colors block py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Bookings
                </Link>
                <Button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
            )}
            <Button
              onClick={() => {
                scrollToRooms();
                setIsMenuOpen(false);
              }}
              className="w-full"
            >
              Book Now
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};
