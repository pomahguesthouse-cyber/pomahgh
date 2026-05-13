import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { HelmetProvider } from "react-helmet-async";

import { lazy, Suspense, Component } from "react";

import type { ReactNode } from "react";

import { SearchDatesProvider } from "@/contexts/SearchDatesContext";
import { PublicOverridesProvider } from "@/contexts/PublicOverridesContext";

import { GlobalSEO } from "@/components/GlobalSEO";
import { SubdomainRouter } from "@/components/SubdomainRouter";

/* ------------------------------------------------ */
/* Lazy Retry */
/* ------------------------------------------------ */

function lazyRetry<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((err) => {
      const key = "chunk_reload";

      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }

      throw err;
    }),
  );
}

/* ------------------------------------------------ */
/* Error Boundary */
/* ------------------------------------------------ */

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center text-center p-8">
          <div>
            <p className="text-lg font-semibold mb-2">Terjadi kesalahan.</p>

            <a href="/" className="text-blue-600 underline text-sm">
              Kembali ke beranda
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ------------------------------------------------ */
/* Public Pages */
/* ------------------------------------------------ */

const Index = lazyRetry(() => import("./pages/Index"));
const Auth = lazyRetry(() => import("./pages/Auth"));
const Bookings = lazyRetry(() => import("./pages/Bookings"));
const RoomDetail = lazyRetry(() => import("./pages/RoomDetail"));
const ExploreSemarang = lazyRetry(() => import("./pages/ExploreSemarang"));
const AttractionDetail = lazyRetry(() => import("./pages/AttractionDetail"));
const EventDetail = lazyRetry(() => import("./pages/EventDetail"));
const Chat = lazyRetry(() => import("./pages/Chat"));
const LandingPage = lazyRetry(() => import("./pages/LandingPage"));
const PageEditorPage = lazyRetry(() => import("./pages/PageEditorPage"));

/* ------------------------------------------------ */
/* SEO Pages */
/* ------------------------------------------------ */

const AreaLandingPage = lazyRetry(() => import("./pages/AreaLandingPage"));

/* ------------------------------------------------ */
/* Mobile */
/* ------------------------------------------------ */

const MobileAdminApp = lazyRetry(() => import("./pages/app/MobileAdminApp"));

const MobileLoginPage = lazyRetry(() => import("./pages/app/MobileLoginPage"));

/* ------------------------------------------------ */
/* User */
/* ------------------------------------------------ */

const MemberDashboard = lazyRetry(() => import("./pages/user/MemberDashboard"));

/* ------------------------------------------------ */
/* Manager */
/* ------------------------------------------------ */

const ManagerCalendar = lazyRetry(() => import("./pages/public/ManagerCalendar"));

/* ------------------------------------------------ */
/* Admin */
/* ------------------------------------------------ */

const AdminLogin = lazyRetry(() => import("./pages/admin/AdminLogin"));

const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard"));

const AdminBookingCalendarPage = lazyRetry(() => import("./pages/admin/AdminBookingCalendarPage"));

const AdminRooms = lazyRetry(() => import("./pages/admin/AdminRooms"));

const AdminBookings = lazyRetry(() => import("./pages/admin/AdminBookings"));

const AdminHeroSlides = lazyRetry(() => import("./pages/admin/AdminHeroSlides"));

const AdminFacilities = lazyRetry(() => import("./pages/admin/AdminFacilities"));

const AdminSettings = lazyRetry(() => import("./pages/admin/AdminSettings"));

const AdminSeoSettings = lazyRetry(() => import("./pages/admin/AdminSeoSettings"));

const AdminSeoAgent = lazyRetry(() => import("./pages/admin/AdminSeoAgent"));

const AdminMediaLibrary = lazyRetry(() => import("./pages/admin/AdminMediaLibrary"));

const AdminCompetitorAnalysis = lazyRetry(() => import("./pages/admin/AdminCompetitorAnalysis"));

const AdminLayout = lazyRetry(() =>
  import("./components/admin/AdminLayout").then((m) => ({
    default: m.AdminLayout,
  })),
);

