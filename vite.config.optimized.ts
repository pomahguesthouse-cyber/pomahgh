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
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx', 'class-variance-authority'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          state: ['zustand', 'immer'],
          motion: ['framer-motion'],
          editor: ['fabric', 'html2pdf.js', 'xlsx'],
          tours: ['pannellum-react'],
          markdown: ['react-markdown', 'dompurify'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));