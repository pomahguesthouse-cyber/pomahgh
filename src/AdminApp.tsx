import { Helmet } from "react-helmet-async";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  lazy,
  Suspense,
  Component,
} from "react";

import type { ReactNode } from "react";

import AdminGuard from "@/components/auth/AdminGuard";

/* ====================================================== */
/* Lazy Retry */
/* ====================================================== */

function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((err) => {
      const key = "admin_chunk_retry";

      const retryCount = Number(
        sessionStorage.getItem(key) || "0",
      );

      if (retryCount < 1) {
        sessionStorage.setItem(
          key,
          String(retryCount + 1),
        );

        window.location.reload();
      }

      throw err;
    }),
  );
}

/* ====================================================== */
/* Error Boundary */
/* ====================================================== */

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    children: ReactNode;
  }) {
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
            <p className="text-lg font-semibold mb-2">
              Terjadi kesalahan pada Admin App.
            </p>

            <button
              onClick={() =>
                window.location.reload()
              }
              className="text-blue-600 underline text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ====================================================== */
/* Lazy Pages */
/* ====================================================== */

/* Auth */
const AdminLogin = lazyRetry(
  () => import("./pages/admin/AdminLogin"),
);

/* Dashboard */
const AdminDashboard = lazyRetry(
  () =>
    import("./pages/admin/AdminDashboard"),
);

const AdminBookingCalendarPage =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminBookingCalendarPage"
      ),
  );

/* Property */
const AdminRooms = lazyRetry(
  () => import("./pages/admin/AdminRooms"),
);

const AdminRoomFeatures = lazyRetry(
  () =>
    import(
      "./pages/admin/AdminRoomFeatures"
    ),
);

const AdminRoomAddons = lazyRetry(
  () =>
    import(
      "./pages/admin/AdminRoomAddons"
    ),
);

/* Booking */
const AdminBookings = lazyRetry(
  () =>
    import("./pages/admin/AdminBookings"),
);

const AdminInvoiceManagement =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminInvoiceManagement"
      ),
  );

/* Content */
const AdminHeroSlides = lazyRetry(
  () =>
    import("./pages/admin/AdminHeroSlides"),
);

const AdminFacilityHeroSlides =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminFacilityHeroSlides"
      ),
  );

const AdminExploreHeroSlides =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminExploreHeroSlides"
      ),
  );

const AdminFacilities = lazyRetry(
  () =>
    import("./pages/admin/AdminFacilities"),
);

const AdminNearbyLocations =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminNearbyLocations"
      ),
  );

const AdminCityAttractions =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminCityAttractions"
      ),
  );

const AdminCityEvents = lazyRetry(
  () =>
    import("./pages/admin/AdminCityEvents"),
);

const AdminLandingPages = lazyRetry(
  () =>
    import(
      "./pages/admin/AdminLandingPages"
    ),
);

const AdminMediaLibrary = lazyRetry(
  () =>
    import("./pages/admin/AdminMediaLibrary"),
);

/* AI */
const AdminSeoAgent = lazyRetry(
  () =>
    import("./pages/admin/AdminSeoAgent"),
);

const AdminSocialMediaAgent =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminSocialMediaAgent"
      ),
  );

const AdminMultiAgentDashboard =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminMultiAgentDashboard"
      ),
  );

/* Chat */
const AdminGuestChatbot = lazyRetry(
  () =>
    import(
      "./pages/admin/AdminGuestChatbot"
    ),
);

const AdminAdminChatbot = lazyRetry(
  () =>
    import(
      "./pages/admin/AdminAdminChatbot"
    ),
);

const AdminChat = lazyRetry(
  () => import("./pages/admin/AdminChat"),
);

/* SEO */
const AdminSeoSettings = lazyRetry(
  () =>
    import("./pages/admin/AdminSeoSettings"),
);

/* Operations */
const AdminBankAccounts = lazyRetry(
  () =>
    import(
      "./pages/admin/AdminBankAccounts"
    ),
);

const AdminPromotions = lazyRetry(
  () =>
    import("./pages/admin/AdminPromotions"),
);

const AdminCompetitorAnalysis =
  lazyRetry(
    () =>
      import(
        "./pages/admin/AdminCompetitorAnalysis"
      ),
  );

/* System */
const AdminSettings = lazyRetry(
  () =>
    import("./pages/admin/AdminSettings"),
);

/* Editors */
const LandingEditorPage = lazyRetry(
  () => import("./pages/PageEditorPage"),
);

/* Mobile */
const MobileAdminApp = lazyRetry(
  () =>
    import("./pages/app/MobileAdminApp"),
);

const MobileLoginPage = lazyRetry(
  () =>
    import("./pages/app/MobileLoginPage"),
);

/* Utility */
const NotFound = lazyRetry(
  () => import("./pages/NotFound"),
);

/* ====================================================== */
/* Layout */
/* ====================================================== */

const AdminLayout = lazyRetry(() =>
  import(
    "./components/admin/AdminLayout"
  ).then((m) => ({
    default: m.AdminLayout,
  })),
);

/* ====================================================== */
/* Loading */
/* ====================================================== */

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

/* ====================================================== */
/* Protected Layout Wrapper */
/* ====================================================== */

const Protected = ({
  children,
}: {
  children: ReactNode;
}) => (
  <AdminGuard>
    <AdminLayout>
      {children}
    </AdminLayout>
  </AdminGuard>
);

