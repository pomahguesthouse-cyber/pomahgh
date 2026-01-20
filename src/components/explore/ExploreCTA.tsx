import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bed } from "lucide-react";
import { useHotelSettings } from "@/hooks/shared/useHotelSettings";

export const ExploreCTA = () => {
  const { settings } = useHotelSettings();

  return (
    <section className="py-20 px-4 bg-primary/5">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Bed className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Siap Menjelajahi Semarang?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Nikmati penginapan nyaman di {settings?.hotel_name || "Pomah Guesthouse"} 
            sebagai basecamp untuk petualangan Anda di Semarang. Lokasi strategis dengan akses mudah ke berbagai destinasi wisata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/#rooms">
              <Button size="lg" className="w-full sm:w-auto">
                Lihat Kamar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};












