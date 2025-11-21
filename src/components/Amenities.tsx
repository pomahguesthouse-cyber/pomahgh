import * as Icons from "lucide-react";
import { Loader2 } from "lucide-react";
import { useFacilities } from "@/hooks/useFacilities";
import { motion } from "framer-motion";

// ---------- FacilityCard (modular) ----------
export const FacilityCard = ({ icon, title, description }) => {
  const IconComponent = Icons[icon] ?? Icons.Circle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center p-6 rounded-lg bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
        <IconComponent className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
};

// ---------- Skeleton Card ----------
export const FacilitySkeleton = () => (
  <div className="animate-pulse p-6 rounded-lg bg-card">
    <div className="w-14 h-14 bg-primary/10 rounded-full mx-auto mb-4" />
    <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-3" />
    <div className="h-3 bg-muted rounded w-5/6 mx-auto" />
  </div>
);

// ---------- Main Amenities Component ----------
export const Amenities = () => {
  const { data: facilities, isLoading, error } = useFacilities();

  const renderSkeletons = () => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {[1, 2, 3].map((i) => (
        <FacilitySkeleton key={i} />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <section id="amenities" className="py-20 px-4 bg-background">
        <div className="container mx-auto">{renderSkeletons()}</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 px-4 bg-background">
        <div className="text-center text-red-500 font-medium">Failed to load facilities. Please try again later.</div>
      </section>
    );
  }

  if (!facilities || facilities.length === 0) return null;

  return (
    <section id="amenities" className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Facilities</h2>
          <div className="w-24 h-1 bg-primary mx-auto mb-6" />
          <p className="text-base text-muted-foreground max-w-2xl mx-auto px-4">
            Indulge in world-class facilities designed to elevate your stay and create unforgettable memories.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {facilities.map((item) => (
            <FacilityCard key={item.id} icon={item.icon_name} title={item.title} description={item.description} />
          ))}
        </div>
      </div>
    </section>
  );
};
