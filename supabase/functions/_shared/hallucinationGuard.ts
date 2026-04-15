/**
 * Hallucination Guard — Post-AI response validation.
 *
 * Checks AI responses for common hallucination patterns before
 * they are sent to users. Catches:
 *   1. Fabricated prices (numbers not matching known room prices)
 *   2. Fabricated booking codes (PMH-XXXX patterns not from tool results)
 *   3. Fabricated URLs or phone numbers
 *   4. Contradictions with tool results (e.g., says "available" when tool said "unavailable")
 *   5. Made-up room names not in the hotel's inventory
 *
 * Usage:
 *   const guard = createHallucinationGuard({ rooms, hotelPhone });
 *   const result = guard.validate(aiResponse, toolResults);
 *   if (!result.passed) {
 *     // Use result.corrected or fallback
 *   }
 */

export interface HallucinationGuardConfig {
  /** Known room names (lowercase) */
  roomNames?: string[];
  /** Known room prices */
  roomPrices?: number[];
  /** Hotel's official WhatsApp/phone number */
  hotelPhone?: string;
  /** Known valid booking codes from tool results in this conversation */
  knownBookingCodes?: string[];
}

export interface ValidationResult {
  passed: boolean;
  violations: Violation[];
  /** Original response with violations flagged/removed */
  corrected: string;
}

export interface Violation {
  type: 'fabricated_price' | 'fabricated_booking_code' | 'fabricated_url' | 'fabricated_phone' | 'unknown_room' | 'availability_contradiction' | 'total_price_mismatch';
  detail: string;
  /** The problematic text snippet */
  snippet: string;
}

/**
 * Create a hallucination guard with hotel-specific config.
 */
export function createHallucinationGuard(config: HallucinationGuardConfig) {
  const roomNamesLower = (config.roomNames || []).map(n => n.toLowerCase());
  const knownPrices = new Set(config.roomPrices || []);
  const knownCodes = new Set(config.knownBookingCodes || []);

  return {
    /**
     * Validate an AI response against known facts and tool results.
     * @param response - The AI-generated text response
     * @param toolResults - Array of tool result JSON strings from this conversation turn
     */
    validate(response: string, toolResults: string[] = []): ValidationResult {
      const violations: Violation[] = [];

      // 1. Check for fabricated prices
      checkFabricatedPrices(response, knownPrices, toolResults, violations);

      // 2. Check for fabricated booking codes
      checkFabricatedBookingCodes(response, knownCodes, toolResults, violations);

      // 3. Check for fabricated URLs
      checkFabricatedUrls(response, violations);

      // 4. Check for unknown room names
      checkUnknownRooms(response, roomNamesLower, violations);

      // 5. Check for availability contradictions
      checkAvailabilityContradictions(response, toolResults, violations);

      // 6. Check total price calculations against tool data
      checkTotalPriceCalculation(response, toolResults, violations);

      // Build corrected response
      let corrected = response;
      for (const v of violations) {
        if (v.type === 'fabricated_url') {
          // Remove fabricated URLs
          corrected = corrected.replace(v.snippet, '[link dihapus]');
        }
        if (v.type === 'fabricated_phone' && config.hotelPhone) {
          corrected = corrected.replace(v.snippet, config.hotelPhone);
        }
      }

      return {
        passed: violations.length === 0,
        violations,
        corrected,
      };
    },
  };
}

// --- Internal validators ---

