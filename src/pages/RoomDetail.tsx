import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useRoomDetail } from "@/hooks/useRoomDetail";
import { useRooms } from "@/hooks/useRooms";
import { useRoomFeatures } from "@/hooks/useRoomFeatures";
import { useRoomHotspots } from "@/hooks/useRoomHotspots";
import { useRoomPanoramas } from "@/hooks/useRoomPanoramas";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { useRoomAvailabilityCheck } from "@/hooks/useRoomAvailabilityCheck";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BookingDialog } from "@/components/BookingDialog";
import { VirtualTourViewer } from "@/components/VirtualTourViewer";
import { Loader2 } from "lucide-react";
import type { Room } from "@/hooks/useRooms";
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
  RoomRelatedRooms
} from "@/components/room-detail";
import { useRoomNavigation } from "@/components/room-detail/hooks/useRoomNavigation";

const RoomDetail = () => {
  const { roomSlug } = useParams<{ roomSlug: string }>();
  const { data: room, isLoading, error } = useRoomDetail(roomSlug || "");
  const { data: allRooms } = useRooms();
  const { data: roomFeatures } = useRoomFeatures();
  const { data: panoramas = [] } = useRoomPanoramas(room?.id);
  const [currentPanoramaId, setCurrentPanoramaId] = useState<string | undefined>();
  const { data: hotspots = [] } = useRoomHotspots(room?.id, currentPanoramaId);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [initialRoomQuantity, setInitialRoomQuantity] = useState(1);
  const [initialNumGuests, setInitialNumGuests] = useState(1);

  // Get search dates and check availability
  const { checkIn, checkOut } = useSearchDates();
  const { data: availability, isLoading: isCheckingAvailability } = useRoomAvailabilityCheck(checkIn, checkOut);
  const roomAvailability = room ? availability?.[room.id] : undefined;
  const isAvailabilityLoaded = !!checkIn && !!checkOut && !isCheckingAvailability;

  const { handleHotspotClick } = useRoomNavigation(
    panoramas,
    allRooms,
    setCurrentPanoramaId
  );

  // Set primary panorama when data loads
  useEffect(() => {
    if (panoramas.length > 0 && !currentPanoramaId) {
      const primary = panoramas.find(p => p.is_primary) || panoramas[0];
      setCurrentPanoramaId(primary.id);
    }
  }, [panoramas, currentPanoramaId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !room) {
    return <Navigate to="/404" replace />;
  }

  const images = room.image_urls && room.image_urls.length > 0 
    ? room.image_urls 
    : [room.image_url];

  const hasPromo = room.promo_price &&
    room.promo_start_date &&
    room.promo_end_date &&
    new Date() >= new Date(room.promo_start_date) &&
    new Date() <= new Date(room.promo_end_date);

  const displayPrice = room.final_price || room.price_per_night;
  const relatedRooms = allRooms?.filter(r => r.id !== room.id).slice(0, 3) || [];
  const currentPanorama = panoramas.find(p => p.id === currentPanoramaId);

  return (
    <>
      <RoomSEO 
        room={room}
        images={images}
        displayPrice={displayPrice}
        roomSlug={roomSlug || ""}
      />

      <Header variant="solid" />

      <main className="min-h-screen bg-background pt-28">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb
            items={[
              { label: "Rooms", href: "/#rooms" },
              { label: room.name }
            ]}
          />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Images and Details */}
            <div className="lg:col-span-2 space-y-8">
              <RoomGallery 
                images={images}
                roomName={room.name}
                hasVirtualTour={!!room.virtual_tour_url}
              />

              <div>
                <RoomHeader 
                  name={room.name}
                  hasVirtualTour={!!room.virtual_tour_url}
                  hasPromo={hasPromo}
                />
                <RoomInfo description={room.description} />
              </div>

              <RoomFeaturesList 
                features={room.features}
                roomFeatures={roomFeatures}
              />

              <RoomSpecifications 
                maxGuests={room.max_guests}
                sizeSqm={room.size_sqm}
                roomCount={room.room_count}
              />

              {panoramas.length > 0 && (
                <div className="space-y-4">
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
                </div>
              )}
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <RoomBookingCard 
                room={room}
                hasPromo={hasPromo}
                displayPrice={displayPrice}
                onBookNow={(roomQty, guests) => {
                  setInitialRoomQuantity(roomQty);
                  setInitialNumGuests(guests);
                  setBookingOpen(true);
                }}
                availability={roomAvailability}
                isAvailabilityLoaded={isAvailabilityLoaded}
              />
            </div>
          </div>

          <RoomRelatedRooms rooms={relatedRooms} />
        </div>
      </main>

      <Footer />

      <BookingDialog
        room={room as Room}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialRoomQuantity={initialRoomQuantity}
        initialNumGuests={initialNumGuests}
      />

      <VirtualTourViewer
        tourUrl={room.virtual_tour_url}
        roomName={room.name}
        open={tourOpen}
        onOpenChange={setTourOpen}
      />
    </>
  );
};

export default RoomDetail;
