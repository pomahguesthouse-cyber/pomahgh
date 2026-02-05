 import { useRef } from "react";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
 import { OptimizedImage } from "@/components/ui/optimized-image";
 import { Button } from "@/components/ui/button";
 import { Users, Sparkles } from "lucide-react";
 import Autoplay from "embla-carousel-autoplay";
 import { Link } from "react-router-dom";
 
 interface RoomData {
   id: string;
   name: string;
   slug: string;
   price_per_night: number | null;
   image_url: string | null;
   description: string | null;
   max_guests: number | null;
 }
 
 export function LandingRoomSlider() {
   const autoplayPlugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));
 
   const { data: rooms, isLoading } = useQuery<RoomData[]>({
     queryKey: ["rooms-landing-slider"],
     queryFn: async (): Promise<RoomData[]> => {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const query = supabase
         .from("rooms")
         .select("id, name, slug, price_per_night, image_url, description, max_guests") as any;
       
       const { data, error } = await query
         .eq("is_active", true)
         .order("display_order")
         .limit(6);
       
       if (error) throw error;
       return (data as RoomData[]) || [];
     },
   });
 
   if (isLoading) {
     return (
       <div className="py-12 text-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
       </div>
     );
   }
 
   if (!rooms || rooms.length === 0) return null;
 
   return (
     <div className="w-full">
       <Carousel
         opts={{
           align: "start",
           loop: true,
           dragFree: true,
         }}
         plugins={[autoplayPlugin.current]}
         className="w-full"
       >
         <CarouselContent className="-ml-2 md:-ml-4">
           {rooms.map((room) => (
             <CarouselItem key={room.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
               <Link 
                 to={`/rooms/${room.slug}`}
                 className="group block h-full"
               >
                 <div className="relative h-full rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                   {/* Image */}
                   <div className="aspect-[4/3] overflow-hidden">
                     {room.image_url ? (
                       <OptimizedImage
                         src={room.image_url}
                         alt={room.name}
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                         context="room"
                       />
                     ) : (
                       <div className="w-full h-full bg-muted flex items-center justify-center">
                         <span className="text-muted-foreground">No image</span>
                       </div>
                     )}
                     
                     {/* Price Badge */}
                     <div className="absolute top-4 right-4">
                       <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                         Rp {room.price_per_night?.toLocaleString("id-ID")}
                         <span className="text-xs font-normal opacity-80">/mlm</span>
                       </div>
                     </div>
                   </div>
                   
                   {/* Content */}
                   <div className="p-5">
                     <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                       {room.name}
                     </h3>
                     
                     {room.description && (
                       <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                         {room.description}
                       </p>
                     )}
                     
                     {/* Features */}
                     <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                       {room.max_guests && (
                         <div className="flex items-center gap-1">
                           <Users className="h-3.5 w-3.5" />
                           <span>{room.max_guests} tamu</span>
                         </div>
                       )}
                       <div className="flex items-center gap-1 text-primary">
                         <Sparkles className="h-3.5 w-3.5" />
                         <span>Lihat Detail</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </Link>
             </CarouselItem>
           ))}
         </CarouselContent>
 
         <CarouselPrevious className="hidden md:flex -left-4 bg-background/80 backdrop-blur-sm shadow-lg hover:shadow-xl border-border/50" />
         <CarouselNext className="hidden md:flex -right-4 bg-background/80 backdrop-blur-sm shadow-lg hover:shadow-xl border-border/50" />
       </Carousel>
 
       {/* View All Button */}
       <div className="text-center mt-8">
         <Button variant="outline" size="lg" asChild className="gap-2">
           <Link to="/#rooms">
             Lihat Semua Kamar
           </Link>
         </Button>
       </div>
     </div>
   );
 }