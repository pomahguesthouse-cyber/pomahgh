import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SearchDatesProvider } from "@/contexts/SearchDatesContext";
import { PublicOverridesProvider } from "@/contexts/PublicOverridesContext";
import { GlobalSEO } from "@/components/GlobalSEO";
import { SubdomainRouter } from "@/components/SubdomainRouter";

// Lazy load components for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Bookings = lazy(() => import("./pages/Bookings"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminRooms = lazy(() => import("./pages/admin/AdminRooms"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminFacilityHeroSlides = lazy(() => import("./pages/admin/AdminFacilityHeroSlides"));
const AdminFacilities = lazy(() => import("./pages/admin/AdminFacilities"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminNearbyLocations = lazy(() => import("./pages/admin/AdminNearbyLocations"));
const AdminChatbot = lazy(() => import("./pages/admin/AdminChatbot"));
const AdminGuestChatbot = lazy(() => import("./pages/admin/AdminGuestChatbot"));
const AdminAdminChatbot = lazy(() => import("./pages/admin/AdminAdminChatbot"));
const AdminChannelManagers = lazy(() => import("./pages/admin/AdminChannelManagers"));
const AdminBankAccounts = lazy(() => import("./pages/admin/AdminBankAccounts"));
const AdminRoomFeatures = lazy(() => import("./pages/admin/AdminRoomFeatures"));
const AdminSeoSettings = lazy(() => import("./pages/admin/AdminSeoSettings"));
const AdminLandingPages = lazy(() => import("./pages/admin/AdminLandingPages"));
const AdminMediaLibrary = lazy(() => import("./pages/admin/AdminMediaLibrary"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
const AdminInvoiceTemplate = lazy(() => import("./pages/admin/AdminInvoiceTemplate"));
const AdminRoomAddons = lazy(() => import("./pages/admin/AdminRoomAddons"));
const AdminPromotions = lazy(() => import("./pages/admin/AdminPromotions"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExploreSemarang = lazy(() => import("./pages/ExploreSemarang"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AttractionDetail = lazy(() => import("./pages/AttractionDetail"));
const AdminCityAttractions = lazy(() => import("./pages/admin/AdminCityAttractions"));
const AdminExploreHeroSlides = lazy(() => import("./pages/admin/AdminExploreHeroSlides"));
const AdminCompetitorAnalysis = lazy(() => import("./pages/admin/AdminCompetitorAnalysis"));
const Chat = lazy(() => import("./pages/Chat"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminCityEvents = lazy(() => import("./pages/admin/AdminCityEvents"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const ManagerCalendar = lazy(() => import("./pages/public/ManagerCalendar"));
const PageEditorPage = lazy(() => import("./pages/PageEditorPage"));

// Optimized QueryClient with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const OptimizedRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
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
                <Routes>
                  {/* Public routes with lazy loading */}
                  <Route path="/" element={<OptimizedRoute><Index /></OptimizedRoute>} />
                  <Route path="/auth" element={<OptimizedRoute><Auth /></OptimizedRoute>} />
                  <Route path="/bookings" element={<OptimizedRoute><Bookings /></OptimizedRoute>} />
                  <Route path="/rooms/:roomSlug" element={<OptimizedRoute><RoomDetail /></OptimizedRoute>} />
                  <Route path="/explore-semarang" element={<OptimizedRoute><ExploreSemarang /></OptimizedRoute>} />
                  <Route path="/explore-semarang/:slug" element={<OptimizedRoute><AttractionDetail /></OptimizedRoute>} />
                  <Route path="/events/:slug" element={<OptimizedRoute><EventDetail /></OptimizedRoute>} />
                  <Route path="/chat" element={<OptimizedRoute><Chat /></OptimizedRoute>} />
                  <Route path="/admin" element={<OptimizedRoute><AdminLogin /></OptimizedRoute>} />
                  
                  {/* Admin routes with lazy loading and AdminLayout */}
                  <Route 
                    path="/admin/dashboard" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminDashboard />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/rooms" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminRooms />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/bookings" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminBookings />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/hero-slides" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminHeroSlides />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/facility-hero-slides" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminFacilityHeroSlides />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/facilities" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminFacilities />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/room-features" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminRoomFeatures />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/room-addons" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminRoomAddons />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/promotions" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminPromotions />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/nearby-locations" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminNearbyLocations />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/settings" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminSettings />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/chatbot" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminGuestChatbot />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/chatbot/guest" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminGuestChatbot />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/chatbot/admin" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminAdminChatbot />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/chat" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminChat />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/channel-managers" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminChannelManagers />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/bank-accounts" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminBankAccounts />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/seo-settings" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminSeoSettings />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/landing-pages" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminLandingPages />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/media-library" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminMediaLibrary />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/invoice-template" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminInvoiceTemplate />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/city-attractions" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminCityAttractions />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/explore-hero-slides" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminExploreHeroSlides />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/city-events" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <AdminCityEvents />
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  <Route path="/admin/competitor-analysis" element={<OptimizedRoute><AdminCompetitorAnalysis /></OptimizedRoute>} />
                  <Route path="/editor" element={<OptimizedRoute><PageEditorPage /></OptimizedRoute>} />
                  <Route path="/manager/view-calendar/:token" element={<OptimizedRoute><ManagerCalendar /></OptimizedRoute>} />
                  
                  {/* Dynamic landing pages - must be before catch-all */}
                  <Route path="/:slug" element={<OptimizedRoute><LandingPage /></OptimizedRoute>} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<OptimizedRoute><NotFound /></OptimizedRoute>} />
                </Routes>
              </SubdomainRouter>
            </BrowserRouter>
          </PublicOverridesProvider>
        </SearchDatesProvider>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
