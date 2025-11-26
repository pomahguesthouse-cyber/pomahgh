import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SearchDatesProvider } from "@/contexts/SearchDatesContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Bookings from "./pages/Bookings";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminHeroSlides from "./pages/admin/AdminHeroSlides";
import AdminFacilities from "./pages/admin/AdminFacilities";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNearbyLocations from "./pages/admin/AdminNearbyLocations";
import AdminChatbot from "./pages/admin/AdminChatbot";
import AdminChannelManagers from "./pages/admin/AdminChannelManagers";
import AdminInvoiceTemplate from "./pages/admin/AdminInvoiceTemplate";
import AdminBankAccounts from "./pages/admin/AdminBankAccounts";
import AdminRoomFeatures from "./pages/admin/AdminRoomFeatures";
import RoomDetail from "./pages/RoomDetail";
import { AdminLayout } from "./components/admin/AdminLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SearchDatesProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/rooms/:roomSlug" element={<RoomDetail />} />
            <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/rooms" element={<AdminLayout><AdminRooms /></AdminLayout>} />
          <Route path="/admin/bookings" element={<AdminLayout><AdminBookings /></AdminLayout>} />
          <Route path="/admin/hero-slides" element={<AdminLayout><AdminHeroSlides /></AdminLayout>} />
            <Route path="/admin/facilities" element={<AdminLayout><AdminFacilities /></AdminLayout>} />
            <Route path="/admin/room-features" element={<AdminLayout><AdminRoomFeatures /></AdminLayout>} />
            <Route path="/admin/nearby-locations" element={<AdminLayout><AdminNearbyLocations /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
          <Route path="/admin/chatbot" element={<AdminLayout><AdminChatbot /></AdminLayout>} />
          <Route path="/admin/channel-managers" element={<AdminLayout><AdminChannelManagers /></AdminLayout>} />
          <Route path="/admin/bank-accounts" element={<AdminLayout><AdminBankAccounts /></AdminLayout>} />
          <Route path="/admin/invoice-template" element={<AdminLayout><AdminInvoiceTemplate /></AdminLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SearchDatesProvider>
    </TooltipProvider>
  </HelmetProvider>
  </QueryClientProvider>
);

export default App;
