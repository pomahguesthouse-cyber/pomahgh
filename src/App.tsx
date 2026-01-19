import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { SearchDatesProvider } from "@/contexts/SearchDatesContext";
import { GlobalSEO } from "@/components/GlobalSEO";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Bookings from "./pages/Bookings";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminHeroSlides from "./pages/admin/AdminHeroSlides";
import AdminFacilityHeroSlides from "./pages/admin/AdminFacilityHeroSlides";
import AdminFacilities from "./pages/admin/AdminFacilities";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNearbyLocations from "./pages/admin/AdminNearbyLocations";
import AdminChatbot from "./pages/admin/AdminChatbot";
import AdminGuestChatbot from "./pages/admin/AdminGuestChatbot";
import AdminAdminChatbot from "./pages/admin/AdminAdminChatbot";
import AdminChannelManagers from "./pages/admin/AdminChannelManagers";
import AdminBankAccounts from "./pages/admin/AdminBankAccounts";
import AdminRoomFeatures from "./pages/admin/AdminRoomFeatures";
import AdminSeoSettings from "./pages/admin/AdminSeoSettings";
import RoomDetail from "./pages/RoomDetail";
import AdminInvoiceTemplate from "./pages/admin/AdminInvoiceTemplate";
import AdminRoomAddons from "./pages/admin/AdminRoomAddons";
import AdminPromotions from "./pages/admin/AdminPromotions";
import { AdminLayout } from "./components/admin/AdminLayout";
import NotFound from "./pages/NotFound";
import ExploreSemarang from "./pages/ExploreSemarang";
import AttractionDetail from "./pages/AttractionDetail";
import AdminCityAttractions from "./pages/admin/AdminCityAttractions";
import AdminExploreHeroSlides from "./pages/admin/AdminExploreHeroSlides";
import AdminCompetitorAnalysis from "./pages/admin/AdminCompetitorAnalysis";
import Chat from "./pages/Chat";
import AdminChat from "./pages/admin/AdminChat";
import AdminCityEvents from "./pages/admin/AdminCityEvents";
import EventDetail from "./pages/EventDetail";
import AdminDeveloperTools from "./pages/admin/AdminDeveloperTools";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="hotel-theme">
        <TooltipProvider>
          <GlobalSEO />
          <Toaster />
          <Sonner />
          <SearchDatesProvider>
            <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/rooms/:roomSlug" element={<RoomDetail />} />
            <Route path="/explore-semarang" element={<ExploreSemarang />} />
            <Route path="/explore-semarang/:slug" element={<AttractionDetail />} />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route path="/chat" element={<Chat />} />
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
          <Route path="/admin/bank-accounts" element={<AdminLayout><AdminBankAccounts /></AdminLayout>} />
          <Route path="/admin/seo-settings" element={<AdminLayout><AdminSeoSettings /></AdminLayout>} />
          <Route path="/admin/invoice-template" element={<AdminLayout><AdminInvoiceTemplate /></AdminLayout>} />
          <Route path="/admin/city-attractions" element={<AdminLayout><AdminCityAttractions /></AdminLayout>} />
          <Route path="/admin/explore-hero-slides" element={<AdminLayout><AdminExploreHeroSlides /></AdminLayout>} />
          <Route path="/admin/city-events" element={<AdminLayout><AdminCityEvents /></AdminLayout>} />
          <Route path="/admin/competitor-analysis" element={<AdminCompetitorAnalysis />} />
          <Route path="/admin/developer-tools" element={<AdminLayout><AdminDeveloperTools /></AdminLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </SearchDatesProvider>
      </TooltipProvider>
    </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
