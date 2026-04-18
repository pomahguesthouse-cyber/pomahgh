import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense, Component, ReactNode } from "react";
import { SearchDatesProvider } from "@/contexts/SearchDatesContext";
import { PublicOverridesProvider } from "@/contexts/PublicOverridesContext";
import { GlobalSEO } from "@/components/GlobalSEO";
import { SubdomainRouter } from "@/components/SubdomainRouter";

// Auto-reload on chunk load failure (stale cache after deploy)
function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((err) => {
      const key = "chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
      throw err;
    })
  );
}

// Simple error boundary to prevent full-page crashes from route errors
class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center text-center p-8">
          <div>
            <p className="text-lg font-semibold mb-2">Terjadi kesalahan.</p>
            <a href="/" className="text-blue-600 underline text-sm">Kembali ke beranda</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Index = lazyRetry(() => import("./pages/Index"));
const Auth = lazyRetry(() => import("./pages/Auth"));
const Bookings = lazyRetry(() => import("./pages/Bookings"));
const RoomDetail = lazyRetry(() => import("./pages/RoomDetail"));
const AdminLogin = lazyRetry(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard"));
const AdminBookingCalendarPage = lazyRetry(() => import("./pages/admin/AdminBookingCalendarPage"));
const AdminRooms = lazyRetry(() => import("./pages/admin/AdminRooms"));
const AdminBookings = lazyRetry(() => import("./pages/admin/AdminBookings"));
const AdminHeroSlides = lazyRetry(() => import("./pages/admin/AdminHeroSlides"));
const AdminFacilityHeroSlides = lazyRetry(() => import("./pages/admin/AdminFacilityHeroSlides"));
const AdminFacilities = lazyRetry(() => import("./pages/admin/AdminFacilities"));
const AdminSettings = lazyRetry(() => import("./pages/admin/AdminSettings"));
const AdminInvoiceManagement = lazyRetry(() => import("./pages/admin/AdminInvoiceManagement"));
const AdminNearbyLocations = lazyRetry(() => import("./pages/admin/AdminNearbyLocations"));
const AdminGuestChatbot = lazyRetry(() => import("./pages/admin/AdminGuestChatbot"));
const AdminAdminChatbot = lazyRetry(() => import("./pages/admin/AdminAdminChatbot"));
const AdminBankAccounts = lazyRetry(() => import("./pages/admin/AdminBankAccounts"));
const AdminRoomFeatures = lazyRetry(() => import("./pages/admin/AdminRoomFeatures"));
const AdminSeoSettings = lazyRetry(() => import("./pages/admin/AdminSeoSettings"));
const AdminMediaLibrary = lazyRetry(() => import("./pages/admin/AdminMediaLibrary"));
const AdminRoomAddons = lazyRetry(() => import("./pages/admin/AdminRoomAddons"));
const AdminPromotions = lazyRetry(() => import("./pages/admin/AdminPromotions"));
const AdminCityAttractions = lazyRetry(() => import("./pages/admin/AdminCityAttractions"));
const AdminExploreHeroSlides = lazyRetry(() => import("./pages/admin/AdminExploreHeroSlides"));
const AdminCompetitorAnalysis = lazyRetry(() => import("./pages/admin/AdminCompetitorAnalysis"));
const AdminChat = lazyRetry(() => import("./pages/admin/AdminChat"));


const AdminCityEvents = lazyRetry(() => import("./pages/admin/AdminCityEvents"));
const AdminLandingPages = lazyRetry(() => import("./pages/admin/AdminLandingPages"));
const ManagerCalendar = lazyRetry(() => import("./pages/public/ManagerCalendar"));

const PageEditorPage = lazyRetry(() => import("./pages/PageEditorPage"));
const MemberDashboard = lazyRetry(() => import("./pages/user/MemberDashboard"));
const AdminLayout = lazyRetry(() => import("./components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const ExploreSemarang = lazyRetry(() => import("./pages/ExploreSemarang"));
const LandingPage = lazyRetry(() => import("./pages/LandingPage"));
const MobileAdminApp = lazyRetry(() => import("./pages/app/MobileAdminApp"));
const MobileLoginPage = lazyRetry(() => import("./pages/app/MobileLoginPage"));
const AttractionDetail = lazyRetry(() => import("./pages/AttractionDetail"));
const Chat = lazyRetry(() => import("./pages/Chat"));
const EventDetail = lazyRetry(() => import("./pages/EventDetail"));
const AdminMultiAgentDashboard = lazyRetry(() => import("./pages/admin/AdminMultiAgentDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <GlobalSEO />
        <Toaster />
        <Sonner />
        <SearchDatesProvider>
          <PublicOverridesProvider>
          <BrowserRouter>
            <SubdomainRouter>
            <AppErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/rooms/:roomSlug" element={<RoomDetail />} />
            <Route path="/explore-semarang" element={<ExploreSemarang />} />
            <Route path="/explore-semarang/:slug" element={<AttractionDetail />} />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/member" element={<MemberDashboard />} />
            <Route path="/app" element={<MobileAdminApp />} />
            <Route path="/app/login" element={<MobileLoginPage />} />
            <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/booking-calendar" element={<AdminLayout><AdminBookingCalendarPage /></AdminLayout>} />
          <Route path="/admin/rooms" element={<AdminLayout><AdminRooms /></AdminLayout>} />
          <Route path="/admin/bookings" element={<AdminLayout><AdminBookings /></AdminLayout>} />
          <Route path="/admin/hero-slides" element={<AdminLayout><AdminHeroSlides /></AdminLayout>} />
          <Route path="/admin/facility-hero-slides" element={<AdminLayout><AdminFacilityHeroSlides /></AdminLayout>} />
            <Route path="/admin/facilities" element={<AdminLayout><AdminFacilities /></AdminLayout>} />
          <Route path="/admin/room-features" element={<AdminLayout><AdminRoomFeatures /></AdminLayout>} />
          <Route path="/admin/room-addons" element={<AdminLayout><AdminRoomAddons /></AdminLayout>} />
          <Route path="/admin/promotions" element={<AdminLayout><AdminPromotions /></AdminLayout>} />
            <Route path="/admin/nearby-locations" element={<AdminLayout><AdminNearbyLocations /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
          <Route path="/admin/invoice-management" element={<AdminLayout><AdminInvoiceManagement /></AdminLayout>} />
          <Route path="/admin/chatbot" element={<AdminLayout><AdminGuestChatbot /></AdminLayout>} />
          <Route path="/admin/chatbot/guest" element={<AdminLayout><AdminGuestChatbot /></AdminLayout>} />
          <Route path="/admin/chatbot/admin" element={<AdminLayout><AdminAdminChatbot /></AdminLayout>} />
          
          
          <Route path="/admin/chat" element={<AdminLayout><AdminChat /></AdminLayout>} />
          <Route path="/admin/multi-agent" element={<AdminLayout><AdminMultiAgentDashboard /></AdminLayout>} />
          <Route path="/admin/bank-accounts" element={<AdminLayout><AdminBankAccounts /></AdminLayout>} />
          <Route path="/admin/seo-settings" element={<AdminLayout><AdminSeoSettings /></AdminLayout>} />
          <Route path="/admin/page-editor" element={<AdminLayout><AdminLandingPages /></AdminLayout>} />
          <Route path="/admin/media-library" element={<AdminLayout><AdminMediaLibrary /></AdminLayout>} />
          
          <Route path="/admin/city-attractions" element={<AdminLayout><AdminCityAttractions /></AdminLayout>} />
          <Route path="/admin/explore-hero-slides" element={<AdminLayout><AdminExploreHeroSlides /></AdminLayout>} />
          <Route path="/admin/city-events" element={<AdminLayout><AdminCityEvents /></AdminLayout>} />
          <Route path="/admin/competitor-analysis" element={<AdminCompetitorAnalysis />} />
          <Route path="/editor" element={<PageEditorPage />} />
          <Route path="/manager/view-calendar/:token" element={<ManagerCalendar />} />
          {/* Dynamic landing pages - must be before catch-all */}
          <Route path="/:slug" element={<LandingPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
            </Suspense>
            </AppErrorBoundary>
            </SubdomainRouter>
        </BrowserRouter>
          </PublicOverridesProvider>
      </SearchDatesProvider>
    </TooltipProvider>
  </HelmetProvider>
  </QueryClientProvider>
);

export default App;
