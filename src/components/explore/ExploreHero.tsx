import { motion } from "framer-motion";
import { MapPin, Compass } from "lucide-react";

export const ExploreHero = () => {
  return (
    <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1920&q=80')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center justify-center gap-2 mb-4">
          <Compass className="h-6 w-6 text-primary" />
          <span className="text-primary font-medium tracking-wider uppercase text-sm">Discover</span>
        </motion.div>
        
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-cinzel font-semibold text-white mb-6">
          Explore Semarang
        </motion.h1>
        
        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Temukan keindahan ibukota Jawa Tengah — dari bangunan bersejarah hingga kuliner legendaris
        </motion.p>
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex items-center justify-center gap-2 text-white/80">
          <MapPin className="h-5 w-5" />
          <span>Semarang, Jawa Tengah, Indonesia</span>
        </motion.div>
      </div>
    </section>
  );
};
