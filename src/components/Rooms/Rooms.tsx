// Updated Rooms component with improved spacing, layout, carousel behavior, and fixed shadow clipping

import { useState, useEffect } from "react";
import { useRooms } from "@/hooks/useRooms";
import { useRoomFeatures } from "@/hooks/useRoomFeatures";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { useRoomAvailabilityCheck } from "@/hooks/useRoomAvailabilityCheck";

import { BookingDialog } from "../BookingDialog";
import { VirtualTourViewer } from "../VirtualTourViewer";
import { RoomsHeader } from "./RoomsHeader";
import { RoomCarousel } from "./RoomCarousel";
import { RoomDots } from "./RoomDots";

import { calculateTotalNights } from "./utils/formatDateRange";
import type { Room } from "@/hooks/useRooms";
import type { CarouselApi } from "@/components/ui/carousel";

export const Rooms = () => {
  const { data: rooms, isLoading } = useRooms();
  const { data: roomFeatures } = useRoomFeatures();
  const { checkIn, checkOut } = useSearchDates();

  const { data: availability, isLoading: isCheckingAvailability } = useRoomAvailabilityCheck(checkIn, checkOut);

  // UI states
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const [tourRoom, setTourRoom] = useState<Room | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const totalNights = calculateTotalNights(checkIn, checkOut);

  // ----- Improved Carousel Listener (prevents unnecessary updates) -----
  useEffect(() => {
    if (!api) return;

    const update = () => setCurrent(api.selectedScrollSnap());
    update();

    api.on("select", update);
    return () => {
      api.off("select", update);
    };
  }, [api]);

  // ----- Handlers -----
  const handleBookRoom = (room: Room) => {
    setSelectedRoom(room);
    setBookingOpen(true);
  };

  const handleViewTour = (room: Room) => {
    setTourRoom(room);
    setTourOpen(true);
  };

  if (isLoading) {
    return (
      <section id="rooms" className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        id="rooms"
        className="
          py-20 px-4 bg-secondary/30
          overflow-visible
        "
      >
        <div
          className="
            container mx-auto
            overflow-visible
          "
        >
          {/* Header */}
          <RoomsHeader checkIn={checkIn} checkOut={checkOut} totalNights={totalNights} />

          {/* ----- Room Carousel Wrapper (Fix shadow clipping) ----- */}
          <div
            className="
              relative
              overflow-visible
              pt-4 pb-10
              -mx-2 sm:-mx-4
            "
          >
            <RoomCarousel
              rooms={rooms}
              availability={availability}
              isCheckingAvailability={isCheckingAvailability}
              roomFeatures={roomFeatures}
              onBookRoom={handleBookRoom}
              onViewTour={handleViewTour}
              setApi={setApi}
              checkIn={checkIn}
              checkOut={checkOut}
            />
          </div>

          {/* Dots */}
          <RoomDots total={rooms?.length || 0} current={current} onDotClick={(index) => api?.scrollTo(index)} />
        </div>
      </section>

      {/* Booking Dialog */}
      <BookingDialog room={selectedRoom} open={bookingOpen} onOpenChange={setBookingOpen} />

      {/* 360° Virtual Tour Viewer */}
      <VirtualTourViewer
        tourUrl={tourRoom?.virtual_tour_url || null}
        roomName={tourRoom?.name || ""}
        open={tourOpen}
        onOpenChange={setTourOpen}
      />
    </>
  );
};
