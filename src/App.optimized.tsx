import { Suspense } from 'react';
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
import { LazyLoadingFallback } from "@/components/optimized/LazyLoadingFallback";

// Lazy loaded components
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Bookings = lazy(() => import("./pages/Bookings"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExploreSemarang = lazy(() => import("./pages/ExploreSemarang"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AttractionDetail = lazy(() => import("./pages/AttractionDetail"));
const Chat = lazy(() => import("./pages/Chat"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const ManagerCalendar = lazy(() => import("./pages/public/ManagerCalendar"));
const PageEditorPage = lazy(() => import("./pages/PageEditorPage"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));

// Create optimized query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Optimized loading component
const OptimizedRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LazyLoadingFallback />}>
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
                  {/* Public routes */}
                  <Route 
                    path="/" 
                    element={
                      <OptimizedRoute>
                        <Index />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/auth" 
                    element={
                      <OptimizedRoute>
                        <Auth />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/bookings" 
                    element={
                      <OptimizedRoute>
                        <Bookings />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/rooms/:roomSlug" 
                    element={
                      <OptimizedRoute>
                        <RoomDetail />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/explore-semarang" 
                    element={
                      <OptimizedRoute>
                        <ExploreSemarang />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/explore-semarang/:slug" 
                    element={
                      <OptimizedRoute>
                        <AttractionDetail />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/events/:slug" 
                    element={
                      <OptimizedRoute>
                        <EventDetail />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/chat" 
                    element={
                      <OptimizedRoute>
                        <Chat />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <OptimizedRoute>
                        <AdminLogin />
                      </OptimizedRoute>
                    } 
                  />
                  
                  {/* Admin routes with lazy loading */}
                  <Route 
                    path="/admin/dashboard" 
                    element={
                      <OptimizedRoute>
                        <AdminLayout>
                          <Suspense fallback={<div>Loading dashboard...</div>}>
                            <AdminDashboard />
                          </Suspense>
                        </AdminLayout>
                      </OptimizedRoute>
                    } 
                  />
                  
                  {/* Add other admin routes similarly */}
                  
                  <Route 
                    path="/editor" 
                    element={
                      <OptimizedRoute>
                        <PageEditorPage />
                      </OptimizedRoute>
                    } 
                  />
                  <Route 
                    path="/manager/view-calendar/:token" 
                    element={
                      <OptimizedRoute>
                        <ManagerCalendar />
                      </OptimizedRoute>
                    } 
                  />
                  
                  {/* Dynamic landing pages */}
                  <Route 
                    path="/:slug" 
                    element={
                      <OptimizedRoute>
                        <LandingPage />
                      </OptimizedRoute>
                    } 
                  />
                  
                  {/* Catch-all route */}
                  <Route 
                    path="*" 
                    element={
                      <OptimizedRoute>
                        <NotFound />
                      </OptimizedRoute>
                    } 
                  />
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