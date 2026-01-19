import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  variant?: "header" | "mobile";
}

export function ThemeToggle({ variant = "header" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);
  
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={variant === "header" 
          ? "text-white/70 hover:text-white hover:bg-white/10 border-0" 
          : "text-foreground hover:bg-accent"
        }
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={variant === "header" 
        ? "text-white/70 hover:text-white hover:bg-white/10 border-0 relative overflow-hidden" 
        : "text-foreground hover:bg-accent relative overflow-hidden"
      }
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun 
        className={`h-4 w-4 absolute transition-all duration-300 ease-in-out
          ${isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} 
      />
      <Moon 
        className={`h-4 w-4 absolute transition-all duration-300 ease-in-out
          ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} 
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
