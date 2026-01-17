import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GetRoomDetailsParams } from '../lib/types.ts';
import { findBestRoomMatch, getRoomListString } from '../lib/roomMatcher.ts';

/**
 * Get detailed information about a specific room
 */
export async function handleGetRoomDetails(
  supabase: SupabaseClient,
  params: GetRoomDetailsParams
) {
  const { room_name } = params;
  
  // Get all available rooms
  const { data: allRooms, error: roomsError } = await supabase
    .from("rooms")
    .select("*")
    .eq("available", true);

  if (roomsError) throw roomsError;

  // Find best matching room using unified matcher
  const room = findBestRoomMatch(room_name, allRooms || []);

  if (!room) {
    const roomList = getRoomListString(allRooms || []);
    throw new Error(`Kamar "${room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
  }
  
  return room;
}
