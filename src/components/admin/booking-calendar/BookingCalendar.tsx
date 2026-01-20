import React, { useState } from "react";
import { format, addDays, startOfDay, isSameDay, isWeekend, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Ban, Download } from "lucide-react";
import { cn } from "@/lib/utils"; // Pastikan Anda punya utility ini atau ganti dengan clsx/tailwind-merge manual

// --- MOCK DATA (Berdasarkan Gambar) ---
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
  {
    id: "b1",
    roomId: "203",
    guestName: "Rifki...",
    checkIn: "2026-01-23",
    nights: 1,
    status: "confirmed", // Green
  },
  {
    id: "b2",
    roomId: "204",
    guestName: "Dzak...",
    checkIn: "2026-01-23",
    nights: 1,
    status: "confirmed",
  },
  {
    id: "b3",
    roomId: "205",
    guestName: "Dzak...",
    checkIn: "2026-01-23",
    nights: 1,
    status: "confirmed",
  },
  {
    id: "b4",
    roomId: "206",
    guestName: "Bening",
    checkIn: "2026-01-19",
    nights: 21, // Long bar
    status: "in-house", // Blue
  },
  {
    id: "b5",
    roomId: "FS100",
    guestName: "Muha...",
    checkIn: "2026-01-23",
    nights: 1,
    status: "confirmed",
  },
  {
    id: "b6",
    roomId: "FS222",
    guestName: "Syifa...",
    checkIn: "2026-01-23",
    nights: 1,
    status: "late-checkout", // Red
    tag: "LCO",
  },
  {
    id: "b7",
    roomId: "207",
    guestName: "Hai...",
    checkIn: "2026-01-19",
    nights: 1,
    status: "checked-out", // Grey
  },
  {
    id: "b8",
    roomId: "207",
    guestName: "Dede...",
    checkIn: "2026-01-23",
    nights: 1,
    status: "confirmed",
  },
];

const BLOCKED_DATES = [
  { roomId: "GD001", date: "2026-01-22" },
  { roomId: "GD001", date: "2026-01-23" },
];

// --- COMPONENT ---

