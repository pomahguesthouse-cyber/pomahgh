/**
 * Competitor Analysis Feature Module
 * Exports all competitor-related components and hooks
 */

// Components
export { AnalysisDashboardTab } from "@/components/admin/competitor/AnalysisDashboardTab";
export { CompetitorHotelsTab } from "@/components/admin/competitor/CompetitorHotelsTab";
export { CompetitorRoomsTab } from "@/components/admin/competitor/CompetitorRoomsTab";
export { PriceSurveyTab } from "@/components/admin/competitor/PriceSurveyTab";

// Hooks
export { useCompetitorHotels } from "@/hooks/useCompetitorHotels";
export { useCompetitorRooms } from "@/hooks/useCompetitorRooms";
export { useCompetitorPriceSurveys } from "@/hooks/useCompetitorPriceSurveys";
export { usePriceAnalysis } from "@/hooks/usePriceAnalysis";
export { usePriceScraping } from "@/hooks/usePriceScraping";
export { usePricingAdjustmentLogs } from "@/hooks/usePricingAdjustmentLogs";
export { usePriceChangeNotifications } from "@/hooks/usePriceChangeNotifications";

// Types
export type {
  CompetitorHotel,
  CompetitorRoom,
  CompetitorPriceSurvey,
} from "@/types/admin.types";
