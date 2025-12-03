import { motion } from "framer-motion";

export const ExploreIntro = () => {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Selamat Datang di Semarang
          </h2>
          <div className="prose prose-lg mx-auto text-muted-foreground">
            <p>
              Semarang, ibukota Jawa Tengah, adalah kota yang memadukan pesona masa lalu dengan dinamika modern. 
              Dikenal dengan julukan <strong>"Little Netherlands"</strong> karena bangunan-bangunan kolonial Belanda 
              yang masih terjaga di kawasan Kota Lama, Semarang menawarkan pengalaman wisata yang unik dan tak terlupakan.
            </p>
            <p className="mt-4">
              Dari landmark bersejarah seperti <strong>Lawang Sewu</strong> dan kelenteng kuno <strong>Sam Poo Kong</strong>, 
              hingga kuliner legendaris seperti <strong>Lumpia</strong> dan <strong>Bandeng Presto</strong>, 
              setiap sudut kota ini menyimpan cerita dan cita rasa yang khas. 
              Ditambah dengan keindahan alam seperti pantai dan perbukitan di sekitarnya, 
              Semarang adalah destinasi sempurna untuk wisatawan yang mencari pengalaman autentik Indonesia.
            </p>
          </div>
        </motion.div>
        
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12"
        >
          {[
            { value: "500+", label: "Tahun Sejarah" },
            { value: "1.6M+", label: "Penduduk" },
            { value: "50+", label: "Destinasi Wisata" },
            { value: "100+", label: "Kuliner Khas" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-sm mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
