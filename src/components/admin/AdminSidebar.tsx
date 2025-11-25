import { LayoutDashboard, Home, Calendar, Building2, ImageIcon, Boxes, Settings, MessageCircle, MapPin, CreditCard, FileText, Tags } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Bookings", url: "/admin/bookings", icon: Calendar },
  { title: "Rooms", url: "/admin/rooms", icon: Building2 },
  { title: "Hero Slides", url: "/admin/hero-slides", icon: ImageIcon },
  { title: "Facilities", url: "/admin/facilities", icon: Boxes },
  { title: "Room Features", url: "/admin/room-features", icon: Tags },
  { title: "Lokasi Terdekat", url: "/admin/nearby-locations", icon: MapPin },
  { title: "Bank Accounts", url: "/admin/bank-accounts", icon: CreditCard },
  { title: "Invoice Template", url: "/admin/invoice-template", icon: FileText },
  { title: "Chatbot AI", url: "/admin/chatbot", icon: MessageCircle },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    className="hover:bg-accent"
                  >
                    <Home className="h-4 w-4" />
                    {open && <span>Back to Site</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
