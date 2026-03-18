import { useState } from "react";
import { Home, Calendar, Building2, ImageIcon, Boxes, Settings, MessageCircle, MapPin, CreditCard, Tags, RefreshCw, LayoutDashboard, Search, Compass, ChevronRight, ChevronDown, Sparkles, Percent, TrendingUp, Bot, Users, Shield, FileType, FolderOpen, GripVertical, Save, RotateCcw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MenuItem {
  id: string;
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  submenu?: {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

const defaultMenuGroups: MenuGroup[] = [
  {
    id: "page-editor",
    label: "Page Editor",
    items: [{
      id: "page-editor",
      title: "Page Editor",
      url: "/admin/page-editor",
      icon: FileType
    }]
  },
  {
    id: "overview",
    label: "Overview",
    items: [
      { id: "dashboard", title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      { id: "bookings", title: "Bookings", url: "/admin/bookings", icon: Calendar }
    ]
  },
  {
    id: "property",
    label: "Property",
    items: [
      { id: "rooms", title: "Rooms", url: "/admin/rooms", icon: Building2 },
      { id: "promotions", title: "Promotions", url: "/admin/promotions", icon: Percent },
      { id: "room-addons", title: "Room Add-ons", url: "/admin/room-addons", icon: Sparkles },
      { id: "facilities", title: "Facilities", url: "/admin/facilities", icon: Boxes },
      { id: "room-features", title: "Room Features", url: "/admin/room-features", icon: Tags }
    ]
  },
  {
    id: "content",
    label: "Content",
    items: [
      { id: "media-library", title: "Media Library", url: "/admin/media-library", icon: FolderOpen },
      { id: "hero-slides", title: "Hero Slides", url: "/admin/hero-slides", icon: ImageIcon },
      { id: "facility-hero", title: "Facility Hero", url: "/admin/facility-hero-slides", icon: ImageIcon },
      { id: "explore-hero", title: "Explore Hero", url: "/admin/explore-hero-slides", icon: ImageIcon },
      { id: "nearby-locations", title: "Nearby Locations", url: "/admin/nearby-locations", icon: MapPin },
      { id: "city-attractions", title: "City Attractions", url: "/admin/city-attractions", icon: Compass },
      { id: "city-events", title: "City Events", url: "/admin/city-events", icon: Calendar }
    ]
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { id: "competitor-analysis", title: "Analisis Harga", url: "/admin/competitor-analysis", icon: TrendingUp },
      { id: "bank-accounts", title: "Bank Accounts", url: "/admin/bank-accounts", icon: CreditCard },
      { id: "channel-managers", title: "Channel Managers", url: "/admin/channel-managers", icon: RefreshCw },
      { id: "booking-com", title: "Booking.com", url: "/admin/booking-com", icon: RefreshCw }
    ]
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "virtual-assistant",
        title: "Virtual Assistant",
        icon: MessageCircle,
        submenu: [
          { title: "Web Chatbot", url: "/admin/chat", icon: Bot },
          { title: "Guest Chatbot", url: "/admin/chatbot/guest", icon: Users },
          { title: "Admin Chatbot", url: "/admin/chatbot/admin", icon: Shield }
        ]
      },
      { id: "seo-settings", title: "SEO Settings", url: "/admin/seo-settings", icon: Search },
      { id: "settings", title: "Settings", url: "/admin/settings", icon: Settings }
    ]
  }
];

const STORAGE_KEY = "admin-menu-order";

function getStoredMenuOrder(): MenuGroup[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load menu order:", e);
  }
  return null;
}

