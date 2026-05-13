import { Routes, Route } from "react-router-dom";

import { AdminLayout }
from "@/components/admin/AdminLayout";

import AdminLogin
from "@/pages/admin/AdminLogin";

import AdminDashboard
from "@/pages/admin/AdminDashboard";

import AdminBookings
from "@/pages/admin/AdminBookings";

import AdminSeoAgent
from "@/pages/admin/AdminSeoAgent";

export default function AdminRoutes() {
  return (
    <Routes>

      <Route
        path="/"
        element={<AdminLogin />}
      />

      <Route
        path="/dashboard"
        element={
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        }
      />

      <Route
        path="/bookings"
        element={
          <AdminLayout>
            <AdminBookings />
          </AdminLayout>
        }
      />

      <Route
        path="/seo-agent"
        element={
          <AdminLayout>
            <AdminSeoAgent />
          </AdminLayout>
        }
      />

    </Routes>
  );
}