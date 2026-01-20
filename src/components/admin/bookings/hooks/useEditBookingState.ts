import { useState, useEffect, useMemo, useCallback } from "react";
import { Booking, SelectedRoom, Room, BookingSource, CustomPriceMode } from "../types";
import { differenceInDays, parseISO } from "date-fns";

export function useEditBookingState(booking: Booking | null, rooms: Room[] | undefined) {
  // Guest info state
  const [editingBooking, setEditingBooking] = useState<Partial<Booking> | null>(null);
  
  // Room selection state
  const [editedRooms, setEditedRooms] = useState<SelectedRoom[]>([]);
  const [editedRoomType, setEditedRoomType] = useState<string>("");
  
  // Booking source state
  const [editedSource, setEditedSource] = useState<BookingSource>("direct");
  const [editedOtaName, setEditedOtaName] = useState("");
  const [editedOtherSource, setEditedOtherSource] = useState("");
  
  // Date state
  const [editedCheckIn, setEditedCheckIn] = useState<Date | undefined>();
  const [editedCheckOut, setEditedCheckOut] = useState<Date | undefined>();
  
  // Pricing state
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPriceMode, setCustomPriceMode] = useState<CustomPriceMode>("per_night");
  const [customPricePerNight, setCustomPricePerNight] = useState("");
  const [customTotalPrice, setCustomTotalPrice] = useState("");
  
  // Payment state
  const [editedPaymentStatus, setEditedPaymentStatus] = useState("unpaid");
  const [editedPaymentAmount, setEditedPaymentAmount] = useState("");
  
  // Conflict state
  const [hasDateConflict, setHasDateConflict] = useState(false);

  // Reset all state when booking changes
  useEffect(() => {
    if (booking) {
      setEditingBooking({
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone || "",
        status: booking.status,
        special_requests: booking.special_requests || "",
      });
      
      // Set room type
      setEditedRoomType(booking.room_id);
      
      // Set rooms from booking_rooms
      if (booking.booking_rooms && booking.booking_rooms.length > 0) {
        setEditedRooms(
          booking.booking_rooms.map((br) => ({
            roomId: br.room_id,
            roomNumber: br.room_number,
            pricePerNight: br.price_per_night,
          }))
        );
      } else if (booking.allocated_room_number) {
        const roomPrice = rooms?.find((r) => r.id === booking.room_id)?.price || 0;
        setEditedRooms([
          {
            roomId: booking.room_id,
            roomNumber: booking.allocated_room_number,
            pricePerNight: roomPrice,
          },
        ]);
      } else {
        setEditedRooms([]);
      }
      
      // Set dates
      setEditedCheckIn(parseISO(booking.check_in));
      setEditedCheckOut(parseISO(booking.check_out));
      
      // Set source
      if (booking.booking_source === "ota") {
        setEditedSource("ota");
        setEditedOtaName(booking.ota_name || "");
        setEditedOtherSource("");
      } else if (booking.booking_source === "other") {
        setEditedSource("other");
        setEditedOtaName("");
        setEditedOtherSource(booking.other_source || "");
      } else {
        setEditedSource((booking.booking_source as BookingSource) || "direct");
        setEditedOtaName("");
        setEditedOtherSource("");
      }
      
      // Set payment
      setEditedPaymentStatus(booking.payment_status || "unpaid");
      setEditedPaymentAmount(booking.payment_amount?.toString() || "");
      
      // Reset custom pricing
      setUseCustomPrice(false);
      setCustomPriceMode("per_night");
      setCustomPricePerNight("");
      setCustomTotalPrice("");
      
      // Reset conflict
      setHasDateConflict(false);
    }
  }, [booking, rooms]);

  // Calculate total nights
  const totalNights = useMemo(() => {
    if (editedCheckIn && editedCheckOut) {
      return differenceInDays(editedCheckOut, editedCheckIn);
    }
    return booking?.total_nights || 1;
  }, [editedCheckIn, editedCheckOut, booking?.total_nights]);

  // Get normal price per night from selected rooms
  const normalPricePerNight = useMemo(() => {
    if (editedRooms.length > 0) {
      return editedRooms.reduce((sum, room) => sum + room.pricePerNight, 0);
    }
    const room = rooms?.find((r) => r.id === editedRoomType);
    return room?.price || 0;
  }, [editedRooms, rooms, editedRoomType]);

  // Calculate total price
  const calculatedTotalPrice = useMemo(() => {
    if (useCustomPrice) {
      if (customPriceMode === "per_night") {
        const pricePerNight = parseFloat(customPricePerNight) || 0;
        return pricePerNight * totalNights;
      } else {
        return parseFloat(customTotalPrice) || 0;
      }
    }
    return normalPricePerNight * totalNights;
  }, [useCustomPrice, customPriceMode, customPricePerNight, customTotalPrice, normalPricePerNight, totalNights]);

  // Toggle room selection
  const toggleRoomSelection = useCallback((roomId: string, roomNumber: string, pricePerNight: number) => {
    setEditedRooms((prev) => {
      const exists = prev.find(
        (r) => r.roomId === roomId && r.roomNumber === roomNumber
      );
      if (exists) {
        return prev.filter(
          (r) => !(r.roomId === roomId && r.roomNumber === roomNumber)
        );
      }
      return [...prev, { roomId, roomNumber, pricePerNight }];
    });
  }, []);

  // Apply discount
  const applyDiscount = useCallback((percentage: number) => {
    const discountedPrice = normalPricePerNight * (1 - percentage / 100);
    setCustomPricePerNight(Math.round(discountedPrice).toString());
    setUseCustomPrice(true);
    setCustomPriceMode("per_night");
  }, [normalPricePerNight]);

  // Handle room type change
  const handleRoomTypeChange = useCallback((newRoomId: string) => {
    setEditedRoomType(newRoomId);
    // Clear selected rooms when room type changes
    setEditedRooms([]);
  }, []);

  return {
    // Guest info
    editingBooking,
    setEditingBooking,
    
    // Room selection
    editedRooms,
    setEditedRooms,
    editedRoomType,
    setEditedRoomType,
    toggleRoomSelection,
    handleRoomTypeChange,
    
    // Source
    editedSource,
    setEditedSource,
    editedOtaName,
    setEditedOtaName,
    editedOtherSource,
    setEditedOtherSource,
    
    // Dates
    editedCheckIn,
    setEditedCheckIn,
    editedCheckOut,
    setEditedCheckOut,
    totalNights,
    
    // Custom pricing
    useCustomPrice,
    setUseCustomPrice,
    customPriceMode,
    setCustomPriceMode,
    customPricePerNight,
    setCustomPricePerNight,
    customTotalPrice,
    setCustomTotalPrice,
    normalPricePerNight,
    calculatedTotalPrice,
    applyDiscount,
    
    // Payment
    editedPaymentStatus,
    setEditedPaymentStatus,
    editedPaymentAmount,
    setEditedPaymentAmount,
    
    // Conflict
    hasDateConflict,
    setHasDateConflict,
  };
}












