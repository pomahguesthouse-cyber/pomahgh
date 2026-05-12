import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, Component } from "react";
import type { ReactNode } from "react";

import { SearchDatesProvider } from "@/contexts/SearchDatesContext";
import { PublicOverridesProvider } from "@/contexts/PublicOverridesContext";
import { GlobalSEO } from "@/components/GlobalSEO";

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
const ExploreSemarang = lazyRetry(() => import("./pages/ExploreSemarang"));
const AttractionDetail = lazyRetry(() => import("./pages/AttractionDetail"));
const EventDetail = lazyRetry(() => import("./pages/EventDetail"));
const Chat = lazyRetry(() => import("./pages/Chat"));
const LandingPage = lazyRetry(() => import("./pages/LandingPage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const AreaLandingPage = lazyRetry(() => import("./pages/AreaLandingPage"));
const MemberDashboard = lazyRetry(() => import("./pages/user/MemberDashboard"));
const ManagerCalendar = lazyRetry(() => import("./pages/public/ManagerCalendar"));

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

/**
 * PublicApp — renders only public-facing routes.
 * Mounted when current host = pomahguesthouse.com (or dev fallback).
 */
export default function PublicApp() {
  return (
    <>
      <GlobalSEO />
      <SearchDatesProvider>
        <PublicOverridesProvider>
          <BrowserRouter>
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

                  {/* Manager calendar via magic-link token */}
                  <Route path="/manager/view-calendar/:token" element={<ManagerCalendar />} />

                  {/* SEO area landing pages */}
                  <Route path="/location" element={<Navigate to="/" replace />} />
                  <Route path="/location/:slug" element={<AreaLandingPage />} />
                  <Route path="/penginapan/:slug" element={<AreaLandingPage />} />
                  <Route path="/guest-house/:slug" element={<AreaLandingPage />} />
                  <Route path="/homestay/:slug" element={<AreaLandingPage />} />

                  {/* Dynamic CMS landing pages */}
                  <Route path="/:slug" element={<LandingPage />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppErrorBoundary>
          </BrowserRouter>
        </PublicOverridesProvider>
      </SearchDatesProvider>
    </>
  );
}
