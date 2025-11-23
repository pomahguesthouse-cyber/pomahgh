import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageGalleryProps {
  images: string[];
  roomName: string;
}

export const ImageGallery = ({ images, roomName }: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-video rounded-lg overflow-hidden group">
        <img
          src={images[selectedImage]}
          alt={`${roomName} - Photo ${selectedImage + 1}`}
          className="w-full h-full object-cover"
        />
        <Button
          onClick={() => setLightboxOpen(true)}
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Maximize2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`aspect-video rounded overflow-hidden border-2 transition ${
                selectedImage === index ? "border-primary" : "border-transparent"
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover hover:scale-110 transition-transform"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-screen-xl p-0">
          <img
            src={images[selectedImage]}
            alt={roomName}
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
