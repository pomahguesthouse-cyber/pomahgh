import { icons, Circle, type LucideIcon } from "lucide-react";
import { useFacilities } from "@/hooks/useFacilities";
import { motion } from "framer-motion";

const LandingFacilityCard = ({
  icon,
  title,
  description,
  index,
}: {
  icon: string;
  title: string;
  description: string;
  index: number;
}) => {
  const IconComponent = (icons[icon as keyof typeof icons] as LucideIcon) || Circle;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      viewport={{ once: true }}
      className="flex flex-col items-center text-center p-4 sm:p-6 rounded-xl bg-card border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all"
    >
      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-primary/10 mb-3 sm:mb-4">
        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
      </div>
      <h3 className="text-sm sm:text-base md:text-lg font-bold text-foreground mb-1 sm:mb-2">
        {title}
      </h3>
      <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
};

const FacilitySkeleton = () => (
  <div className="animate-pulse p-6 rounded-xl bg-card border border-border/50">
    <div className="w-14 h-14 bg-muted rounded-full mx-auto mb-4" />
    <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-3" />
    <div className="h-3 bg-muted rounded w-5/6 mx-auto" />
  </div>
);

export const LandingFacilities = () => {
  const { data: facilities, isLoading, error } = useFacilities();

  if (error) return null;

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <FacilitySkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!facilities || facilities.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Fasilitas Penginapan
          </h2>
          <div className="h-1 w-20 bg-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Nikmati fasilitas lengkap yang dirancang untuk kenyamanan dan pengalaman menginap terbaik Anda
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {facilities.map((item, index) => (
            <LandingFacilityCard
              key={item.id}
              icon={item.icon_name}
              title={item.title}
              description={item.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
