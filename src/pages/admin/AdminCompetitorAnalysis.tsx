import { lazy, Suspense } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorHotelsTab } from "@/components/admin/competitor/CompetitorHotelsTab";
import { CompetitorRoomsTab } from "@/components/admin/competitor/CompetitorRoomsTab";
import { PriceSurveyTab } from "@/components/admin/competitor/PriceSurveyTab";
import { Building2, BedDouble, ClipboardList, BarChart3 } from "lucide-react";

// Lazy-load: dashboard tab pulls recharts. Other tabs (Survey/Hotels/Rooms)
// stay chart-free, so opening the page no longer downloads recharts upfront.
const AnalysisDashboardTab = lazy(() =>
  import("@/components/admin/competitor/AnalysisDashboardTab").then(m => ({
    default: m.AnalysisDashboardTab,
  })),
);

const AdminCompetitorAnalysis = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analisis Harga Kompetitor</h1>
          <p className="text-muted-foreground mt-1">
            Kelola hotel kompetitor, input survey harga harian, dan lihat analisis untuk penetapan harga dinamis
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="survey" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Survey Harga</span>
            </TabsTrigger>
            <TabsTrigger value="hotels" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Hotel</span>
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <BedDouble className="h-4 w-4" />
              <span className="hidden sm:inline">Kamar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Suspense fallback={<div className="h-96 rounded-md border bg-muted/30 animate-pulse" />}>
              <AnalysisDashboardTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="survey">
            <PriceSurveyTab />
          </TabsContent>

          <TabsContent value="hotels">
            <CompetitorHotelsTab />
          </TabsContent>

          <TabsContent value="rooms">
            <CompetitorRoomsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminCompetitorAnalysis;