import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react", 
      "react-dom",
      "@tanstack/react-query",
      "zustand",
      "immer",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
  },
  optimizeDeps: {
    include: [
      "react", 
      "react-dom", 
      "recharts",
      "@tanstack/react-query",
      "zustand",
      "immer",
      "framer-motion",
      "date-fns",
      "lucide-react",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Heavy libraries — already dynamic-imported, ensure separate chunks
          if (id.includes('html2pdf')) return 'vendor-pdf';
          if (id.includes('/xlsx')) return 'vendor-xlsx';

          // Charts + D3 deps
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';

          // Animation (separate from Radix primitives)
          if (id.includes('framer-motion')) return 'vendor-animation';

          // Radix UI primitives (all packages grouped)
          if (id.includes('@radix-ui')) return 'vendor-radix';

          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod')) return 'vendor-forms';

          // Date utilities
          if (id.includes('date-fns')) return 'vendor-date';

          // Supabase client
          if (id.includes('@supabase')) return 'vendor-supabase';

          // Drag & drop
          if (id.includes('@dnd-kit')) return 'vendor-dnd';

          // Carousel
          if (id.includes('embla-carousel')) return 'vendor-carousel';

          // DOMPurify (shared sanitizer)
          if (id.includes('dompurify')) return 'vendor-sanitize';
        },
      },
    },
  },
}));

