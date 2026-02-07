// ============= SMART ROOM MATCHING =============

// Room aliases for common variations
const ROOM_ALIASES: Record<string, string[]> = {
  'family suite': ['family', 'fs', 'familysuite', 'family room', 'suite keluarga'],
  'grand deluxe': ['gd', 'granddeluxe', 'grand'],
  'deluxe': ['dlx', 'dx', 'delux'],
  'single': ['sgl', 'single room'],
  'superior': ['sup', 'super'],
  'villa': ['vl', 'vila']
};

/**
 * Normalize room name for matching
 * Only removes 'room' and 'kamar', keeps 'suite' intact
 */
function normalizeRoomName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(room|kamar)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find best room match using prioritized matching:
 * 1. Exact match (highest priority)
 * 2. Alias match
 * 3. Starts with match
 * 4. Contains match (fallback)
 */
interface RoomEntry { name: string; [key: string]: unknown }

export function findBestRoomMatch(searchName: string, rooms: RoomEntry[]): RoomEntry | null {
  const normalizedSearch = normalizeRoomName(searchName);
  
  console.log(`🔍 Room matching: "${searchName}" -> "${normalizedSearch}"`);
  console.log(`📋 Available rooms: ${rooms.map((r) => `"${r.name}" -> "${normalizeRoomName(r.name)}"`).join(', ')}`);

  // Priority 1: Exact match
  const exactMatch = rooms.find((r) => 
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

  // Priority 3: Starts with
  const startsWithMatch = rooms.find((r) => 
    normalizeRoomName(r.name).startsWith(normalizedSearch) ||
    normalizedSearch.startsWith(normalizeRoomName(r.name))
  );
  if (startsWithMatch) {
    console.log(`✅ STARTS WITH match: "${startsWithMatch.name}"`);
    return startsWithMatch;
  }

  // Priority 4: Contains (fallback)
  const containsMatch = rooms.find((r) => {
    const normalized = normalizeRoomName(r.name);
    return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
  });
  if (containsMatch) {
    console.log(`✅ CONTAINS match: "${containsMatch.name}"`);
    return containsMatch;
  }

  console.log(`❌ NO match for "${searchName}"`);
  return null;
}
