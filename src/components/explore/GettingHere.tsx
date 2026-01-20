import { motion } from "framer-motion";
import { Plane, Train, Car, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useHotelSettings } from "@/hooks/useHotelSettings";

const transportModes = [
  {
    icon: Plane,
    title: "Dari Bandara Ahmad Yani",
    description: "Bandara internasional Semarang berjarak sekitar 6 km dari pusat kota. Tersedia taksi, ojek online, dan bus damri.",
    time: "20-30 menit",
  },
  {
    icon: Train,
    title: "Dari Stasiun Tawang",
    description: "Stasiun kereta api utama Semarang yang terhubung dengan kota-kota besar di Jawa. Terletak di kawasan Kota Lama.",
    time: "10-15 menit",
  },
  {
    icon: Car,
    title: "Dari Terminal Terboyo",
    description: "Terminal bus antar kota yang melayani rute dari berbagai kota di Jawa Tengah dan sekitarnya.",
    time: "25-35 menit",
  },
];

export const GettingHere = () => {
  const { settings } = useHotelSettings();

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Cara Menuju {settings?.hotel_name || "Pomah Guesthouse"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Akses mudah dari berbagai moda transportasi
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {transportModes.map((mode, index) => {
            const Icon = mode.icon;
            return (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">
                      {mode.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {mode.description}
                    </p>
                    <div className="flex items-center gap-1 text-primary font-medium text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>~{mode.time} ke hotel</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        
        {/* Hotel Address */}
        {settings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-primary/5 rounded-2xl p-8 text-center"
          >
            <MapPin className="h-8 w-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-xl text-foreground mb-2">
              {settings.hotel_name}
            </h3>
            <p className="text-muted-foreground">
              {settings.address}, {settings.city}, {settings.state} {settings.postal_code}
            </p>
            {settings.whatsapp_number && (
              <p className="text-primary mt-2">
                WhatsApp: {settings.whatsapp_number}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};