export function AdminSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const { settings } = useHotelSettings();
  const isCollapsed = state === "collapsed";
  
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>(() => {
    const stored = getStoredMenuOrder();
    return stored || defaultMenuGroups;
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [dragItem, setDragItem] = useState<{ groupId: string; itemId: string } | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const isVirtualAssistantActive = location.pathname.startsWith("/admin/chatbot") || location.pathname === "/admin/chat";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    if (isEditMode) return;
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleDragStart = (e: React.DragEvent, groupId: string, itemId: string) => {
    if (!isEditMode) return;
    setDragItem({ groupId, itemId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    if (!isEditMode || !dragItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverGroup(groupId);
  };

  const handleDragLeave = () => {
    setDragOverGroup(null);
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    if (!isEditMode || !dragItem) return;
    e.preventDefault();
    
    const sourceGroupId = dragItem.groupId;
    const sourceItemId = dragItem.itemId;
    
    if (sourceGroupId === targetGroupId) {
      setDragItem(null);
      setDragOverGroup(null);
      return;
    }

    setMenuGroups(prev => {
      const newGroups = [...prev];
      const sourceIndex = newGroups.findIndex(g => g.id === sourceGroupId);
      const targetIndex = newGroups.findIndex(g => g.id === targetGroupId);
      
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      
      const sourceGroup = { ...newGroups[sourceIndex] };
      const targetGroup = { ...newGroups[targetIndex] };
      
      const sourceItemIndex = sourceGroup.items.findIndex(item => item.id === sourceItemId);
      if (sourceItemIndex === -1) return prev;
      
      const [movedItem] = sourceGroup.items.splice(sourceItemIndex, 1);
      targetGroup.items = [...targetGroup.items, movedItem];
      
      newGroups[sourceIndex] = sourceGroup;
      newGroups[targetIndex] = targetGroup;
      
      return newGroups;
    });

    setDragItem(null);
    setDragOverGroup(null);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOverGroup(null);
  };

  const saveMenuOrder = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuGroups));
    setIsEditMode(false);
  };

  const resetMenuOrder = () => {
    setMenuGroups(defaultMenuGroups);
    localStorage.removeItem(STORAGE_KEY);
    setIsEditMode(false);
  };

  const renderMenuItem = (item: MenuItem, groupId: string) => {
    const isActive = location.pathname === item.url;
    const itemKey = `${groupId}-${item.id}`;
    
    if (item.submenu) {
      const isAnySubActive = item.submenu.some(sub => location.pathname === sub.url);
      return (
        <Collapsible key={itemKey} defaultOpen>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <button 
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-colors w-full text-left px-2 py-1.5",
                  isAnySubActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isAnySubActive && "text-primary")} />
                <span className="truncate flex-1 text-sm">{item.title}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="ml-4 mt-1 border-l border-border pl-2">
                {item.submenu.map((sub, idx) => {
                  const isSubActive = location.pathname === sub.url;
                  return (
                    <SidebarMenuItem key={idx}>
                      <SidebarMenuButton asChild isActive={isSubActive}>
                        <Link 
                          to={sub.url} 
                          className={cn(
                            "flex items-center gap-3 rounded-lg transition-colors text-sm",
                            isSubActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                          onClick={handleNavClick}
                        >
                          <sub.icon className={cn("h-4 w-4 shrink-0", isSubActive && "text-primary")} />
                          <span className="truncate">{sub.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem 
        key={itemKey}
        draggable={isEditMode}
        onDragStart={(e) => handleDragStart(e, groupId, item.id)}
        onDragOver={(e) => handleDragOver(e, groupId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, groupId)}
        onDragEnd={handleDragEnd}
        className={cn(
          isEditMode && dragItem?.itemId === item.id && "opacity-50",
          isEditMode && dragOverGroup === groupId && dragItem?.groupId !== groupId && "bg-primary/10"
        )}
      >
        <SidebarMenuButton asChild isActive={isActive}>
          <Link 
            to={item.url || "#"} 
            className={cn(
              "flex items-center gap-3 rounded-md transition-colors text-sm",
              isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={handleNavClick}
          >
            {isEditMode && (
              <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
            )}
            <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
            <span className="truncate text-sm">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <div className="flex items-center gap-3">
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
                <span className="text-[10px] text-muted-foreground">Property Management</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atur Urutan Menu</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {isEditMode && !isCollapsed && (
          <div className="flex items-center gap-2 px-2 pb-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-7 text-xs"
              onClick={saveMenuOrder}
            >
              <Save className="h-3 w-3 mr-1" />
              Simpan
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2"
              onClick={resetMenuOrder}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto flex-1">
        {menuGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.id] || false;
          
          return (
            <SidebarGroup 
              key={group.id} 
              className={cn(
                "py-[2px] transition-colors",
                isEditMode && dragOverGroup === group.id && "bg-primary/5 border-2 border-dashed border-primary/30 rounded-md"
              )}
            >
              <Collapsible 
                defaultOpen={!isGroupCollapsed}
                open={!isGroupCollapsed}
              >
                <CollapsibleTrigger asChild>
                  <button 
                    className="flex items-center gap-2 cursor-pointer group mb-1 px-2 w-full text-left"
                    onClick={() => toggleGroupCollapse(group.id)}
                  >
                    <SidebarGroupLabel className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold flex-1">
                      {group.label}
                    </SidebarGroupLabel>
                    {!isCollapsed && (
                      isGroupCollapsed ? (
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )
                    )}
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map(item => renderMenuItem(item, group.id))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border mt-auto shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link 
                to="/" 
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg" 
                onClick={handleNavClick}
              >
                <Home className="h-4 w-4 shrink-0" />
                <span>Back to Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
