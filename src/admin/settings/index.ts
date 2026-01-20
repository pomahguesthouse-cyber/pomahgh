/**
 * Admin Settings Module
 * Settings management components and hooks
 */

// Components
export { ChannelManagerForm } from "@/components/admin/ChannelManagerForm";
export { DeleteChannelManagerDialog } from "@/components/admin/DeleteChannelManagerDialog";
export { TestChannelManagerButton } from "@/components/admin/TestChannelManagerButton";
export { SeoPreview } from "@/components/admin/SeoPreview";

// Hooks
export { useHotelSettings } from "@/hooks/useHotelSettings";
export { useSeoSettings } from "@/hooks/useSeoSettings";
export { useBankAccounts } from "@/hooks/useBankAccounts";
export { useAvailabilitySync } from "@/hooks/useAvailabilitySync";
export { useTestChannelManager } from "@/hooks/useTestChannelManager";
export { useFacilities } from "@/hooks/useFacilities";
export { useHeroSlides } from "@/hooks/useHeroSlides";
export { useFacilityHeroSlides } from "@/hooks/useFacilityHeroSlides";

// Types
export type {
  HotelSettings,
  SeoSettings,
  BankAccount,
  ChannelManager,
  InvoiceTemplate,
} from "@/types/admin.types";
