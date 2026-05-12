import { ReactNode, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminGuard } from "./AdminGuard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

const AdminChatbotWidget = lazy(() => import("./AdminChatbotWidget").then(m => ({ default: m.AdminChatbotWidget })));

interface AdminLayoutProps {
  children: ReactNode;
}

const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/booking-calendar": "Kalender Booking",
    "/bookings": "Booking Management",
    "/rooms": "Room Management",
    "/settings": "Hotel Settings",
    "/bank-accounts": "Bank Accounts",
    "/hero-slides": "Hero Slides",
    "/facilities": "Facilities",
    "/nearby-locations": "Nearby Locations",
    "/chatbot": "Chatbot Settings",
    "/room-features": "Room Features",
    "/seo-settings": "SEO Settings",
    "/seo-agent": "SEO Agent",
    "/page-editor": "Page Editor",
    "/city-attractions": "City Attractions",
    "/facility-hero-slides": "Facility Hero",
    "/explore-hero-slides": "Explore Hero",
    "/city-events": "City Events",
    "/competitor-analysis": "Competitor Analysis",
    "/social-media-agent": "Social Media Agent",
    "/chat": "Web Chatbot",
    "/chatbot/guest": "Guest Chatbot",
    "/chatbot/admin": "Admin Chatbot",
    "/multi-agent": "Multi-Agent",
    "/invoice-management": "Payment Management",
    "/room-addons": "Room Add-ons",
    "/promotions": "Promotions",
    "/media-library": "Media Library",
    "/developer-tools": "Developer Tools"
  };
  return titles[pathname] || "Admin Panel";
};

function ChatbotSkeleton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Skeleton className="w-14 h-14 rounded-full" />
    </div>
  );
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const isMobile = useIsMobile();

  return (
    <AdminGuard>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full bg-muted/30 admin-layout">
          <AdminSidebar />

          <div className="flex-1 flex flex-col transition-all min-w-0">
            <header className="h-14 border-b border-border/60 flex items-center px-4 md:px-6 bg-background sticky top-0 z-[999998]">
              <SidebarTrigger />
              <h1 className="ml-4 text-xl text-foreground truncate font-semibold">{pageTitle}</h1>
            </header>

            <main
              className={`flex-1 p-4 md:p-6 w-full ${
                location.pathname === "/multi-agent" ? "max-w-none" : "max-w-6xl mx-auto"
              }`}
            >
              {children}
            </main>
          </div>
          
          <Suspense fallback={<ChatbotSkeleton />}>
            <AdminChatbotWidget />
          </Suspense>
        </div>
      </SidebarProvider>
    </AdminGuard>
  );
};
