/**
 * Admin Settings Module
 * Settings management components and hooks
 */

// Components
export { SeoPreview } from "@/components/admin/SeoPreview";

// Hooks
export { useHotelSettings } from "@/hooks/useHotelSettings";
export { useSeoSettings } from "@/hooks/useSeoSettings";
export { useBankAccounts } from "@/hooks/useBankAccounts";
export { useFacilities } from "@/hooks/useFacilities";
export { useHeroSlides } from "@/hooks/useHeroSlides";
export { useFacilityHeroSlides } from "@/hooks/useFacilityHeroSlides";

// Types
export type {
  HotelSettings,
  SeoSettings,
  BankAccount,
} from "@/types/admin.types";
