import { Badge } from "@/components/ui/badge";
import { Eye, Tag } from "lucide-react";
import type { RoomHeaderProps } from "./types";

export const RoomHeader = ({ name, hasVirtualTour, hasPromo }: RoomHeaderProps) => {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          {name}
        </h1>
        {hasVirtualTour && (
          <Badge variant="secondary" className="mb-2">
            <Eye className="w-3 h-3 mr-1" />
            360° Tour Available
          </Badge>
        )}
      </div>
      
      {hasPromo && (
        <Badge className="bg-red-500 text-white">
          <Tag className="w-3 h-3 mr-1" />
          Promo Active
        </Badge>
      )}
    </div>
  );
};












