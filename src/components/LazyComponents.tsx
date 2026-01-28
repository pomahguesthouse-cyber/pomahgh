import { lazy, Suspense, ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy components with named exports
export const LazyGoogleRating = lazy(() => 
  import("@/components/GoogleRating").then(m => ({ default: m.GoogleRating }))
);
export const LazyAmenities = lazy(() => 
  import("@/components/Amenities").then(m => ({ default: m.Amenities }))
);
export const LazyLocation = lazy(() => 
  import("@/components/Location").then(m => ({ default: m.Location }))
);
export const LazyNewsEvents = lazy(() => 
  import("@/components/NewsEvents").then(m => ({ default: m.NewsEvents }))
);
export const LazyRooms = lazy(() => 
  import("@/components/Rooms/Rooms").then(m => ({ default: m.Rooms }))
);
export const LazyChatbotWidget = lazy(() => 
  import("@/components/ChatbotWidget")
);

// Section skeleton for lazy loading - minimal for fast paint
const SectionSkeleton = ({ height = "h-96" }: { height?: string }) => (
  <div className={`w-full ${height} flex items-center justify-center`}>
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Wrapper for lazy sections
interface LazySectionProps {
  children: React.ReactNode;
  fallbackHeight?: string;
}

export const LazySection = ({ children, fallbackHeight = "h-96" }: LazySectionProps) => (
  <Suspense fallback={<SectionSkeleton height={fallbackHeight} />}>
    {children}
  </Suspense>
);

// Chatbot skeleton (smaller)
const ChatbotSkeleton = () => null; // Don't show anything for chatbot loading

export const LazyChatbotSection = () => (
  <Suspense fallback={<ChatbotSkeleton />}>
    <LazyChatbotWidget />
  </Suspense>
);
