import { Link } from "react-router-dom";
import { useCityEvents } from "@/hooks/useCityEvents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, ArrowRight, Star } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const UpcomingEvents = () => {
  const { upcomingEvents, isLoadingUpcoming } = useCityEvents();

  const formatEventDate = (date: string, endDate?: string | null) => {
    const start = new Date(date);
    if (endDate) {
      const end = new Date(endDate);
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${format(start, "d", { locale: localeId })} - ${format(end, "d MMMM yyyy", { locale: localeId })}`;
      }
      return `${format(start, "d MMM", { locale: localeId })} - ${format(end, "d MMM yyyy", { locale: localeId })}`;
    }
    return format(start, "d MMMM yyyy", { locale: localeId });
  };

  if (isLoadingUpcoming) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (upcomingEvents.length === 0) {
    return null;
  }

  // Show max 6 events
  const displayEvents = upcomingEvents.slice(0, 6);

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Event Mendatang
            </h2>
            <p className="text-muted-foreground">
              Jangan lewatkan berbagai acara menarik di Semarang
            </p>
          </div>
          {upcomingEvents.length > 6 && (
            <Button variant="ghost" className="hidden md:flex items-center gap-2">
              Lihat Semua
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayEvents.map((event) => (
            <Link 
              key={event.id} 
              to={`/events/${event.slug}`}
              className="group"
            >
              <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300">
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.image_alt || event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Calendar className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  
                  {/* Date badge */}
                  <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 text-center shadow-md">
                    <div className="text-2xl font-bold text-primary leading-none">
                      {format(new Date(event.event_date), "d")}
                    </div>
                    <div className="text-xs uppercase font-medium text-muted-foreground">
                      {format(new Date(event.event_date), "MMM", { locale: localeId })}
                    </div>
                  </div>

                  {/* Featured badge */}
                  {event.is_featured && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Unggulan
                      </Badge>
                    </div>
                  )}

                  {/* Category badge */}
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="capitalize backdrop-blur-sm">
                      {event.category}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {event.name}
                  </h3>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatEventDate(event.event_date, event.event_end_date)}</span>
                    </div>

                    {event.event_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{event.event_time}</span>
                      </div>
                    )}

                    {event.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">{event.venue}</span>
                      </div>
                    )}
                  </div>

                  {event.price_range && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-sm font-medium text-primary">
                        {event.price_range}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {upcomingEvents.length > 6 && (
          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" className="w-full">
              Lihat Semua Event
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingEvents;
