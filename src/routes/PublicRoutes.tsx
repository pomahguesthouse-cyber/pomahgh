import { Routes, Route, Navigate } from "react-router-dom";

import Index from "@/pages/Index";
import RoomDetail from "@/pages/RoomDetail";
import AreaLandingPage from "@/pages/AreaLandingPage";
import LandingPage from "@/pages/LandingPage";

import {
  buildAdminUrl,
} from "@/lib/domain";

export default function PublicRoutes() {
  return (
    <Routes>

      <Route path="/" element={<Index />} />

      <Route
        path="/rooms/:roomSlug"
        element={<RoomDetail />}
      />

      <Route
        path="/location/:slug"
        element={<AreaLandingPage />}
      />

      <Route
        path="/penginapan/:slug"
        element={<AreaLandingPage />}
      />

      <Route
        path="/guest-house/:slug"
        element={<AreaLandingPage />}
      />

      <Route
        path="/homestay/:slug"
        element={<AreaLandingPage />}
      />

      {/* Redirect Admin */}
      <Route
        path="/dashboard"
        element={
          <Navigate
            to={buildAdminUrl("/dashboard")}
            replace
          />
        }
      />

      {/* Landing Pages */}
      <Route
        path="/:slug"
        element={<LandingPage />}
      />

    </Routes>
  );
}