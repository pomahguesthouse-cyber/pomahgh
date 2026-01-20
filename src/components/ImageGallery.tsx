import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Maximize2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface ImageGalleryProps {
  images: string[];
  roomName: string;
  has360Tour?: boolean;
}

export const ImageGallery = ({ images, roomName, has360Tour }: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-video rounded-lg overflow-hidden group">
        <OptimizedImage
          src={images[selectedImage]}
          alt={`${roomName} - Photo ${selectedImage + 1}`}
          width={1200}
          height={675}
          priority
          placeholder="blur"
          className="w-full h-full"
        />
        {has360Tour && (
          <Badge className="absolute top-4 left-4 bg-primary/90 text-primary-foreground backdrop-blur z-10">
            <RotateCw className="w-3 h-3 mr-1" />
            360° Available
          </Badge>
        )}
        <Button
          onClick={() => setLightboxOpen(true)}
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
              <OptimizedImage
                src={image}
                alt={`Thumbnail ${index + 1}`}
                width={150}
                height={100}
                placeholder="skeleton"
                className="w-full h-full hover:scale-110 transition-transform"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-screen-xl p-0">
          <OptimizedImage
            src={images[selectedImage]}
            alt={roomName}
            width={1920}
            height={1080}
            priority
            placeholder="blur"
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
