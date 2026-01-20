import React, { useState } from "react";
import { format, addDays, isSameDay, isWeekend, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale"; // Locale Indonesia
import { ChevronLeft, ChevronRight, Ban, Download } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function for classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- MOCK DATA ---
const START_DATE_STR = "2026-01-19";

const ROOM_GROUPS = [
  {
    name: "DELUXE",
    rooms: [
      { id: "203", name: "203" },
      { id: "204", name: "204" },
      { id: "205", name: "205" },
      { id: "206", name: "206" },
    ],
  },
  {
    name: "FAMILY SUITE",
    rooms: [
      { id: "FS100", name: "FS100" },
      { id: "FS222", name: "FS222" },
    ],
  },
  {
    name: "GRAND DELUXE",
    rooms: [{ id: "GD001", name: "GD 001" }],
  },
  {
    name: "SINGLE",
    rooms: [{ id: "207", name: "207" }],
  },
];

const BOOKINGS = [
  { id: "b1", roomId: "203", guest: "Rif...", checkIn: "2026-01-23", nights: 1, status: "confirmed" },
  { id: "b2", roomId: "204", guest: "Dz...", checkIn: "2026-01-23", nights: 1, status: "confirmed" },
  { id: "b3", roomId: "205", guest: "Dz...", checkIn: "2026-01-23", nights: 1, status: "confirmed" },
  { id: "b4", roomId: "206", guest: "Bening", checkIn: "2026-01-19", nights: 21, status: "in-house" },
  { id: "b5", roomId: "FS100", guest: "Mu...", checkIn: "2026-01-23", nights: 1, status: "confirmed" },
  { id: "b6", roomId: "FS222", guest: "Syi...", checkIn: "2026-01-23", nights: 1, status: "problem", tag: "LCO" },
  { id: "b7", roomId: "207", guest: "Hai...", checkIn: "2026-01-19", nights: 1, status: "checked-out" },
  { id: "b8", roomId: "207", guest: "De...", checkIn: "2026-01-23", nights: 1, status: "confirmed" },
];

const BLOCKED_DATES = [
  { roomId: "GD001", date: "2026-01-22" },
  { roomId: "GD001", date: "2026-01-23" },
];

// --- COMPONENT UTAMA ---

// ✅ Pastikan menggunakan 'export const BookingCalendar' agar index.ts bisa membacanya
export const BookingCalendar = () => {
  const [startDate, setStartDate] = useState(parseISO(START_DATE_STR));
  const [viewRange, setViewRange] = useState(30);
  const cellWidth = 60;

  const dates = Array.from({ length: viewRange }).map((_, i) => addDays(startDate, i));

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500 border-emerald-600 hover:bg-emerald-400";
      case "in-house":
        return "bg-blue-500 border-blue-600 hover:bg-blue-400";
      case "problem":
        return "bg-rose-500 border-rose-600 hover:bg-rose-400";
      case "checked-out":
        return "bg-slate-500 border-slate-600 hover:bg-slate-400";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0] font-sans text-xs text-slate-700">
      {/* HEADER CONTROL */}
      <div className="bg-[#4F8495] p-3 flex flex-wrap gap-3 items-center justify-between shadow-md z-30 relative text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button className="flex items-center justify-between min-w-[140px] px-3 py-1.5 bg-gray-100 text-slate-800 rounded shadow-sm font-medium">
              <span>January 2026</span>
              <ChevronRight className="w-4 h-4 rotate-90 text-gray-400" />
            </button>
          </div>

          <div className="flex bg-white/20 p-0.5 rounded backdrop-blur-sm">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setViewRange(d)}
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-bold transition-all",
                  viewRange === d ? "bg-[#2D8EBA] text-white shadow-sm" : "text-white/80 hover:bg-white/10",
                )}
              >
                {d}D
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setStartDate(addDays(startDate, -1))}
              className="p-1.5 bg-[#2D8EBA] hover:bg-[#23789F] rounded text-white shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStartDate(parseISO("2026-01-20"))}
              className="px-3 py-1.5 bg-[#2D8EBA] hover:bg-[#23789F] text-white font-bold rounded text-[10px] shadow-sm uppercase tracking-wide"
            >
              Today
            </button>
            <button
              onClick={() => setStartDate(addDays(startDate, 1))}
              className="p-1.5 bg-[#2D8EBA] hover:bg-[#23789F] rounded text-white shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-1.5 bg-[#2D8EBA] hover:bg-[#23789F] text-white rounded text-[10px] font-bold shadow-sm transition-colors uppercase tracking-wide">
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>

      {/* CALENDAR SCROLL AREA */}
      <div className="flex-1 overflow-auto relative bg-white">
        <div className="inline-block min-w-full relative">
          {/* HEADER ROW (Sticky Top) */}
          <div className="sticky top-0 z-20 flex bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="sticky left-0 z-30 w-32 min-w-[128px] bg-[#2196F3] text-white p-2 flex flex-col justify-center items-center border-r border-blue-400 font-bold leading-tight">
              <span>Hari</span>
              <span>Tanggal</span>
            </div>

            {dates.map((date, index) => {
              const isToday = isSameDay(date, parseISO("2026-01-20"));
              const isWknd = isWeekend(date);

              return (
                <div
                  key={index}
                  className={cn(
                    "flex-shrink-0 border-r border-gray-200 bg-white flex flex-col items-center justify-center h-[50px] relative",
                    isWknd ? "bg-red-50/30" : "",
                  )}
                  style={{ width: cellWidth }}
                >
                  {isToday && (
                    <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 bg-[#2196F3] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-t-sm z-10 shadow-sm">
                      TODAY
                    </div>
                  )}
                  <span
                    className={cn("text-[10px] uppercase font-bold mb-0.5", isWknd ? "text-red-500" : "text-gray-500")}
                  >
                    {format(date, "EEE", { locale: id })}
                  </span>
                  <span className={cn("text-lg font-bold leading-none", isWknd ? "text-red-500" : "text-slate-800")}>
                    {format(date, "d")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ROOM ROWS */}
          <div className="relative pb-10">
            {ROOM_GROUPS.map((group) => (
              <React.Fragment key={group.name}>
                <div className="sticky left-0 z-10 w-full bg-[#E8E6E1] border-b border-gray-300 px-4 py-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                  {group.name}
                </div>
                <div className="absolute left-0 w-full h-[29px] bg-[#E8E6E1] -z-10 border-b border-gray-300" />

                {group.rooms.map((room) => (
                  <div key={room.id} className="flex relative h-[50px] border-b border-gray-200 group bg-white">
                    {/* Sticky Sidebar */}
                    <div className="sticky left-0 z-10 w-32 min-w-[128px] bg-white group-hover:bg-gray-50 border-r border-gray-200 px-4 flex items-center text-sm font-semibold text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {room.name}
                    </div>

                    {/* Grid Cells */}
                    <div className="flex relative">
                      {dates.map((date, i) => {
                        const isBlocked = BLOCKED_DATES.some(
                          (b) => b.roomId === room.id && isSameDay(parseISO(b.date), date),
                        );
                        const isToday = isSameDay(date, parseISO("2026-01-20"));

                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex-shrink-0 border-r border-gray-100 h-full relative",
                              isToday && "bg-blue-50/30",
                              isBlocked &&
                                "bg-[linear-gradient(45deg,#f3f4f6_25%,#e5e7eb_25%,#e5e7eb_50%,#f3f4f6_50%,#f3f4f6_75%,#e5e7eb_75%,#e5e7eb_100%)] bg-[length:8px_8px]",
                            )}
                            style={{ width: cellWidth }}
                          >
                            {isBlocked && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 select-none">
                                <Ban className="w-3 h-3 text-gray-500 mb-0.5" />
                                <span className="text-[7px] font-bold text-gray-500 leading-none">BLOCKED</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Bookings */}
                      {BOOKINGS.filter((b) => b.roomId === room.id).map((booking) => {
                        const startDateObj = parseISO(booking.checkIn);
                        const viewStart = dates[0];
                        const diffDays = differenceInDays(startDateObj, viewStart);

                        if (diffDays + booking.nights < 0) return null;

                        const leftPos = diffDays * cellWidth;
                        const width = booking.nights * cellWidth;

                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              "absolute top-1 bottom-1 m-1 rounded-[3px] shadow-sm border text-white overflow-hidden cursor-pointer flex flex-col justify-center px-1.5 z-10",
                              getStatusStyles(booking.status),
                            )}
                            style={{
                              left: `${leftPos}px`,
                              width: `${width - 8}px`,
                            }}
                          >
                            {booking.tag && (
                              <span className="absolute top-0 right-0 bg-[#B91C1C] text-[6px] px-1 py-[1px] font-bold rounded-bl-sm shadow-sm leading-none">
                                {booking.tag}
                              </span>
                            )}
                            <div className="font-bold text-[10px] truncate leading-tight drop-shadow-sm">
                              {booking.guest}
                            </div>
                            <div className="text-[8px] opacity-90 truncate font-medium leading-tight">
                              {booking.nights}M {booking.status === "in-house" ? "" : "CONFIRMED"}
                              {booking.status === "checked-out" && "CHECKED-OUT"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
