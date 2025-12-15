import { Home, Calendar, Building2, ImageIcon, Boxes, Settings, MessageCircle, MapPin, CreditCard, Tags, RefreshCw, LayoutDashboard, Search, FileText, Compass, ChevronRight, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar 
} from "@/components/ui/sidebar";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { cn } from "@/lib/utils";

const menuGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Bookings", url: "/admin/bookings", icon: Calendar },
    ]
  },
  {
    label: "Property",
    items: [
      { title: "Rooms", url: "/admin/rooms", icon: Building2 },
      { title: "Room Add-ons", url: "/admin/room-addons", icon: Sparkles },
      { title: "Facilities", url: "/admin/facilities", icon: Boxes },
      { title: "Room Features", url: "/admin/room-features", icon: Tags },
    ]
  },
  {
    label: "Content",
    items: [
      { title: "Hero Slides", url: "/admin/hero-slides", icon: ImageIcon },
      { title: "Facility Hero", url: "/admin/facility-hero-slides", icon: ImageIcon },
      { title: "Explore Hero", url: "/admin/explore-hero-slides", icon: ImageIcon },
      { title: "Nearby Locations", url: "/admin/nearby-locations", icon: MapPin },
      { title: "City Attractions", url: "/admin/city-attractions", icon: Compass },
    ]
  },
  {
    label: "Operations",
    items: [
      { title: "Bank Accounts", url: "/admin/bank-accounts", icon: CreditCard },
      { title: "Channel Managers", url: "/admin/channel-managers", icon: RefreshCw },
      { title: "Invoice Template", url: "/admin/invoice-template", icon: FileText },
    ]
  },
  {
    label: "System",
    items: [
      { title: "Chatbot AI", url: "/admin/chatbot", icon: MessageCircle },
      { title: "SEO Settings", url: "/admin/seo-settings", icon: Search },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ]
  },
];

export function AdminSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const { settings } = useHotelSettings();
  const isCollapsed = state === "collapsed";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-1">
          {(settings?.invoice_logo_url || settings?.logo_url) && !isCollapsed ? (
            <img 
              src={settings.invoice_logo_url || settings.logo_url} 
              alt={settings?.hotel_name || "Hotel"} 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              {settings?.hotel_name?.charAt(0) || "A"}
            </div>
          )}
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold truncate">
                {settings?.hotel_name || "Admin Panel"}
              </span>
              <span className="text-[10px] text-muted-foreground">Management</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Menu Groups */}
      <SidebarContent className="px-2 overflow-y-auto flex-1">
        {menuGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className="py-2">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={item.title}
                        isActive={isActive}
                      >
                        <NavLink 
                          to={item.url} 
                          end 
                          className={cn(
                            "flex items-center gap-3 rounded-lg transition-colors",
                            isActive 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                          onClick={handleNavClick}
                        >
                          <item.icon className={cn(
                            "h-4 w-4 shrink-0",
                            isActive && "text-primary"
                          )} />
                          <span className="truncate">{item.title}</span>
                          {isActive && !isCollapsed && (
                            <ChevronRight className="ml-auto h-4 w-4 text-primary/60" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border mt-auto shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Site">
              <NavLink 
                to="/" 
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                onClick={handleNavClick}
              >
                <Home className="h-4 w-4 shrink-0" />
                <span>Back to Site</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
