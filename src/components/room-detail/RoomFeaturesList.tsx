import { icons, Circle, type LucideIcon } from "lucide-react";
import type { RoomFeaturesListProps } from "./types";

const getIconComponent = (iconName: string): LucideIcon => {
  return (icons[iconName as keyof typeof icons] as LucideIcon) || Circle;
};
export const RoomFeaturesList = ({
  features,
  roomFeatures
}: RoomFeaturesListProps) => {
  return <div>
      <h2 className="text-2xl font-bold mb-4 font-sans">Fasilitas Kamar </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {features.map(featureId => {
        const feature = roomFeatures?.find(f => f.feature_key === featureId);
        if (!feature) return null;
        const IconComponent = getIconComponent(feature.icon_name);
        return <div key={featureId} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
              <IconComponent className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{feature.label}</span>
            </div>;
      })}
      </div>
    </div>;
};