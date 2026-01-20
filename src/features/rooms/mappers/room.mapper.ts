/**
 * Room Data Mapper
 * Transforms database entities to DTOs and vice versa
 */

import type { Room, RoomPromotion, RoomAddon, RoomFeature } from "@/types/room.types";
import { formatRupiah } from "@/lib/format/currency";

// DTO for room display (camelCase)
export interface RoomDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePerNight: number;
  formattedPrice: string;
  finalPrice: number;
  formattedFinalPrice: string;
  maxGuests: number;
  features: string[];
  imageUrl: string;
  imageUrls: string[];
  sizeSqm: number | null;
  roomCount: number;
  allotment: number;
  available: boolean;
  hasPromotion: boolean;
  promotionBadge: string | null;
  promotionBadgeColor: string | null;
  discountPercentage: number | null;
  hasVirtualTour: boolean;
  hasFloorPlan: boolean;
}

// Card item for room listings
export interface RoomCardItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  price: string;
  originalPrice: string | null;
  maxGuests: number;
  features: string[];
  hasPromotion: boolean;
  promotionBadge: string | null;
  badgeColor: string;
  allotment: number;
}

// Select option for dropdowns
export interface RoomSelectOption {
  value: string;
  label: string;
  price: number;
  maxGuests: number;
}

// Addon DTO
export interface RoomAddonDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  formattedPrice: string;
  priceType: "per_night" | "one_time" | "per_person";
  priceTypeLabel: string;
  category: string;
  iconName: string;
  maxQuantity: number;
  extraCapacity: number;
}

const PRICE_TYPE_LABELS: Record<string, string> = {
  per_night: "per malam",
  one_time: "sekali bayar",
  per_person: "per orang",
};

export const roomMapper = {
  /**
   * Transform database entity to full DTO
   */
  toDTO: (entity: Room, activePromotion?: RoomPromotion | null): RoomDTO => {
    const finalPrice = entity.final_price || entity.price_per_night;
    const hasPromotion = !!activePromotion || (entity.promo_price !== null && entity.promo_price > 0);
    
    let discountPercentage: number | null = null;
    if (hasPromotion && finalPrice < entity.price_per_night) {
      discountPercentage = Math.round(
        ((entity.price_per_night - finalPrice) / entity.price_per_night) * 100
      );
    }

    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug || entity.id,
      description: entity.description,
      pricePerNight: entity.price_per_night,
      formattedPrice: formatRupiah(entity.price_per_night),
      finalPrice,
      formattedFinalPrice: formatRupiah(finalPrice),
      maxGuests: entity.max_guests,
      features: entity.features || [],
      imageUrl: entity.image_url,
      imageUrls: entity.image_urls || [],
      sizeSqm: entity.size_sqm,
      roomCount: entity.room_count,
      allotment: entity.allotment,
      available: entity.available,
      hasPromotion,
      promotionBadge: activePromotion?.badge_text || null,
      promotionBadgeColor: activePromotion?.badge_color || null,
      discountPercentage,
      hasVirtualTour: !!entity.virtual_tour_url,
      hasFloorPlan: entity.floor_plan_enabled || false,
    };
  },

  /**
   * Transform to card item for listings
   */
  toCardItem: (entity: Room, activePromotion?: RoomPromotion | null): RoomCardItem => {
    const finalPrice = entity.final_price || entity.price_per_night;
    const hasPromotion = !!activePromotion || finalPrice < entity.price_per_night;

    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug || entity.id,
      imageUrl: entity.image_url,
      price: formatRupiah(finalPrice),
      originalPrice: hasPromotion ? formatRupiah(entity.price_per_night) : null,
      maxGuests: entity.max_guests,
      features: entity.features?.slice(0, 4) || [],
      hasPromotion,
      promotionBadge: activePromotion?.badge_text || null,
      badgeColor: activePromotion?.badge_color || "bg-red-500",
      allotment: entity.allotment,
    };
  },

  /**
   * Transform to select option
   */
  toSelectOption: (entity: Room): RoomSelectOption => ({
    value: entity.id,
    label: entity.name,
    price: entity.final_price || entity.price_per_night,
    maxGuests: entity.max_guests,
  }),

  /**
   * Transform addon to DTO
   */
  toAddonDTO: (addon: RoomAddon): RoomAddonDTO => ({
    id: addon.id,
    name: addon.name,
    description: addon.description || "",
    price: addon.price,
    formattedPrice: formatRupiah(addon.price),
    priceType: addon.price_type,
    priceTypeLabel: PRICE_TYPE_LABELS[addon.price_type] || addon.price_type,
    category: addon.category || "other",
    iconName: addon.icon_name || "Package",
    maxQuantity: addon.max_quantity,
    extraCapacity: addon.extra_capacity || 0,
  }),

  /**
   * Transform multiple entities to DTOs
   */
  toDTOList: (entities: Room[], promotions?: Map<string, RoomPromotion>): RoomDTO[] =>
    entities.map((entity) =>
      roomMapper.toDTO(entity, promotions?.get(entity.id) || entity.active_promotion)
    ),

  /**
   * Transform multiple entities to card items
   */
  toCardItems: (entities: Room[], promotions?: Map<string, RoomPromotion>): RoomCardItem[] =>
    entities.map((entity) =>
      roomMapper.toCardItem(entity, promotions?.get(entity.id) || entity.active_promotion)
    ),

  /**
   * Transform multiple entities to select options
   */
  toSelectOptions: (entities: Room[]): RoomSelectOption[] =>
    entities.map(roomMapper.toSelectOption),

  /**
   * Transform multiple addons to DTOs
   */
  toAddonDTOList: (addons: RoomAddon[]): RoomAddonDTO[] =>
    addons.map(roomMapper.toAddonDTO),
};












