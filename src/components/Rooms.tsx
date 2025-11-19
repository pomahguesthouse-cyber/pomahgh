import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import deluxeRoom from "@/assets/room-deluxe.jpg";
import villaRoom from "@/assets/room-villa.jpg";

const rooms = [
  {
    id: 1,
    title: "Deluxe Ocean View",
    description: "Spacious room with panoramic ocean views, king-size bed, and private balcony. Perfect for couples seeking romance and tranquility.",
    image: deluxeRoom,
    features: ["King Bed", "Ocean View", "Private Balcony", "50 m²"],
  },
  {
    id: 2,
    title: "Private Pool Villa",
    description: "Ultimate luxury with your own private pool, outdoor living area, and traditional Balinese architecture. The perfect escape for exclusive relaxation.",
    image: villaRoom,
    features: ["Private Pool", "Outdoor Living", "Garden View", "120 m²"],
  },
];

export const Rooms = () => {
  return (
    <section id="rooms" className="py-20 px-4 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Our Accommodations
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose from our carefully designed rooms and villas, each offering a unique blend 
            of comfort, style, and breathtaking views.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={room.image}
                  alt={room.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {room.title}
                </h3>
                <p className="text-muted-foreground mb-4">{room.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {room.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <Button variant="luxury" className="w-full">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
