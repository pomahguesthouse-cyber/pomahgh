import { motion } from "framer-motion";

export const ExploreIntro = () => {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Selamat Datang di Semarang</h2>
          <div className="prose prose-lg mx-auto text-muted-foreground">
            <p>Semarang, ibukota Jawa Tengah, adalah kota yang memadukan pesona masa lalu dengan dinamika modern.</p>
            <p className="mt-4">Dari landmark bersejarah seperti <strong>Lawang Sewu</strong> dan kelenteng kuno <strong>Sam Poo Kong</strong>, hingga kuliner legendaris.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
