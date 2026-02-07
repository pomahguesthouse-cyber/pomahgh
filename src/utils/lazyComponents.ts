import { lazy } from 'react';

// Admin pages - load on demand
export const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
export const AdminRooms = lazy(() => import('@/pages/admin/AdminRooms'));
export const AdminBookings = lazy(() => import('@/pages/admin/AdminBookings'));
export const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
export const AdminChatbot = lazy(() => import('@/pages/admin/AdminChatbot'));

// Feature pages
export const RoomDetail = lazy(() => import('@/pages/RoomDetail'));
export const BookingDialog = lazy(() => import('@/components/BookingDialog'));
export const PageEditor = lazy(() => import('@/pages/PageEditorPage'));

// Heavy components
export const VirtualTourViewer = lazy(() => import('@/components/VirtualTourViewer'));
export const BookingCalendar = lazy(() => import('@/components/admin/BookingCalendar'));
export const MediaLibrary = lazy(() => import('@/pages/admin/AdminMediaLibrary'));