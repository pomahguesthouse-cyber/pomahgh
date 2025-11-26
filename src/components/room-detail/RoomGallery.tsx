import { ImageGallery } from "@/components/ImageGallery";
import type { RoomGalleryProps } from "./types";

export const RoomGallery = ({ images, roomName, hasVirtualTour }: RoomGalleryProps) => {
  return (
    <ImageGallery 
      images={images} 
      roomName={roomName} 
      has360Tour={hasVirtualTour} 
    />
  );
};
