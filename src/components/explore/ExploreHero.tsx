import { motion } from "framer-motion";
import { MapPin, Compass } from "lucide-react";
import { useContext } from "react";
import { EditorModeContext } from "@/contexts/EditorModeContext";
import { EditableText } from "@/components/admin/editor-mode/EditableText";
import { usePublicOverrides } from "@/contexts/PublicOverridesContext";

export const ExploreHero = () => {
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? false;
  const { getElementStyles } = usePublicOverrides();

  return (
    <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1920&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <Compass className="h-6 w-6 text-primary" />
          <span className="text-primary font-medium tracking-wider uppercase text-sm">
            Discover
          </span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {isEditorMode ? (
            <EditableText
              widgetId="explore-hero"
              field="title"
              value="Explore Semarang"
              as="h1"
              className="text-4xl md:text-6xl lg:text-7xl font-cinzel font-semibold text-white mb-6"
            />
          ) : (
            <h1 
              className="text-4xl md:text-6xl lg:text-7xl font-cinzel font-semibold text-white mb-6"
              style={getElementStyles('explore-hero-title')}
            >
              Explore Semarang
            </h1>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {isEditorMode ? (
            <EditableText
              widgetId="explore-hero"
              field="description"
              value="Temukan keindahan ibukota Jawa Tengah — dari bangunan bersejarah hingga kuliner legendaris"
              as="p"
              className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto"
            />
          ) : (
            <p 
              className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto"
              style={getElementStyles('explore-hero-description')}
            >
              Temukan keindahan ibukota Jawa Tengah — dari bangunan bersejarah hingga kuliner legendaris
            </p>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center justify-center gap-2 text-white/80"
        >
          <MapPin className="h-5 w-5" />
          <span>Semarang, Jawa Tengah, Indonesia</span>
        </motion.div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2"
        >
          <div className="w-1 h-2 bg-white/70 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};
