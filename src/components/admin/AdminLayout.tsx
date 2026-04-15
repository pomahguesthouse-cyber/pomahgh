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
    "/admin/dashboard": "Dashboard",
    "/admin/booking-calendar": "Kalender Booking",
    "/admin/bookings": "Booking Management",
    "/admin/rooms": "Room Management",
    "/admin/settings": "Hotel Settings",
    "/admin/bank-accounts": "Bank Accounts",
    "/admin/hero-slides": "Hero Slides",
    "/admin/facilities": "Facilities",
    "/admin/nearby-locations": "Nearby Locations",
    "/admin/chatbot": "Chatbot Settings",
    "/admin/channel-managers": "Channel Managers",
    "/admin/booking-com": "Booking.com Integration",
    "/admin/room-features": "Room Features",
    "/admin/seo-settings": "SEO Settings",
    "/admin/page-editor": "Page Editor",
    "/admin/city-attractions": "City Attractions",
    "/admin/facility-hero-slides": "Facility Hero",
    "/admin/explore-hero-slides": "Explore Hero",
    "/admin/city-events": "City Events",
    "/admin/competitor-analysis": "Competitor Analysis",
    "/admin/chat": "Web Chatbot",
    "/admin/chatbot/guest": "Guest Chatbot",
    "/admin/chatbot/admin": "Admin Chatbot",
    
    "/admin/room-addons": "Room Add-ons",
    "/admin/promotions": "Promotions",
    "/admin/media-library": "Media Library",
    "/admin/developer-tools": "Developer Tools"
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

            <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">{children}</main>
          </div>
          
          <Suspense fallback={<ChatbotSkeleton />}>
            <AdminChatbotWidget />
          </Suspense>
        </div>
      </SidebarProvider>
    </AdminGuard>
  );
};
