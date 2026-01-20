import { 
  Wifi, 
  Tv, 
  Wind, 
  Coffee, 
  Bath, 
  UtensilsCrossed,
  Waves,
  Dumbbell,
  Car,
  Users,
  ShowerHead,
  Refrigerator,
  type LucideIcon
} from "lucide-react";

export interface RoomFeature {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const ROOM_FEATURES: RoomFeature[] = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "tv", label: "TV", icon: Tv },
  { id: "ac", label: "Air Conditioning", icon: Wind },
  { id: "coffee", label: "Coffee Maker", icon: Coffee },
  { id: "bathtub", label: "Bathtub", icon: Bath },
  { id: "minibar", label: "Mini Bar", icon: Refrigerator },
  { id: "breakfast", label: "Breakfast", icon: UtensilsCrossed },
  { id: "pool", label: "Pool Access", icon: Waves },
  { id: "gym", label: "Gym Access", icon: Dumbbell },
  { id: "parking", label: "Free Parking", icon: Car },
  { id: "workspace", label: "Work Space", icon: Users },
  { id: "shower", label: "Rain Shower", icon: ShowerHead },
];












