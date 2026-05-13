import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Run `ANALYZE=true bun run build` to generate dist/stats.html
    process.env.ANALYZE === "true" &&
      visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
  ].filter(Boolean),
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
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // ── React runtime ───────────────────────────────────────────────
          // Stable across deploys → long-lived browser cache hit.
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/') ||
            id.includes('react-helmet-async')
          ) return 'vendor-react';

          // ── Data layer ──────────────────────────────────────────────────
          if (id.includes('@tanstack/react-query')) return 'vendor-query';

          // ── State management ────────────────────────────────────────────
          if (id.includes('zustand') || id.includes('immer')) return 'vendor-state';

          // ── Heavy admin-only: fabric canvas (~1.5 MB gzipped) ──────────
          // FloorPlanEditor is lazy-loaded; this chunk never ships to
          // public visitors.
          if (id.includes('/fabric')) return 'vendor-fabric';

          // ── 360° panorama viewer ────────────────────────────────────────
          // Already lazy-loaded via Panorama360Viewer wrapper.
          if (id.includes('pannellum')) return 'vendor-panorama';

          // ── Markdown processing ─────────────────────────────────────────
          // LandingPage already lazy()'s react-markdown; admin pages are
          // lazy routes — this chunk is never in the critical path.
          if (
            id.includes('react-markdown') ||
            id.includes('remark') ||
            id.includes('rehype') ||
            id.includes('unified') ||
            id.includes('micromark') ||
            id.includes('mdast-util') ||
            id.includes('vfile') ||
            id.includes('hast-util')
          ) return 'vendor-markdown';

          // ── xlsx (admin export, already dynamic-imported) ───────────────
          if (id.includes('/xlsx')) return 'vendor-xlsx';

          // ── Charts + D3 ─────────────────────────────────────────────────
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';

          // ── Animation ───────────────────────────────────────────────────
          if (id.includes('framer-motion')) return 'vendor-animation';

          // ── Radix UI primitives ─────────────────────────────────────────
          if (id.includes('@radix-ui')) return 'vendor-radix';

          // ── Form handling ───────────────────────────────────────────────
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod')) return 'vendor-forms';

          // ── Date utilities ──────────────────────────────────────────────
          if (id.includes('date-fns')) return 'vendor-date';

          // ── Supabase client ─────────────────────────────────────────────
          if (id.includes('@supabase')) return 'vendor-supabase';

          // ── Drag & drop ─────────────────────────────────────────────────
          if (id.includes('@dnd-kit')) return 'vendor-dnd';

          // ── Carousel ────────────────────────────────────────────────────
          if (id.includes('embla-carousel')) return 'vendor-carousel';

          // ── DOMPurify ───────────────────────────────────────────────────
          if (id.includes('dompurify')) return 'vendor-sanitize';

          // ── Small UI utilities ──────────────────────────────────────────
          if (
            id.includes('sonner') ||
            id.includes('/vaul/') ||
            id.includes('/cmdk/') ||
            id.includes('next-themes') ||
            id.includes('input-otp') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('clsx')
          ) return 'vendor-ui';
        },
      },
    },
  },
}));

