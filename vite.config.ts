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
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@radix-ui")) {
              return "vendor-ui";
            }
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/react-router/") ||
              id.includes("/node_modules/react-router-dom/")
            ) {
              return "vendor-react";
            }
            if (id.includes("@tanstack/react-query") || id.includes("zustand") || id.includes("immer")) {
              return "vendor-state";
            }
            if (id.includes("recharts") || id.includes("xlsx") || id.includes("html2pdf.js")) {
              return "vendor-reports";
            }
            if (id.includes("@dnd-kit") || id.includes("fabric")) {
              return "vendor-editor";
            }
            if (id.includes("@supabase/supabase-js")) {
              return "vendor-supabase";
            }
          }

          return undefined;
        },
      },
    },
  },
}));