function checkFabricatedPrices(
  response: string,
  knownPrices: Set<number>,
  toolResults: string[],
  violations: Violation[]
) {
  // Extract all Rp prices from response
  const pricePattern = /Rp\s?[\d.,]+/gi;
  const matches = response.matchAll(pricePattern);

  // Collect prices mentioned in tool results
  const toolPrices = new Set<number>();
  for (const tr of toolResults) {
    const toolPriceMatches = tr.matchAll(/(?:"price"|"price_per_night"|"effective_price"|"base_price"|"total_price"|"amount")\s*:\s*(\d+)/gi);
    for (const m of toolPriceMatches) {
      toolPrices.add(Number(m[1]));
    }
  }

  const allKnown = new Set([...knownPrices, ...toolPrices]);

  for (const match of matches) {
    const priceStr = match[0].replace(/[Rp\s.]/gi, '').replace(/,/g, '');
    const price = Number(priceStr);
    if (isNaN(price) || price < 10000) continue; // skip tiny amounts

    // Check if this price is close to any known price (within 5% tolerance for rounding)
    let isKnown = false;
    for (const kp of allKnown) {
      if (kp === 0) continue;
      const ratio = price / kp;
      if (ratio >= 0.95 && ratio <= 1.05) {
        isKnown = true;
        break;
      }
      // Also check multiples (multi-night pricing)
      for (let nights = 2; nights <= 30; nights++) {
        const multiRatio = price / (kp * nights);
        if (multiRatio >= 0.95 && multiRatio <= 1.05) {
          isKnown = true;
          break;
        }
      }
      if (isKnown) break;
    }

    if (!isKnown && allKnown.size > 0) {
      violations.push({
        type: 'fabricated_price',
        detail: `Price ${match[0]} not found in known prices or tool results`,
        snippet: match[0],
      });
    }
  }
}

function checkFabricatedBookingCodes(
  response: string,
  knownCodes: Set<string>,
  toolResults: string[],
  violations: Violation[]
) {
  // Extract booking codes (PMH-XXXXXX pattern)
  const codePattern = /PMH-[A-Z0-9]{4,10}/gi;
  const matches = response.matchAll(codePattern);

  // Collect codes from tool results
  const toolCodes = new Set<string>();
  for (const tr of toolResults) {
    const toolCodeMatches = tr.matchAll(/PMH-[A-Z0-9]{4,10}/gi);
    for (const m of toolCodeMatches) {
      toolCodes.add(m[0].toUpperCase());
    }
  }

  const allKnown = new Set([...knownCodes, ...toolCodes]);

  for (const match of matches) {
    const code = match[0].toUpperCase();
    if (allKnown.size > 0 && !allKnown.has(code)) {
      violations.push({
        type: 'fabricated_booking_code',
        detail: `Booking code ${code} not found in tool results`,
        snippet: match[0],
      });
    }
  }
}

function checkFabricatedUrls(
  response: string,
  violations: Violation[]
) {
  // Check for URLs that AI might fabricate (payment links, booking links, etc.)
  const urlPattern = /https?:\/\/[^\s)]+/gi;
  const matches = response.matchAll(urlPattern);

  // Allowed domains
  const allowedDomains = [
    'wa.me',
    'api.whatsapp.com',
    'maps.google.com',
    'goo.gl',
    'maps.app.goo.gl',
  ];

  for (const match of matches) {
    const url = match[0];
    const isAllowed = allowedDomains.some(d => url.includes(d));
    if (!isAllowed) {
      violations.push({
        type: 'fabricated_url',
        detail: `URL "${url}" may be fabricated — not in allowed domains`,
        snippet: url,
      });
    }
  }
}

function checkUnknownRooms(
  response: string,
  roomNamesLower: string[],
  violations: Violation[]
) {
  if (roomNamesLower.length === 0) return;

  // Common room type patterns the AI might fabricate
  const fabricatedRoomPatterns = [
    /kamar\s+(suite|presidential|royal|penthouse|premium|luxury|vip|executive)/gi,
    /\b(suite|presidential|royal|penthouse)\s+(room|kamar)/gi,
  ];

  for (const pattern of fabricatedRoomPatterns) {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      const mentioned = match[0].toLowerCase();
      const isKnown = roomNamesLower.some(name => 
        mentioned.includes(name) || name.includes(mentioned.replace(/kamar\s+/i, ''))
      );
      if (!isKnown) {
        violations.push({
          type: 'unknown_room',
          detail: `Room type "${match[0]}" not in hotel inventory`,
          snippet: match[0],
        });
      }
    }
  }
}