/* ------------------------------------------------ */
/* Utility */
/* ------------------------------------------------ */

const NotFound = lazyRetry(() => import("./pages/NotFound"));

/* ------------------------------------------------ */
/* Query Client */
/* ------------------------------------------------ */

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

/* ------------------------------------------------ */
/* Fallback */
/* ------------------------------------------------ */

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
);

/* ------------------------------------------------ */
/* App */
/* ------------------------------------------------ */

const App = () => {
  return (
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
                        {/* ------------------------------------------------ */}
                        {/* Public */}
                        {/* ------------------------------------------------ */}

                        <Route path="/" element={<Index />} />

                        <Route path="/auth" element={<Auth />} />

                        <Route path="/bookings" element={<Bookings />} />

                        <Route path="/rooms/:roomSlug" element={<RoomDetail />} />

                        <Route path="/explore-semarang" element={<ExploreSemarang />} />

                        <Route path="/explore-semarang/:slug" element={<AttractionDetail />} />

                        <Route path="/events/:slug" element={<EventDetail />} />

                        <Route path="/chat" element={<Chat />} />

                        <Route path="/member" element={<MemberDashboard />} />

                        {/* ------------------------------------------------ */}
                        {/* Mobile */}
                        {/* ------------------------------------------------ */}

                        <Route path="/app" element={<MobileAdminApp />} />

                        <Route path="/app/login" element={<MobileLoginPage />} />

                        {/* ------------------------------------------------ */}
                        {/* Manager */}
                        {/* ------------------------------------------------ */}

                        <Route path="/manager/view-calendar/:token" element={<ManagerCalendar />} />

                        {/* ------------------------------------------------ */}
                        {/* SEO PROGRAMMATIC ROUTES */}
                        {/* ------------------------------------------------ */}

                        <Route path="/location/:slug" element={<AreaLandingPage />} />

                        <Route path="/penginapan/:slug" element={<AreaLandingPage />} />

                        <Route path="/guest-house/:slug" element={<AreaLandingPage />} />

                        <Route path="/homestay/:slug" element={<AreaLandingPage />} />

                        {/* ------------------------------------------------ */}
                        {/* Admin */}
                        {/* ------------------------------------------------ */}

                        <Route path="/admin" element={<AdminLogin />} />

                        <Route
                          path="/admin/dashboard"
                          element={
                            <AdminLayout>
                              <AdminDashboard />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/booking-calendar"
                          element={
                            <AdminLayout>
                              <AdminBookingCalendarPage />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/rooms"
                          element={
                            <AdminLayout>
                              <AdminRooms />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/bookings"
                          element={
                            <AdminLayout>
                              <AdminBookings />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/hero-slides"
                          element={
                            <AdminLayout>
                              <AdminHeroSlides />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/facilities"
                          element={
                            <AdminLayout>
                              <AdminFacilities />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/settings"
                          element={
                            <AdminLayout>
                              <AdminSettings />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/seo-settings"
                          element={
                            <AdminLayout>
                              <AdminSeoSettings />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/seo-agent"
                          element={
                            <AdminLayout>
                              <AdminSeoAgent />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/media-library"
                          element={
                            <AdminLayout>
                              <AdminMediaLibrary />
                            </AdminLayout>
                          }
                        />

                        <Route
                          path="/admin/competitor-analysis"
                          element={
                            <AdminLayout>
                              <AdminCompetitorAnalysis />
                            </AdminLayout>
                          }
                        />

                        {/* ------------------------------------------------ */}
                        {/* Editor */}
                        {/* ------------------------------------------------ */}

                        <Route path="/editor" element={<PageEditorPage />} />

                        {/* ------------------------------------------------ */}
                        {/* Dynamic Landing Pages */}
                        {/* ------------------------------------------------ */}

                        <Route path="/:slug" element={<LandingPage />} />

                        {/* ------------------------------------------------ */}
                        {/* 404 */}
                        {/* ------------------------------------------------ */}

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
};

export default App;