/* ====================================================== */
/* Admin App */
/* ====================================================== */

export default function AdminApp() {
  return (
    <>
      {/* SEO Protection */}
      <Helmet>
        <meta
          name="robots"
          content="noindex,nofollow"
        />

        <meta
          name="googlebot"
          content="noindex,nofollow"
        />

        <title>
          Admin · Pomah Guesthouse
        </title>
      </Helmet>

      <AppErrorBoundary>
        <Suspense
          fallback={<RouteFallback />}
        >
          <Routes>

            {/* ================================= */}
            {/* Auth */}
            {/* ================================= */}

            <Route
              path="/"
              element={
                <Navigate
                  to="/login"
                  replace
                />
              }
            />

            <Route
              path="/login"
              element={<AdminLogin />}
            />

            {/* ================================= */}
            {/* Dashboard */}
            {/* ================================= */}

            <Route
              path="/dashboard"
              element={
                <Protected>
                  <AdminDashboard />
                </Protected>
              }
            />

            <Route
              path="/booking-calendar"
              element={
                <Protected>
                  <AdminBookingCalendarPage />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* Property */}
            {/* ================================= */}

            <Route
              path="/manage-rooms"
              element={
                <Protected>
                  <AdminRooms />
                </Protected>
              }
            />

            <Route
              path="/room-features"
              element={
                <Protected>
                  <AdminRoomFeatures />
                </Protected>
              }
            />

            <Route
              path="/room-addons"
              element={
                <Protected>
                  <AdminRoomAddons />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* Booking */}
            {/* ================================= */}

            <Route
              path="/manage-bookings"
              element={
                <Protected>
                  <AdminBookings />
                </Protected>
              }
            />

            <Route
              path="/invoice-management"
              element={
                <Protected>
                  <AdminInvoiceManagement />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* Content */}
            {/* ================================= */}

            <Route
              path="/hero-slides"
              element={
                <Protected>
                  <AdminHeroSlides />
                </Protected>
              }
            />

            <Route
              path="/facility-hero-slides"
              element={
                <Protected>
                  <AdminFacilityHeroSlides />
                </Protected>
              }
            />

            <Route
              path="/explore-hero-slides"
              element={
                <Protected>
                  <AdminExploreHeroSlides />
                </Protected>
              }
            />

            <Route
              path="/facilities"
              element={
                <Protected>
                  <AdminFacilities />
                </Protected>
              }
            />

            <Route
              path="/nearby-locations"
              element={
                <Protected>
                  <AdminNearbyLocations />
                </Protected>
              }
            />

            <Route
              path="/city-attractions"
              element={
                <Protected>
                  <AdminCityAttractions />
                </Protected>
              }
            />

            <Route
              path="/city-events"
              element={
                <Protected>
                  <AdminCityEvents />
                </Protected>
              }
            />

            <Route
              path="/media-library"
              element={
                <Protected>
                  <AdminMediaLibrary />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* AI */}
            {/* ================================= */}

            <Route
              path="/seo-agent"
              element={
                <Protected>
                  <AdminSeoAgent />
                </Protected>
              }
            />

            <Route
              path="/social-media-agent"
              element={
                <Protected>
                  <AdminSocialMediaAgent />
                </Protected>
              }
            />

            <Route
              path="/multi-agent"
              element={
                <Protected>
                  <AdminMultiAgentDashboard />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* Chat */}
            {/* ================================= */}

            <Route
              path="/chatbot"
              element={
                <Protected>
                  <AdminGuestChatbot />
                </Protected>
              }
            />

            <Route
              path="/chatbot/guest"
              element={
                <Protected>
                  <AdminGuestChatbot />
                </Protected>
              }
            />

            <Route
              path="/chatbot/admin"
              element={
                <Protected>
                  <AdminAdminChatbot />
                </Protected>
              }
            />

            <Route
              path="/chat"
              element={
                <Protected>
                  <AdminChat />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* SEO */}
            {/* ================================= */}

            <Route
              path="/seo-settings"
              element={
                <Protected>
                  <AdminSeoSettings />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* Operations */}
            {/* ================================= */}

            <Route
              path="/bank-accounts"
              element={
                <Protected>
                  <AdminBankAccounts />
                </Protected>
              }
            />

            <Route
              path="/promotions"
              element={
                <Protected>
                  <AdminPromotions />
                </Protected>
              }
            />

            <Route
              path="/competitor-analysis"
              element={
                <Protected>
                  <AdminCompetitorAnalysis />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* System */}
            {/* ================================= */}

            <Route
              path="/system-settings"
              element={
                <Protected>
                  <AdminSettings />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* Editors */}
            {/* ================================= */}

            <Route
              path="/landing-editor"
              element={
                <Protected>
                  <LandingEditorPage />
                </Protected>
              }
            />

            <Route
              path="/page-editor"
              element={
                <Protected>
                  <AdminLandingPages />
                </Protected>
              }
            />

            {/* ================================= */}
            {/* Mobile */}
            {/* ================================= */}

            <Route
              path="/mobile-dashboard"
              element={
                <Protected>
                  <MobileAdminApp />
                </Protected>
              }
            />

            <Route
              path="/mobile-login"
              element={<MobileLoginPage />}
            />

            {/* ================================= */}
            {/* Fallback */}
            {/* ================================= */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </>
  );
}