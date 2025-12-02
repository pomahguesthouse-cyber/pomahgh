import { useState, useMemo } from "react";
import { addDays, eachDayOfInterval, format } from "date-fns";
import { getWIBToday } from "@/utils/wibTimezone";
import { ViewRange } from "../types";

export const useCalendarState = () => {
  const [currentDate, setCurrentDate] = useState(getWIBToday());
  const [viewRange, setViewRange] = useState<ViewRange>(30);

  // Calculate date range based on view selection
  const dates = useMemo(() => {
    const startDate = addDays(currentDate, -1);
    const endDate = addDays(currentDate, viewRange - 1);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate, viewRange]);

  // Calculate cell width based on view range
  const cellWidth = useMemo(() => {
    switch (viewRange) {
      case 7: return 100;
      case 14: return 80;
      case 30:
      default: return 60;
    }
  }, [viewRange]);

  // Generate month/year options for dropdown
  const monthYearOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        options.push({
          value: format(date, "yyyy-MM"),
          label: format(date, "MMMM yyyy"),
        });
      }
    }
    return options;
  }, []);

  const currentMonthYear = format(currentDate, "yyyy-MM");

  const goToPrev = () => setCurrentDate(addDays(currentDate, -viewRange));
  const goToNext = () => setCurrentDate(addDays(currentDate, viewRange));
  const goToToday = () => setCurrentDate(getWIBToday());
  
  const handleMonthYearChange = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleViewRangeChange = (range: ViewRange) => {
    setViewRange(range);
    setCurrentDate(getWIBToday());
  };

  return {
    currentDate,
    viewRange,
    dates,
    cellWidth,
    monthYearOptions,
    currentMonthYear,
    goToPrev,
    goToNext,
    goToToday,
    handleMonthYearChange,
    handleViewRangeChange,
  };
};
