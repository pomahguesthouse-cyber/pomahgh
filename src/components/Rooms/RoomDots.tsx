import type { RoomDotsProps } from "./types";

export const RoomDots = ({ total, current, onDotClick }: RoomDotsProps) => {
  return (
    <div className="flex justify-center gap-2 mt-8">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          className={`h-2 rounded-full transition-all ${
            index === current ? "w-8 bg-primary" : "w-2 bg-primary/30"
          }`}
          onClick={() => onDotClick(index)}
        />
      ))}
    </div>
  );
};












