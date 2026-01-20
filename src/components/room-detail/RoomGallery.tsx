import { ImageGallery } from "@/components/gallery/ImageGallery";
import type { RoomGalleryProps } from "./types";

export const RoomGallery = ({ images, roomName, hasVirtualTour }: RoomGalleryProps) => {
  return (
    <div
      className="
        relative
        w-full
        aspect-[16/9]
        min-h-[240px]
        bg-stone-100
        overflow-hidden
      "
    >
      <ImageGallery images={images} roomName={roomName} has360Tour={hasVirtualTour} />
    </div>
  );
};












