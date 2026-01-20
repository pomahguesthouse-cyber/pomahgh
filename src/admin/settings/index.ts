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
export { useHotelSettings } from "@/hooks/shared/useHotelSettings";
export { useSeoSettings } from "@/hooks/seo/useSeoSettings";
export { useBankAccounts } from "@/hooks/shared/useBankAccounts";
export { useAvailabilitySync } from "@/hooks/useAvailabilitySync";
export { useTestChannelManager } from "@/hooks/shared/useTestChannelManager";
export { useFacilities } from "@/hooks/shared/useFacilities";
export { useHeroSlides } from "@/hooks/shared/useHeroSlides";
export { useFacilityHeroSlides } from "@/hooks/shared/useFacilityHeroSlides";

// Types
export type {
  HotelSettings,
  SeoSettings,
  BankAccount,
  ChannelManager,
  InvoiceTemplate,
} from "@/types/admin.types";












