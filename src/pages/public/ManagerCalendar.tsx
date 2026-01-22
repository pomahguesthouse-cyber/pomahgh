import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { startOfDay, format } from "date-fns";
import { id } from "date-fns/locale";
import { RefreshCw, Calendar, AlertCircle, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagerCalendarData } from "@/hooks/useManagerCalendarData";
import { ManagerCalendarView } from "@/components/manager-calendar/ManagerCalendarView";

const ManagerCalendar: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  const { data, isLoading, error, refetch, isFetching } = useManagerCalendarData({
    token: token || "",
    startDate: startDateStr,
    endDate: endDateStr,
    enabled: !!token,
  });

  const handleRefresh = () => {
    refetch();
  };

  // Error states
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Token Tidak Valid</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  URL yang Anda akses tidak memiliki token akses yang valid.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = error.message || "Terjadi kesalahan";
    const isAuthError = errorMessage.includes("Invalid") || errorMessage.includes("disabled") || errorMessage.includes("expired");
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                {isAuthError ? (
                  <Lock className="h-6 w-6 text-destructive" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {isAuthError ? "Akses Ditolak" : "Terjadi Kesalahan"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage.includes("expired") && "Token akses Anda telah kadaluarsa."}
                  {errorMessage.includes("disabled") && "Token akses Anda telah dinonaktifkan."}
                  {errorMessage.includes("Invalid") && "Token akses tidak ditemukan."}
                  {!isAuthError && errorMessage}
                </p>
              </div>
              {!isAuthError && (
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Coba Lagi
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Booking Calendar</h1>
              {data?.tokenName && (
                <p className="text-xs text-muted-foreground">{data.tokenName}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 p-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : data ? (
          <ManagerCalendarView
            rooms={data.rooms}
            bookings={data.bookings}
            unavailableDates={data.unavailableDates}
            startDate={startDate}
            onStartDateChange={setStartDate}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Update terakhir: {format(new Date(), "dd MMM yyyy, HH:mm", { locale: id })}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default ManagerCalendar;
