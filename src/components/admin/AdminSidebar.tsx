import { useState, useEffect } from "react";
import { Home, Calendar, Building2, ImageIcon, Boxes, Settings, MessageCircle, MapPin, CreditCard, Tags, RefreshCw, LayoutDashboard, Search, FileText, Compass, ChevronRight, ChevronDown, Sparkles, Percent, TrendingUp, Bot, Users, Shield, FileType, FolderOpen, GripVertical, Save, RotateCcw } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  collapsed?: boolean;
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

function SortableMenuItem({ 
  item, 
  isActive, 
  onClick,
  isEditMode,
  groupId
}: { 
  item: MenuItem; 
  isActive: boolean; 
  onClick: () => void;
  isEditMode: boolean;
  groupId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: `${groupId}-${item.id}`,
    disabled: !isEditMode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSubmenuClick = (e: React.MouseEvent, subUrl?: string) => {
    e.stopPropagation();
    if (subUrl) {
      window.location.href = subUrl;
    }
  };

  if (item.submenu) {
    return (
      <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
        <Collapsible defaultOpen>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton 
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-colors w-full",
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {isEditMode && (
                  <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                <span className="truncate flex-1">{item.title}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="ml-4 mt-1 border-l border-border pl-2">
                {item.submenu.map((sub, idx) => {
                  const isSubActive = location.pathname === sub.url;
                  return (
                    <SidebarMenuItem key={idx}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isSubActive}
                        className={cn(
                          "flex items-center gap-3 rounded-lg transition-colors",
                          isSubActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <div 
                          className="flex items-center gap-3 w-full cursor-pointer"
                          onClick={(e) => handleSubmenuClick(e, sub.url)}
                        >
                          <sub.icon className={cn("h-4 w-4 shrink-0", isSubActive && "text-primary")} />
                          <span className="truncate text-sm">{sub.title}</span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <SidebarMenuItem>
        <SidebarMenuButton 
          asChild 
          isActive={isActive}
          className={cn(
            "flex items-center gap-3 rounded-md transition-colors text-sm",
            isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-3 w-full">
            {isEditMode && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
            <span className="truncate text-sm">{item.title}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </div>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isVirtualAssistantActive = location.pathname.startsWith("/admin/chatbot") || location.pathname === "/admin/chat";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the groups and items
    let activeGroupIndex = -1;
    let activeItemIndex = -1;
    let overGroupIndex = -1;
    let overItemIndex = -1;

    menuGroups.forEach((group, gi) => {
      group.items.forEach((item, ii) => {
        const itemId = `${group.id}-${item.id}`;
        if (itemId === activeId) {
          activeGroupIndex = gi;
          activeItemIndex = ii;
        }
        if (itemId === overId) {
          overGroupIndex = gi;
          overItemIndex = ii;
        }
      });
    });

    if (activeGroupIndex === -1 || overGroupIndex === -1) return;

    setMenuGroups(prev => {
      const newGroups = [...prev];
      const activeGroup = { ...newGroups[activeGroupIndex] };
      const activeItems = [...activeGroup.items];
      
      if (activeGroupIndex === overGroupIndex) {
        // Reorder within same group
        const newItems = arrayMove(activeItems, activeItemIndex, overItemIndex);
        activeGroup.items = newItems;
        newGroups[activeGroupIndex] = activeGroup;
      } else {
        // Move between groups
        const overGroup = { ...newGroups[overGroupIndex] };
        const overItems = [...overGroup.items];
        
        const [movedItem] = activeItems.splice(activeItemIndex, 1);
        overItems.splice(overItemIndex, 0, movedItem);
        
        activeGroup.items = activeItems;
        overGroup.items = overItems;
        
        newGroups[activeGroupIndex] = activeGroup;
        newGroups[overGroupIndex] = overGroup;
      }
      
      return newGroups;
    });
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

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Header */}
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
        
        {/* Edit Mode Controls */}
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

      {/* Menu Groups */}
      <SidebarContent className="px-2 overflow-y-auto flex-1">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {menuGroups.map((group) => (
            <SidebarGroup key={group.id} className="py-[2px]">
              <Collapsible 
                defaultOpen={!collapsedGroups[group.id]}
                open={!collapsedGroups[group.id]}
              >
                <CollapsibleTrigger asChild>
                  <div 
                    className="flex items-center gap-2 cursor-pointer group mb-1 px-2"
                    onClick={() => toggleGroupCollapse(group.id)}
                  >
                    <SidebarGroupLabel className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold flex-1 text-left">
                      {group.label}
                    </SidebarGroupLabel>
                    {!isCollapsed && (
                      collapsedGroups[group.id] ? (
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SortableContext 
                      items={group.items.map(item => `${group.id}-${item.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.url;
                          return (
                            <SortableMenuItem
                              key={`${group.id}-${item.id}`}
                              item={item}
                              isActive={isActive}
                              onClick={handleNavClick}
                              isEditMode={isEditMode}
                              groupId={group.id}
                            />
                          );
                        })}
                      </SidebarMenu>
                    </SortableContext>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          ))}
        </DndContext>
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