export const BookingCalendarDesign = () => {
  const [startDate, setStartDate] = useState(parseISO("2026-01-19")); // Set start date sesuai gambar
  const [viewRange, setViewRange] = useState(14); // 7D, 14D, 30D

  // Generate Array of Dates
  const dates = Array.from({ length: viewRange }).map((_, i) => addDays(startDate, i));

  const cellWidth = 100; // Pixel width per cell

  // Helper colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500 hover:bg-emerald-600 border-emerald-600";
      case "in-house":
        return "bg-blue-500 hover:bg-blue-600 border-blue-600";
      case "late-checkout":
        return "bg-rose-500 hover:bg-rose-600 border-rose-600";
      case "checked-out":
        return "bg-slate-500 hover:bg-slate-600 border-slate-600";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-sm text-slate-700">
      {/* --- HEADER CONTROLS --- */}
      <div className="p-4 bg-white border-b flex flex-wrap gap-4 items-center justify-between shadow-sm z-20 relative">
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="relative">
            <select className="pl-3 pr-8 py-2 border rounded-md bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors">
              <option>January 2026</option>
              <option>February 2026</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          {/* Range Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-md border">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setViewRange(days)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-semibold transition-all",
                  viewRange === days ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900",
                )}
              >
                {days}D
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStartDate(addDays(startDate, -1))}
              className="p-2 hover:bg-gray-100 rounded-md border text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStartDate(new Date())}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md text-xs transition-colors uppercase tracking-wider"
            >
              Today
            </button>
            <button
              onClick={() => setStartDate(addDays(startDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-md border text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* --- CALENDAR GRID --- */}
      <div className="flex-1 overflow-auto relative">
        <div className="inline-block min-w-full relative">
          {/* 1. DATE HEADER ROW */}
          <div className="sticky top-0 z-10 flex border-b bg-white shadow-sm">
            {/* Corner Cell */}
            <div className="sticky left-0 z-20 w-32 min-w-[128px] bg-blue-500 text-white font-bold p-2 flex flex-col justify-center items-center border-r border-b border-blue-600 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.1)]">
              <span className="text-xs opacity-90">Hari</span>
              <span className="text-sm">Tanggal</span>
            </div>

            {/* Dates Loop */}
            {dates.map((date, index) => {
              const isToday = isSameDay(date, new Date()); // Mocking today as Jan 20 based on image
              const isWeekendDay = isWeekend(date);

              return (
                <div
                  key={index}
                  className="flex-shrink-0 border-r border-gray-100 bg-white flex flex-col items-center justify-center h-14"
                  style={{ width: cellWidth }}
                >
                  {isToday && (
                    <div className="absolute top-0 w-full bg-blue-500 text-[10px] text-white text-center font-bold py-0.5 z-10">
                      TODAY
                    </div>
                  )}
                  <span
                    className={cn(
                      "text-[10px] uppercase font-semibold mb-0.5",
                      isWeekendDay ? "text-red-500" : "text-gray-500",
                    )}
                  >
                    {format(date, "EEE", { locale: id })}
                  </span>
                  <span
                    className={cn("text-lg font-bold leading-none", isWeekendDay ? "text-red-500" : "text-slate-800")}
                  >
                    {format(date, "d")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 2. ROOM ROWS */}
          <div className="relative">
            {ROOM_GROUPS.map((group) => (
              <React.Fragment key={group.name}>
                {/* Group Header */}
                <div className="sticky left-0 z-10 w-full bg-[#EAEAEA] border-b border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {group.name}
                </div>
                {/* Filler for group row to stretch full width */}
                <div className="absolute left-0 w-full h-8 bg-[#EAEAEA] -z-10" />

                {/* Rooms in Group */}
                {group.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex relative h-16 border-b border-gray-100 group hover:bg-slate-50 transition-colors"
                  >
                    {/* Sticky Room Number Column */}
                    <div className="sticky left-0 z-10 w-32 min-w-[128px] bg-white group-hover:bg-slate-50 border-r border-gray-200 p-3 flex items-center text-sm font-medium text-slate-700 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {room.name}
                    </div>

                    {/* Grid Cells & Events Container */}
                    <div className="flex relative">
                      {/* Empty Grid Cells */}
                      {dates.map((date, i) => {
                        // Check if blocked
                        const isBlocked = BLOCKED_DATES.some(
                          (b) => b.roomId === room.id && isSameDay(parseISO(b.date), date),
                        );

                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex-shrink-0 border-r border-gray-100 h-full relative",
                              isBlocked &&
                                "bg-[linear-gradient(45deg,#f3f4f6_25%,#e5e7eb_25%,#e5e7eb_50%,#f3f4f6_50%,#f3f4f6_75%,#e5e7eb_75%,#e5e7eb_100%)] bg-[length:10px_10px]",
                            )}
                            style={{ width: cellWidth }}
                            // onClick handler here
                          >
                            {isBlocked && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                                <Ban className="w-4 h-4 text-gray-500 mb-0.5" />
                                <span className="text-[8px] font-bold text-gray-500">BLOCKED</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Render Bookings (Absolute Positioned) */}
                      {BOOKINGS.filter((b) => b.roomId === room.id).map((booking) => {
                        const startDateObj = parseISO(booking.checkIn);

                        // Cek apakah booking ada dalam range view
                        const viewStart = dates[0];
                        const viewEnd = dates[dates.length - 1];

                        // Logika simple overlap
                        // Note: Production app needs robust collision detection
                        const diffDays = differenceInDays(startDateObj, viewStart);

                        // Jika booking mulai sebelum view range, kita harus potong (clamping logic)
                        // Untuk simplicity demo ini, kita render berdasarkan start date relatif terhadap view start
                        if (diffDays + booking.nights < 0) return null; // Booking ends before view starts

                        const leftPos = diffDays * cellWidth;
                        const width = booking.nights * cellWidth;

                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              "absolute top-1 bottom-1 m-1 rounded-md shadow-sm border text-white overflow-hidden cursor-pointer hover:brightness-110 transition-all z-0",
                              getStatusColor(booking.status),
                            )}
                            style={{
                              left: `${leftPos}px`,
                              width: `${width - 8}px`, // -8 for margin
                            }}
                          >
                            {booking.tag && (
                              <span className="absolute top-0 right-0 bg-red-600 text-[8px] px-1 font-bold rounded-bl-sm">
                                {booking.tag}
                              </span>
                            )}

                            <div className="px-2 py-1 h-full flex flex-col justify-center">
                              <div className="font-bold text-xs truncate leading-tight">{booking.guestName}</div>
                              <div className="text-[9px] opacity-90 truncate font-medium">
                                {booking.nights}M • {booking.status.toUpperCase()}
                              </div>
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

export default BookingCalendarDesign;
