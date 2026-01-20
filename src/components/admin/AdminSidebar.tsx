import { useState } from "react";
import { Home, Calendar, Building2, ImageIcon, Boxes, Settings, MessageCircle, MapPin, CreditCard, Tags, RefreshCw, LayoutDashboard, Search, FileText, Compass, ChevronRight, ChevronDown, Sparkles, Percent, TrendingUp, Bot, Users, Shield, Terminal, Palette } from "lucide-react";
import { NavLink } from "@/components/layout/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { useHotelSettings } from "@/hooks/shared/useHotelSettings";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  submenu?: {
    title: string;
    url: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
  }[];
}
interface MenuGroup {
  label: string;
  items: MenuItem[];
}
const menuGroups: MenuGroup[] = [{
  label: "Overview",
  items: [{
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard
  }, {
    title: "Bookings",
    url: "/admin/bookings",
    icon: Calendar
  }]
}, {
  label: "Property",
  items: [{
    title: "Rooms",
    url: "/admin/rooms",
    icon: Building2
  }, {
    title: "Promotions",
    url: "/admin/promotions",
    icon: Percent
  }, {
    title: "Room Add-ons",
    url: "/admin/room-addons",
    icon: Sparkles
  }, {
    title: "Facilities",
    url: "/admin/facilities",
    icon: Boxes
  }, {
    title: "Room Features",
    url: "/admin/room-features",
    icon: Tags
  }]
}, {
  label: "Content",
  items: [{
    title: "Hero Slides",
    url: "/admin/hero-slides",
    icon: ImageIcon
  }, {
    title: "Facility Hero",
    url: "/admin/facility-hero-slides",
    icon: ImageIcon
  }, {
    title: "Explore Hero",
    url: "/admin/explore-hero-slides",
    icon: ImageIcon
  }, {
    title: "Nearby Locations",
    url: "/admin/nearby-locations",
    icon: MapPin
  }, {
    title: "City Attractions",
    url: "/admin/city-attractions",
    icon: Compass
  }, {
    title: "City Events",
    url: "/admin/city-events",
    icon: Calendar
  }]
}, {
  label: "Operations",
  items: [{
    title: "Analisis Harga",
    url: "/admin/competitor-analysis",
    icon: TrendingUp
  }, {
    title: "Bank Accounts",
    url: "/admin/bank-accounts",
    icon: CreditCard
  }, {
    title: "Channel Managers",
    url: "/admin/channel-managers",
    icon: RefreshCw
  }, {
    title: "Invoice Template",
    url: "/admin/invoice-template",
    icon: FileText
  }]
}, {
  label: "Design",
  items: [{
    title: "Editor Mode",
    url: "/admin/editor",
    icon: Palette
  }]
}, {
  label: "Developer Tools",
  items: [{
    title: "Prompt Console",
    url: "/admin/developer-tools",
    icon: Terminal
  }]
}, {
  label: "System",
  items: [{
    title: "Virtual Assistant",
    icon: MessageCircle,
    submenu: [{
      title: "Web Chatbot",
      url: "/admin/chat",
      icon: Bot
    }, {
      title: "Guest Chatbot",
      url: "/admin/chatbot/guest",
      icon: Users
    }, {
      title: "Admin Chatbot",
      url: "/admin/chatbot/admin",
      icon: Shield
    }]
  }, {
    title: "SEO Settings",
    url: "/admin/seo-settings",
    icon: Search
  }, {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings
  }]
}];
export function AdminSidebar() {
  const {
    state,
    setOpenMobile,
    isMobile
  } = useSidebar();
  const location = useLocation();
  const {
    settings
  } = useHotelSettings();
  const isCollapsed = state === "collapsed";

  // Check if any submenu item is active to auto-expand
  const isVirtualAssistantActive = location.pathname.startsWith("/admin/chatbot") || location.pathname === "/admin/chat";
  const [isVAOpen, setIsVAOpen] = useState(isVirtualAssistantActive);
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const renderMenuItem = (item: MenuItem) => {
    // If item has submenu, render as collapsible
    if (item.submenu) {
      const isAnySubActive = item.submenu.some(sub => location.pathname === sub.url);
      return <Collapsible key={item.title} open={isVAOpen || isAnySubActive} onOpenChange={setIsVAOpen}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={item.title} className={cn("flex items-center gap-3 rounded-lg transition-colors w-full", isAnySubActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                <item.icon className={cn("h-4 w-4 shrink-0", isAnySubActive && "text-primary")} />
                <span className="truncate flex-1">{item.title}</span>
                {!isCollapsed && (isVAOpen || isAnySubActive ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <SidebarMenu className="ml-4 mt-1 border-l border-border pl-2">
                {item.submenu.map(sub => {
                const isSubActive = location.pathname === sub.url;
                return <SidebarMenuItem key={sub.title}>
                      <SidebarMenuButton asChild tooltip={sub.title} isActive={isSubActive}>
                        <NavLink to={sub.url} end className={cn("flex items-center gap-3 rounded-lg transition-colors", isSubActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent")} onClick={handleNavClick}>
                          <sub.icon className={cn("h-4 w-4 shrink-0", isSubActive && "text-primary")} />
                          <span className="truncate">{sub.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>;
              })}
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>;
    }

    // Regular menu item
    const isActive = location.pathname === item.url;
    return <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
          <NavLink to={item.url!} end className={cn("flex items-center gap-3 rounded-md transition-colors text-sm", isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")} onClick={handleNavClick}>
            <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
            <span className="truncate text-sm">{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>;
  };
  return <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-1">
          {(settings?.invoice_logo_url || settings?.logo_url) && !isCollapsed ? <img src={settings.invoice_logo_url || settings.logo_url} alt={settings?.hotel_name || "Hotel"} className="h-8 w-auto object-contain" /> : <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              {settings?.hotel_name?.charAt(0) || "A"}
            </div>}
          {!isCollapsed && <div className="flex flex-col">
              <span className="text-sm font-semibold truncate">
                {settings?.hotel_name || "Admin Panel"}
              </span>
              <span className="text-[10px] text-muted-foreground">Property Management</span>
            </div>}
        </div>
      </SidebarHeader>

      {/* Menu Groups */}
      <SidebarContent className="px-2 overflow-y-auto flex-1">
        {menuGroups.map(group => <SidebarGroup key={group.label} className="py-[2px]">
            <SidebarGroupLabel className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border mt-auto shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Site">
              <NavLink to="/" className="flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg" onClick={handleNavClick}>
                <Home className="h-4 w-4 shrink-0" />
                <span>Back to Site</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>;
}












