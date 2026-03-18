import { Circle } from "lucide-react";
import { getIconComponent } from "@/lib/icons";
import type { RoomFeaturesProps } from "./types";

export const RoomFeatures = ({ features, roomFeatures, layout = "default" }: RoomFeaturesProps) => {
  const getIcon = (iconName: string) => {
    return getIconComponent(iconName) || Circle;
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
      {features.map((featureId, index) => {
        const feature = roomFeatures?.find((f) => f.feature_key === featureId);
        if (!feature) return null;

        const IconComponent = getIcon(feature.icon_name);

        return (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-primary/10 text-primary rounded-full text-xs sm:text-sm"
            title={feature.label}
          >
            <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{feature.label}</span>
          </div>
        );
      })}
    </div>
  );
};
