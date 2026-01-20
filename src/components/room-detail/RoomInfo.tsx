import type { RoomInfoProps } from "./types";

export const RoomInfo = ({ description }: RoomInfoProps) => {
  return (
    <p className="text-lg text-muted-foreground leading-relaxed">
      {description}
    </p>
  );
};












