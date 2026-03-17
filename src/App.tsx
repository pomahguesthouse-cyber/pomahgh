import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { SearchDatesProvider } from "@/contexts/SearchDatesContext";
import { PublicOverridesProvider } from "@/contexts/PublicOverridesContext";
import { GlobalSEO } from "@/components/GlobalSEO";
import { SubdomainRouter } from "@/components/SubdomainRouter";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Bookings from "./pages/Bookings";
import RoomDetail from "./pages/RoomDetail";
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminRooms = lazy(() => import("./pages/admin/AdminRooms"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminFacilityHeroSlides = lazy(() => import("./pages/admin/AdminFacilityHeroSlides"));
const AdminFacilities = lazy(() => import("./pages/admin/AdminFacilities"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminNearbyLocations = lazy(() => import("./pages/admin/AdminNearbyLocations"));
const AdminGuestChatbot = lazy(() => import("./pages/admin/AdminGuestChatbot"));
const AdminAdminChatbot = lazy(() => import("./pages/admin/AdminAdminChatbot"));
const AdminChannelManagers = lazy(() => import("./pages/admin/AdminChannelManagers"));
const AdminBookingCom = lazy(() => import("./pages/admin/AdminBookingCom"));
const AdminBankAccounts = lazy(() => import("./pages/admin/AdminBankAccounts"));
const AdminRoomFeatures = lazy(() => import("./pages/admin/AdminRoomFeatures"));
const AdminSeoSettings = lazy(() => import("./pages/admin/AdminSeoSettings"));
const AdminLandingPages = lazy(() => import("./pages/admin/AdminLandingPages"));
const AdminMediaLibrary = lazy(() => import("./pages/admin/AdminMediaLibrary"));
const AdminRoomAddons = lazy(() => import("./pages/admin/AdminRoomAddons"));
const AdminPromotions = lazy(() => import("./pages/admin/AdminPromotions"));
const AdminCityAttractions = lazy(() => import("./pages/admin/AdminCityAttractions"));
const AdminExploreHeroSlides = lazy(() => import("./pages/admin/AdminExploreHeroSlides"));
const AdminCompetitorAnalysis = lazy(() => import("./pages/admin/AdminCompetitorAnalysis"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminCityEvents = lazy(() => import("./pages/admin/AdminCityEvents"));
const ManagerCalendar = lazy(() => import("./pages/public/ManagerCalendar"));
const Payment = lazy(() => import("./pages/public/Payment"));
const PaymentStatus = lazy(() => import("./pages/public/PaymentStatus"));
const PageEditorPage = lazy(() => import("./pages/PageEditorPage"));
const MemberDashboard = lazy(() => import("./pages/user/MemberDashboard"));
import { AdminLayout } from "./components/admin/AdminLayout";
import NotFound from "./pages/NotFound";
import ExploreSemarang from "./pages/ExploreSemarang";
import LandingPage from "./pages/LandingPage";
import AttractionDetail from "./pages/AttractionDetail";
import Chat from "./pages/Chat";
import EventDetail from "./pages/EventDetail";

const queryClient = new QueryClient();

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
            <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
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
          <Route path="/admin/chatbot" element={<AdminLayout><AdminGuestChatbot /></AdminLayout>} />
          <Route path="/admin/chatbot/guest" element={<AdminLayout><AdminGuestChatbot /></AdminLayout>} />
          <Route path="/admin/chatbot/admin" element={<AdminLayout><AdminAdminChatbot /></AdminLayout>} />
          <Route path="/admin/chat" element={<AdminLayout><AdminChat /></AdminLayout>} />
          <Route path="/admin/channel-managers" element={<AdminLayout><AdminChannelManagers /></AdminLayout>} />
          <Route path="/admin/booking-com" element={<AdminLayout><AdminBookingCom /></AdminLayout>} />
          <Route path="/admin/bank-accounts" element={<AdminLayout><AdminBankAccounts /></AdminLayout>} />
          <Route path="/admin/seo-settings" element={<AdminLayout><AdminSeoSettings /></AdminLayout>} />
          <Route path="/admin/landing-pages" element={<AdminLayout><AdminLandingPages /></AdminLayout>} />
          <Route path="/admin/media-library" element={<AdminLayout><AdminMediaLibrary /></AdminLayout>} />
          
          <Route path="/admin/city-attractions" element={<AdminLayout><AdminCityAttractions /></AdminLayout>} />
          <Route path="/admin/explore-hero-slides" element={<AdminLayout><AdminExploreHeroSlides /></AdminLayout>} />
          <Route path="/admin/city-events" element={<AdminLayout><AdminCityEvents /></AdminLayout>} />
          <Route path="/admin/competitor-analysis" element={<AdminCompetitorAnalysis />} />
          <Route path="/editor" element={<PageEditorPage />} />
          <Route path="/payment/:bookingId" element={<Payment />} />
          <Route path="/payment/:bookingId/status" element={<PaymentStatus />} />
          <Route path="/manager/view-calendar/:token" element={<ManagerCalendar />} />
          {/* Dynamic landing pages - must be before catch-all */}
          <Route path="/:slug" element={<LandingPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
            </Suspense>
            </SubdomainRouter>
        </BrowserRouter>
          </PublicOverridesProvider>
      </SearchDatesProvider>
    </TooltipProvider>
  </HelmetProvider>
  </QueryClientProvider>
);

export default App;
