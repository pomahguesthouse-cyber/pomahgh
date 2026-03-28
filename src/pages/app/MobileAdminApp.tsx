import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, List, MessageCircle, Bell, LogOut } from "lucide-react";
import { MobileCalendarTab } from "./tabs/MobileCalendarTab";
import { MobileBookingsTab } from "./tabs/MobileBookingsTab";
import { MobileChatTab } from "./tabs/MobileChatTab";
import { MobileNotificationsTab } from "./tabs/MobileNotificationsTab";

type TabId = "calendar" | "bookings" | "chat" | "notifications";

const tabs = [
  { id: "calendar" as TabId, label: "Kalender", icon: Calendar },
  { id: "bookings" as TabId, label: "Booking", icon: List },
  { id: "chat" as TabId, label: "Chat", icon: MessageCircle },
  { id: "notifications" as TabId, label: "Notifikasi", icon: Bell },
];

const MobileAdminApp = () => {
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const navigate = useNavigate();

  // Enable real-time notifications
  useAdminNotifications();

  // Listen for new WhatsApp messages for badge
  useEffect(() => {
    const channel = supabase
      .channel("mobile-unread-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: "role=eq.user" },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auth check
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/app/login");
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIsAdmin(true);
        } else {
          navigate("/app/login");
        }
        setCheckingRole(false);
      });
  }, [user, authLoading, navigate]);

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleLogout = async () => {
    await signOut();
    navigate("/app/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="font-semibold text-lg">Pomah Admin</h1>
        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-primary/80 transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "calendar" && <MobileCalendarTab />}
        {activeTab === "bookings" && <MobileBookingsTab />}
        {activeTab === "chat" && <MobileChatTab />}
        {activeTab === "notifications" && <MobileNotificationsTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "notifications") setUnreadCount(0);
                }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px] ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {tab.id === "notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* Safe area for bottom notch */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
};

export default MobileAdminApp;
