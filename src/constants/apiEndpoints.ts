/**
 * API Endpoints - Centralized API routes
 * Helps in managing API endpoints consistently
 */

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    VERIFY_EMAIL: "/auth/verify-email",
  },

  // Rooms
  ROOMS: {
    LIST: "/rooms",
    GET: (id: string) => `/rooms/${id}`,
    CREATE: "/rooms",
    UPDATE: (id: string) => `/rooms/${id}`,
    DELETE: (id: string) => `/rooms/${id}`,
    SEARCH: "/rooms/search",
    AVAILABILITY: "/rooms/availability",
  },

  // Bookings
  BOOKINGS: {
    LIST: "/bookings",
    GET: (id: string) => `/bookings/${id}`,
    CREATE: "/bookings",
    UPDATE: (id: string) => `/bookings/${id}`,
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
    CONFIRM: (id: string) => `/bookings/${id}/confirm`,
  },

  // Payments
  PAYMENTS: {
    CREATE: "/payments",
    VERIFY: "/payments/verify",
    LIST: "/payments",
    GET: (id: string) => `/payments/${id}`,
  },

  // Settings
  SETTINGS: {
    HOTEL: "/settings/hotel",
    SEO: "/settings/seo",
    GENERAL: "/settings/general",
  },

  // Admin
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    ANALYTICS: "/admin/analytics",
    REPORTS: "/admin/reports",
  },
} as const;

// Base URL - Set from environment variable
export const getApiBaseUrl = () => {
  return "https://api.example.com";
};
