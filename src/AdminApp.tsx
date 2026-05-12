import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { lazy, Suspense, Component } from "react";
import type { ReactNode } from "react";

import { getAdminBasename } from "@/lib/domain";

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
            <a href="/" className="text-blue-600 underline text-sm">Reload</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Admin pages */
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
const AdminSeoAgent = lazyRetry(() => import("./pages/admin/AdminSeoAgent"));
const AdminSocialMediaAgent = lazyRetry(() => import("./pages/admin/AdminSocialMediaAgent"));
const AdminMediaLibrary = lazyRetry(() => import("./pages/admin/AdminMediaLibrary"));
const AdminRoomAddons = lazyRetry(() => import("./pages/admin/AdminRoomAddons"));
const AdminPromotions = lazyRetry(() => import("./pages/admin/AdminPromotions"));
const AdminCityAttractions = lazyRetry(() => import("./pages/admin/AdminCityAttractions"));
const AdminExploreHeroSlides = lazyRetry(() => import("./pages/admin/AdminExploreHeroSlides"));
const AdminCompetitorAnalysis = lazyRetry(() => import("./pages/admin/AdminCompetitorAnalysis"));
const AdminChat = lazyRetry(() => import("./pages/admin/AdminChat"));
const AdminCityEvents = lazyRetry(() => import("./pages/admin/AdminCityEvents"));
const AdminLandingPages = lazyRetry(() => import("./pages/admin/AdminLandingPages"));
const AdminMultiAgentDashboard = lazyRetry(() => import("./pages/admin/AdminMultiAgentDashboard"));
const PageEditorPage = lazyRetry(() => import("./pages/PageEditorPage"));
const MobileAdminApp = lazyRetry(() => import("./pages/app/MobileAdminApp"));
const MobileLoginPage = lazyRetry(() => import("./pages/app/MobileLoginPage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const AdminLayout = lazyRetry(() =>
  import("./components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const Wrap = ({ children }: { children: ReactNode }) => <AdminLayout>{children}</AdminLayout>;

/**
 * AdminApp — renders only admin routes. Mounted when host = admin.pomahguesthouse.com.
 *
 * In dev / preview, admin routes are mounted at "/admin" basename so developers
 * can visit `localhost:8080/admin/dashboard` and the router internally treats it
 * as `/dashboard`.
 *
 * SEO: noindex / nofollow on the entire admin app.
 */
export default function AdminApp() {
  const basename = getAdminBasename();

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
        <title>Admin · Pomah Guesthouse</title>
      </Helmet>

      <BrowserRouter basename={basename}>
        <AppErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Login (entry point of the admin app) */}
              <Route path="/" element={<AdminLogin />} />

              {/* Dashboard & operations */}
              <Route path="/dashboard" element={<Wrap><AdminDashboard /></Wrap>} />
              <Route path="/booking-calendar" element={<Wrap><AdminBookingCalendarPage /></Wrap>} />
              <Route path="/rooms" element={<Wrap><AdminRooms /></Wrap>} />
              <Route path="/bookings" element={<Wrap><AdminBookings /></Wrap>} />
              <Route path="/invoice-management" element={<Wrap><AdminInvoiceManagement /></Wrap>} />

              {/* Content */}
              <Route path="/hero-slides" element={<Wrap><AdminHeroSlides /></Wrap>} />
              <Route path="/facility-hero-slides" element={<Wrap><AdminFacilityHeroSlides /></Wrap>} />
              <Route path="/explore-hero-slides" element={<Wrap><AdminExploreHeroSlides /></Wrap>} />
              <Route path="/facilities" element={<Wrap><AdminFacilities /></Wrap>} />
              <Route path="/nearby-locations" element={<Wrap><AdminNearbyLocations /></Wrap>} />
              <Route path="/city-attractions" element={<Wrap><AdminCityAttractions /></Wrap>} />
              <Route path="/city-events" element={<Wrap><AdminCityEvents /></Wrap>} />
              <Route path="/media-library" element={<Wrap><AdminMediaLibrary /></Wrap>} />
              <Route path="/page-editor" element={<Wrap><AdminLandingPages /></Wrap>} />

              {/* Property */}
              <Route path="/room-features" element={<Wrap><AdminRoomFeatures /></Wrap>} />
              <Route path="/room-addons" element={<Wrap><AdminRoomAddons /></Wrap>} />
              <Route path="/promotions" element={<Wrap><AdminPromotions /></Wrap>} />

              {/* Chatbots & agents */}
              <Route path="/chatbot" element={<Wrap><AdminGuestChatbot /></Wrap>} />
              <Route path="/chatbot/guest" element={<Wrap><AdminGuestChatbot /></Wrap>} />
              <Route path="/chatbot/admin" element={<Wrap><AdminAdminChatbot /></Wrap>} />
              <Route path="/chat" element={<Wrap><AdminChat /></Wrap>} />
              <Route path="/multi-agent" element={<Wrap><AdminMultiAgentDashboard /></Wrap>} />

              {/* Operations */}
              <Route path="/bank-accounts" element={<Wrap><AdminBankAccounts /></Wrap>} />
              <Route path="/competitor-analysis" element={<Wrap><AdminCompetitorAnalysis /></Wrap>} />

              {/* System & SEO */}
              <Route path="/seo-settings" element={<Wrap><AdminSeoSettings /></Wrap>} />
              <Route path="/seo-agent" element={<Wrap><AdminSeoAgent /></Wrap>} />
              <Route path="/social-media-agent" element={<Wrap><AdminSocialMediaAgent /></Wrap>} />
              <Route path="/settings" element={<Wrap><AdminSettings /></Wrap>} />

              {/* Standalone editor */}
              <Route path="/editor" element={<PageEditorPage />} />

              {/* Mobile admin */}
              <Route path="/app" element={<MobileAdminApp />} />
              <Route path="/app/login" element={<MobileLoginPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </BrowserRouter>
    </>
  );
}
