/**
 * SINGLE SOURCE OF TRUTH for room name normalization and matching
 * Used by: get_room_details, create_booking_draft
 */

// Room aliases for common variations and typos
const ROOM_ALIASES: Record<string, string[]> = {
  'family suite': ['family', 'fs', 'familysuite', 'family room', 'suite keluarga'],
  'grand deluxe': ['gd', 'granddeluxe', 'grand'],
  'deluxe': ['dlx', 'dx', 'delux'],
  'single': ['sgl', 'single room'],
  'superior': ['sup', 'super'],
  'villa': ['vl', 'vila']
};

/**
 * Normalize room name for comparison
 * Removes common prefixes/suffixes and extra whitespace
 */
export function normalizeRoomName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(room|kamar)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find best matching room from a list
 * Priority order: exact match > alias > starts with > contains
 */
interface RoomEntry { name: string; [key: string]: unknown }

export function findBestRoomMatch(searchName: string, rooms: RoomEntry[]): RoomEntry | null {
  const normalizedSearch = normalizeRoomName(searchName);
  
  console.log(`🔍 Room matching: "${searchName}" -> normalized: "${normalizedSearch}"`);
  console.log(`📋 Available rooms: ${rooms.map(r => r.name).join(', ')}`);

  // Priority 1: Exact match
  const exactMatch = rooms.find(r => 
    normalizeRoomName(r.name) === normalizedSearch
  );
  if (exactMatch) {
    console.log(`✅ EXACT match: "${exactMatch.name}"`);
    return exactMatch;
  }

  // Priority 2: Check aliases
  for (const room of rooms) {
    const roomNormalized = normalizeRoomName(room.name);
    const roomAliases = ROOM_ALIASES[roomNormalized] || [];
    if (roomAliases.includes(normalizedSearch) || roomAliases.includes(normalizedSearch.replace(/\s+/g, ''))) {
      console.log(`✅ ALIAS match: "${searchName}" -> "${room.name}"`);
      return room;
    }
  }

  // Priority 3: Starts with (e.g., "deluxe" matches "deluxe room" but NOT "grand deluxe")
  const startsWithMatch = rooms.find(r => 
    normalizeRoomName(r.name).startsWith(normalizedSearch) ||
    normalizedSearch.startsWith(normalizeRoomName(r.name))
  );
  if (startsWithMatch) {
    console.log(`✅ STARTS WITH match: "${startsWithMatch.name}"`);
    return startsWithMatch;
  }

  // Priority 4: Contains (fallback for partial matches like "grand" -> "grand deluxe")
  const containsMatch = rooms.find(r => {
    const normalized = normalizeRoomName(r.name);
    return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
  });
  if (containsMatch) {
    console.log(`✅ CONTAINS match: "${containsMatch.name}"`);
    return containsMatch;
  }

  console.log(`❌ NO match found for "${searchName}"`);
  return null;
}

/**
 * Get list of available room names for error messages
 */
export function getRoomListString(rooms: RoomEntry[]): string {
  return rooms?.map(r => r.name).join(', ') || 'none';
}