function checkAvailabilityContradictions(
  response: string,
  toolResults: string[],
  violations: Violation[]
) {
  // Check if AI says "available" when tool said "unavailable" or vice versa
  const responseLower = response.toLowerCase();
  const saysAvailable = /tersedia|available|ada\s+kamar|masih\s+kosong/i.test(responseLower);
  const saysUnavailable = /tidak\s+tersedia|unavailable|penuh|fully\s+booked|sold\s+out|sudah\s+penuh|habis/i.test(responseLower);

  for (const tr of toolResults) {
    const trLower = tr.toLowerCase();
    
    // Tool says unavailable but AI says available
    if (saysAvailable && !saysUnavailable) {
      if (trLower.includes('"available":false') || trLower.includes('"available": false') || trLower.includes('"status":"unavailable"')) {
        violations.push({
          type: 'availability_contradiction',
          detail: 'AI says available but tool returned unavailable',
          snippet: response.match(/tersedia|available|ada\s+kamar|masih\s+kosong/i)?.[0] || '',
        });
      }
    }

    // Tool says available but AI says unavailable
    if (saysUnavailable && !saysAvailable) {
      if (trLower.includes('"available":true') || trLower.includes('"available": true')) {
        violations.push({
          type: 'availability_contradiction',
          detail: 'AI says unavailable but tool returned available',
          snippet: response.match(/tidak\s+tersedia|unavailable|penuh|fully\s+booked|sold\s+out|sudah\s+penuh|habis/i)?.[0] || '',
        });
      }
    }
  }
}

/**
 * Check if AI's stated total matches price_per_night × nights from tool results.
 * Catches arithmetic hallucinations like "2 malam × Rp200.000 = Rp500.000".
 */
function checkTotalPriceCalculation(
  response: string,
  toolResults: string[],
  violations: Violation[]
) {
  // Extract total amounts from tool results
  for (const tr of toolResults) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(tr);
    } catch {
      continue;
    }

    // Look for price_per_night and nights/total fields in tool result
    const pricePerNight = extractNumber(parsed, ['price_per_night', 'effective_price', 'base_price']);
    const nights = extractNumber(parsed, ['nights', 'total_nights', 'duration']);
    const rooms = extractNumber(parsed, ['room_count', 'rooms', 'total_rooms']) || 1;
    const toolTotal = extractNumber(parsed, ['total_price', 'total_amount', 'grand_total']);

    if (pricePerNight && nights) {
      const expectedTotal = pricePerNight * nights * rooms;

      // Check if AI mentions a total price in the response
      const totalPattern = /(?:total|jumlah|seluruh|keseluruhan)[^Rp]*Rp\s?[\d.,]+/gi;
      const totalMatches = response.matchAll(totalPattern);

      for (const match of totalMatches) {
        const priceStr = match[0].match(/Rp\s?[\d.,]+/i)?.[0] || '';
        const statedTotal = Number(priceStr.replace(/[Rp\s.]/gi, '').replace(/,/g, ''));
        if (isNaN(statedTotal) || statedTotal < 10000) continue;

        const ratio = statedTotal / expectedTotal;
        if (ratio < 0.95 || ratio > 1.05) {
          violations.push({
            type: 'total_price_mismatch',
            detail: `AI stated total ${priceStr} but calculated total should be Rp${expectedTotal.toLocaleString('id-ID')} (${pricePerNight.toLocaleString('id-ID')} × ${nights} malam × ${rooms} kamar)`,
            snippet: match[0],
          });
        }
      }

      // Also validate tool's own total if provided
      if (toolTotal && Math.abs(toolTotal - expectedTotal) > expectedTotal * 0.05) {
        // Tool result itself may have inconsistency — log but don't block
        console.warn(`[hallucination-guard] Tool total ${toolTotal} != calculated ${expectedTotal}`);
      }
    }
  }
}

function extractNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (key in obj && typeof obj[key] === 'number') return obj[key] as number;
    if (key in obj && typeof obj[key] === 'string') {
      const n = Number(obj[key]);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}
