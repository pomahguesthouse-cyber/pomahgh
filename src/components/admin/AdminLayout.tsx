import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminGuard } from "./AdminGuard";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminChatbotWidget } from "./AdminChatbotWidget";
interface AdminLayoutProps {
  children: ReactNode;
}

const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/bookings": "Booking Management",
    "/admin/rooms": "Room Management",
    "/admin/settings": "Hotel Settings",
    "/admin/bank-accounts": "Bank Accounts",
    "/admin/hero-slides": "Hero Slides",
    "/admin/facilities": "Facilities",
    "/admin/nearby-locations": "Nearby Locations",
    "/admin/chatbot": "Chatbot Settings",
    "/admin/channel-managers": "Channel Managers",
    "/admin/room-features": "Room Features",
    "/admin/seo-settings": "SEO Settings",
    "/admin/invoice-template": "Invoice Template",
    "/admin/city-attractions": "City Attractions",
    "/admin/facility-hero-slides": "Facility Hero",
  };
  return titles[pathname] || "Admin Panel";
};

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const isMobile = useIsMobile();

  return (
    <AdminGuard>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />

          <div className="flex-1 flex flex-col transition-all min-w-0">
            <header className="h-14 border-b flex items-center px-3 md:px-4 bg-background sticky top-0 z-[999998]">
              <SidebarTrigger />
              <h1 className="ml-3 md:ml-4 text-base md:text-lg font-roboto font-semibold truncate">{pageTitle}</h1>
            </header>

            <main className="flex-1 p-3 md:p-6 max-w-5xl mx-auto w-full">{children}</main>
          </div>
          
          <AdminChatbotWidget />
        </div>
      </SidebarProvider>
    </AdminGuard>
  );
};