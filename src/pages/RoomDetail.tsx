import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BookingDialog } from "@/components/BookingDialog";
import { VirtualTourViewer } from "@/components/VirtualTourViewer";

import {
  RoomSEO,
  RoomHeader,
  RoomGallery,
  RoomInfo,
  RoomFeaturesList,
  RoomSpecifications,
  RoomVirtualTour,
  RoomFloorPlan,
  RoomBookingCard,
  RoomRelatedRooms,
} from "@/components/room-detail";

import { useRoomDetail } from "@/hooks/useRoomDetail";
import { useRooms } from "@/hooks/useRooms";
import { useRoomFeatures } from "@/hooks/useRoomFeatures";
import { useRoomHotspots } from "@/hooks/useRoomHotspots";
import { useRoomPanoramas } from "@/hooks/useRoomPanoramas";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { useRoomAvailabilityCheck } from "@/hooks/useRoomAvailabilityCheck";
import { useRoomNavigation } from "@/components/room-detail/hooks/useRoomNavigation";

import type { Room } from "@/hooks/useRooms";
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

  /* ================= DEFAULT PANORAMA ================= */
  useEffect(() => {
    if (panoramas.length > 0 && !currentPanoramaId) {
      const primary = panoramas.find((p) => p.is_primary) || panoramas[0];
      setCurrentPanoramaId(primary.id);
    }
  }, [panoramas, currentPanoramaId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !room) {
    return <NotFound />;
  }

  /* ================= MEMO DATA ================= */
  const images = useMemo(
    () => (room.image_urls && room.image_urls.length > 0 ? room.image_urls : [room.image_url]),
    [room.image_urls, room.image_url],
  );

  const activePromo = (room as any).active_promotion;
  const hasLegacyPromo =
    room.promo_price &&
    room.promo_start_date &&
    room.promo_end_date &&
    new Date() >= new Date(room.promo_start_date) &&
    new Date() <= new Date(room.promo_end_date);

  const hasPromo = !!activePromo || hasLegacyPromo;
  const displayPrice = room.final_price || room.price_per_night;

  const relatedRooms = useMemo(() => allRooms?.filter((r) => r.id !== room.id).slice(0, 3) || [], [allRooms, room.id]);

  const currentPanorama = panoramas.find((p) => p.id === currentPanoramaId);

  return (
    <>
      <RoomSEO room={room} images={images} displayPrice={displayPrice} roomSlug={roomSlug || ""} />

      <Header variant="solid" />

      <main className="bg-[#FAFAF9] pt-24 pb-24 lg:pb-0">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb items={[{ label: "Rooms", href: "/#rooms" }, { label: room.name }]} />

          <div className="grid lg:grid-cols-3 gap-10">
            {/* ================= LEFT ================= */}
            <div className="lg:col-span-2 space-y-14">
              {/* HERO (mobile optimized) */}
              <div
                className="
                relative
                h-[60vh] min-h-[320px] max-h-[420px]
                rounded-2xl overflow-hidden
              "
              >
                <RoomGallery images={images} roomName={room.name} hasVirtualTour={!!room.virtual_tour_url} />

                {/* gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
              </div>

              {/* HEADER */}
              <section className="space-y-4">
                <RoomHeader name={room.name} hasVirtualTour={!!room.virtual_tour_url} hasPromo={hasPromo} />

                {/* description clamp on mobile */}
                <div className="text-stone-700 text-base leading-relaxed line-clamp-4 md:line-clamp-none">
                  <RoomInfo description={room.description} />
                </div>
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
            <div className="lg:col-span-1 hidden lg:block">
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

          <section className="mt-24">
            <RoomRelatedRooms rooms={relatedRooms} />
          </section>
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
