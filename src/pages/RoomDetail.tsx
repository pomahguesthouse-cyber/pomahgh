import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { BookingDialog } from "@/components/booking/BookingDialog";
import { VirtualTourViewer } from "@/components/gallery/VirtualTourViewer";

import {
  RoomSEO,
  RoomHeader,
  RoomInfo,
  RoomFeaturesList,
  RoomSpecifications,
  RoomVirtualTour,
  RoomFloorPlan,
  RoomBookingCard,
  RoomRelatedRooms,
} from "@/components/room-detail";

import { RoomGallery } from "@/components/room-detail/RoomGallery";

import { useRoomDetail } from "@/hooks/room/useRoomDetail";
import { useRooms } from "@/hooks/room/useRooms";
import { useRoomFeatures } from "@/hooks/room/useRoomFeatures";
import { useRoomHotspots } from "@/hooks/room/useRoomHotspots";
import { useRoomPanoramas } from "@/hooks/room/useRoomPanoramas";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { useRoomAvailabilityCheck } from "@/hooks/room/useRoomAvailabilityCheck";
import { useRoomNavigation } from "@/components/room-detail/hooks/useRoomNavigation";

import type { Room } from "@/hooks/room/useRooms";
import NotFound from "./NotFound";

const RoomDetail = () => {
  const { roomSlug } = useParams<{ roomSlug: string }>();

  const { data: room, isLoading, error } = useRoomDetail(roomSlug || "");
  const { data: allRooms } = useRooms();
  const { data: roomFeatures } = useRoomFeatures();
  const { data: panoramas = [] } = useRoomPanoramas(room?.id);

  const [currentPanoramaId, setCurrentPanoramaId] = useState<string>();
  const { data: hotspots = [] } = useRoomHotspots(room?.id, currentPanoramaId);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [initialRoomQuantity, setInitialRoomQuantity] = useState(1);
  const [initialNumGuests, setInitialNumGuests] = useState(1);

  const { checkIn, checkOut } = useSearchDates();
  const { data: availability, isLoading: isCheckingAvailability } = useRoomAvailabilityCheck(checkIn, checkOut);

  const roomAvailability = room ? availability?.[room.id] : undefined;
  const isAvailabilityLoaded = !!checkIn && !!checkOut && !isCheckingAvailability;

  const { handleHotspotClick } = useRoomNavigation(panoramas, allRooms, setCurrentPanoramaId);

  /* ================= DATA PREP (hooks must be before early returns) ================= */
  const images = useMemo(
    () => (room?.image_urls && room.image_urls.length > 0 ? room.image_urls : room ? [room.image_url] : []),
    [room?.image_urls, room?.image_url],
  );

  const relatedRooms = useMemo(() => allRooms?.filter((r) => r.id !== room?.id).slice(0, 3) || [], [allRooms, room?.id]);

  /* ================= DEFAULT PANORAMA ================= */
  useEffect(() => {
    if (panoramas.length > 0 && !currentPanoramaId) {
      const primary = panoramas.find((p) => p.is_primary) || panoramas[0];
      setCurrentPanoramaId(primary.id);
    }
  }, [panoramas, currentPanoramaId]);

  /* ================= LOADING / ERROR ================= */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <Loader2 className="h-8 w-8 animate-spin text-stone-700" />
      </div>
    );
  }

  if (error || !room) {
    return <NotFound />;
  }

  /* ================= DERIVED DATA ================= */
  const activePromo = (room as any).active_promotion;
  const hasLegacyPromo =
    room.promo_price &&
    room.promo_start_date &&
    room.promo_end_date &&
    new Date() >= new Date(room.promo_start_date) &&
    new Date() <= new Date(room.promo_end_date);

  const hasPromo = !!activePromo || hasLegacyPromo;
  const displayPrice = room.final_price || room.price_per_night;

  const currentPanorama = panoramas.find((p) => p.id === currentPanoramaId);

  return (
    <>
      <RoomSEO room={room} images={images} displayPrice={displayPrice} roomSlug={roomSlug || ""} />

      <Header variant="solid" />

      {/* pb-24 = reserve space for mobile sticky bar */}
      <main className="bg-[#FAFAF9] pt-24 pb-24 lg:pb-0">
        <div className="container mx-auto px-4 py-8 space-y-16">
          <Breadcrumb items={[{ label: "Rooms", href: "/#rooms" }, { label: room.name }]} />

          {/* ================= HERO (MOBILE SAFE) ================= */}
          <section>
            <RoomGallery images={images} roomName={room.name} hasVirtualTour={!!room.virtual_tour_url} />
          </section>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* ================= LEFT CONTENT ================= */}
            <div className="lg:col-span-2 space-y-14">
              {/* HEADER + DESCRIPTION */}
              <section className="space-y-4">
                <RoomHeader name={room.name} hasVirtualTour={!!room.virtual_tour_url} hasPromo={hasPromo} />

                {/* text only, no wrapper component clamp */}
                <p className="text-stone-700 leading-relaxed text-base md:text-lg">{room.description}</p>
              </section>

              {/* FEATURES */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-900">Room Highlights</h2>

                <RoomFeaturesList features={room.features} roomFeatures={roomFeatures} />
              </section>

              {/* SPECS */}
              <section className="rounded-2xl bg-white border border-stone-200 p-6">
                <RoomSpecifications maxGuests={room.max_guests} sizeSqm={room.size_sqm} roomCount={room.room_count} />
              </section>

              {/* VIRTUAL TOUR */}
              {panoramas.length > 0 && (
                <section className="space-y-6">
                  <RoomVirtualTour
                    panoramas={panoramas}
                    currentPanoramaId={currentPanoramaId}
                    currentPanorama={currentPanorama}
                    hotspots={hotspots}
                    onPanoramaChange={setCurrentPanoramaId}
                    onHotspotClick={handleHotspotClick}
                    onFullScreen={() => setTourOpen(true)}
                  />

                  {room.floor_plan_enabled && room.floor_plan_url && (
                    <RoomFloorPlan
                      floorPlanUrl={room.floor_plan_url}
                      panoramas={panoramas}
                      currentPanoramaId={currentPanoramaId}
                      onPanoramaClick={setCurrentPanoramaId}
                    />
                  )}
                </section>
              )}
            </div>

            {/* ================= DESKTOP BOOKING ================= */}
            <div className="hidden lg:block">
              <div className="sticky top-32">
                <RoomBookingCard
                  room={room}
                  hasPromo={hasPromo}
                  displayPrice={displayPrice}
                  availability={roomAvailability}
                  isAvailabilityLoaded={isAvailabilityLoaded}
                  onBookNow={(roomQty, guests) => {
                    setInitialRoomQuantity(roomQty);
                    setInitialNumGuests(guests);
                    setBookingOpen(true);
                  }}
                />
              </div>
            </div>
          </div>

          <RoomRelatedRooms rooms={relatedRooms} />
        </div>
      </main>

      {/* ================= MOBILE STICKY BOOKING BAR ================= */}
      <div
        className="
        fixed bottom-0 inset-x-0 z-50
        bg-white border-t border-stone-200
        px-4 py-3
        flex items-center justify-between
        lg:hidden
      "
      >
        <div>
          <p className="text-xs text-stone-500">From</p>
          <p className="text-lg font-semibold text-stone-900">Rp {displayPrice.toLocaleString()}</p>
        </div>

        <button
          onClick={() => setBookingOpen(true)}
          className="
            bg-stone-900 text-white
            px-6 py-3 rounded-xl
            font-medium
            active:scale-95 transition
          "
        >
          Book Now
        </button>
      </div>

      <Footer />

      {/* ================= DIALOGS ================= */}
      <BookingDialog
        room={room as Room}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialRoomQuantity={initialRoomQuantity}
        initialNumGuests={initialNumGuests}
      />

      {tourOpen && (
        <VirtualTourViewer
          tourUrl={room.virtual_tour_url}
          roomName={room.name}
          open={tourOpen}
          onOpenChange={setTourOpen}
        />
      )}
    </>
  );
};

export default RoomDetail;












