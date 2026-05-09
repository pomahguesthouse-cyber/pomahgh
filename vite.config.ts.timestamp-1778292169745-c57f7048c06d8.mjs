// vite.config.ts
import { defineConfig } from "file:///sessions/loving-laughing-ptolemy/mnt/pomahgh/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/loving-laughing-ptolemy/mnt/pomahgh/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///sessions/loving-laughing-ptolemy/mnt/pomahgh/node_modules/lovable-tagger/dist/index.js";
import { visualizer } from "file:///sessions/loving-laughing-ptolemy/mnt/pomahgh/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "/sessions/loving-laughing-ptolemy/mnt/pomahgh";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Run `ANALYZE=true bun run build` to generate dist/stats.html
    process.env.ANALYZE === "true" && visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap"
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "zustand",
      "immer",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities"
    ]
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
      "lucide-react"
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/xlsx")) return "vendor-xlsx";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-animation";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("/zod")) return "vendor-forms";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@dnd-kit")) return "vendor-dnd";
          if (id.includes("embla-carousel")) return "vendor-carousel";
          if (id.includes("dompurify")) return "vendor-sanitize";
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvbG92aW5nLWxhdWdoaW5nLXB0b2xlbXkvbW50L3BvbWFoZ2hcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9sb3ZpbmctbGF1Z2hpbmctcHRvbGVteS9tbnQvcG9tYWhnaC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvbG92aW5nLWxhdWdoaW5nLXB0b2xlbXkvbW50L3BvbWFoZ2gvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gXCJyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXJcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcclxuICAgIC8vIFJ1biBgQU5BTFlaRT10cnVlIGJ1biBydW4gYnVpbGRgIHRvIGdlbmVyYXRlIGRpc3Qvc3RhdHMuaHRtbFxyXG4gICAgcHJvY2Vzcy5lbnYuQU5BTFlaRSA9PT0gXCJ0cnVlXCIgJiZcclxuICAgICAgdmlzdWFsaXplcih7XHJcbiAgICAgICAgZmlsZW5hbWU6IFwiZGlzdC9zdGF0cy5odG1sXCIsXHJcbiAgICAgICAgb3BlbjogZmFsc2UsXHJcbiAgICAgICAgZ3ppcFNpemU6IHRydWUsXHJcbiAgICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogXCJ0cmVlbWFwXCIsXHJcbiAgICAgIH0pLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICAgIGRlZHVwZTogW1xyXG4gICAgICBcInJlYWN0XCIsIFxyXG4gICAgICBcInJlYWN0LWRvbVwiLFxyXG4gICAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiLFxyXG4gICAgICBcInp1c3RhbmRcIixcclxuICAgICAgXCJpbW1lclwiLFxyXG4gICAgICBcIkBkbmQta2l0L2NvcmVcIixcclxuICAgICAgXCJAZG5kLWtpdC9zb3J0YWJsZVwiLFxyXG4gICAgICBcIkBkbmQta2l0L3V0aWxpdGllc1wiLFxyXG4gICAgXSxcclxuICB9LFxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogW1xyXG4gICAgICBcInJlYWN0XCIsIFxyXG4gICAgICBcInJlYWN0LWRvbVwiLCBcclxuICAgICAgXCJyZWNoYXJ0c1wiLFxyXG4gICAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiLFxyXG4gICAgICBcInp1c3RhbmRcIixcclxuICAgICAgXCJpbW1lclwiLFxyXG4gICAgICBcImZyYW1lci1tb3Rpb25cIixcclxuICAgICAgXCJkYXRlLWZuc1wiLFxyXG4gICAgICBcImx1Y2lkZS1yZWFjdFwiLFxyXG4gICAgXSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xyXG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAvLyBIZWF2eSBsaWJyYXJpZXMgXHUyMDE0IGFscmVhZHkgZHluYW1pYy1pbXBvcnRlZCwgZW5zdXJlIHNlcGFyYXRlIGNodW5rc1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcveGxzeCcpKSByZXR1cm4gJ3ZlbmRvci14bHN4JztcclxuXHJcbiAgICAgICAgICAvLyBDaGFydHMgKyBEMyBkZXBzXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlY2hhcnRzJykgfHwgaWQuaW5jbHVkZXMoJ2QzLScpKSByZXR1cm4gJ3ZlbmRvci1jaGFydHMnO1xyXG5cclxuICAgICAgICAgIC8vIEFuaW1hdGlvbiAoc2VwYXJhdGUgZnJvbSBSYWRpeCBwcmltaXRpdmVzKVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdmcmFtZXItbW90aW9uJykpIHJldHVybiAndmVuZG9yLWFuaW1hdGlvbic7XHJcblxyXG4gICAgICAgICAgLy8gUmFkaXggVUkgcHJpbWl0aXZlcyAoYWxsIHBhY2thZ2VzIGdyb3VwZWQpXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0ByYWRpeC11aScpKSByZXR1cm4gJ3ZlbmRvci1yYWRpeCc7XHJcblxyXG4gICAgICAgICAgLy8gRm9ybSBoYW5kbGluZ1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1ob29rLWZvcm0nKSB8fCBpZC5pbmNsdWRlcygnQGhvb2tmb3JtJykgfHwgaWQuaW5jbHVkZXMoJy96b2QnKSkgcmV0dXJuICd2ZW5kb3ItZm9ybXMnO1xyXG5cclxuICAgICAgICAgIC8vIERhdGUgdXRpbGl0aWVzXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2RhdGUtZm5zJykpIHJldHVybiAndmVuZG9yLWRhdGUnO1xyXG5cclxuICAgICAgICAgIC8vIFN1cGFiYXNlIGNsaWVudFxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAc3VwYWJhc2UnKSkgcmV0dXJuICd2ZW5kb3Itc3VwYWJhc2UnO1xyXG5cclxuICAgICAgICAgIC8vIERyYWcgJiBkcm9wXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BkbmQta2l0JykpIHJldHVybiAndmVuZG9yLWRuZCc7XHJcblxyXG4gICAgICAgICAgLy8gQ2Fyb3VzZWxcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZW1ibGEtY2Fyb3VzZWwnKSkgcmV0dXJuICd2ZW5kb3ItY2Fyb3VzZWwnO1xyXG5cclxuICAgICAgICAgIC8vIERPTVB1cmlmeSAoc2hhcmVkIHNhbml0aXplcilcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZG9tcHVyaWZ5JykpIHJldHVybiAndmVuZG9yLXNhbml0aXplJztcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KSk7XHJcblxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlULFNBQVMsb0JBQW9CO0FBQ3RWLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxrQkFBa0I7QUFKM0IsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUE7QUFBQSxJQUUxQyxRQUFRLElBQUksWUFBWSxVQUN0QixXQUFXO0FBQUEsTUFDVCxVQUFVO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixZQUFZO0FBQUEsTUFDWixVQUFVO0FBQUEsSUFDWixDQUFDO0FBQUEsRUFDTCxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ047QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUc7QUFHbEMsY0FBSSxHQUFHLFNBQVMsT0FBTyxFQUFHLFFBQU87QUFHakMsY0FBSSxHQUFHLFNBQVMsVUFBVSxLQUFLLEdBQUcsU0FBUyxLQUFLLEVBQUcsUUFBTztBQUcxRCxjQUFJLEdBQUcsU0FBUyxlQUFlLEVBQUcsUUFBTztBQUd6QyxjQUFJLEdBQUcsU0FBUyxXQUFXLEVBQUcsUUFBTztBQUdyQyxjQUFJLEdBQUcsU0FBUyxpQkFBaUIsS0FBSyxHQUFHLFNBQVMsV0FBVyxLQUFLLEdBQUcsU0FBUyxNQUFNLEVBQUcsUUFBTztBQUc5RixjQUFJLEdBQUcsU0FBUyxVQUFVLEVBQUcsUUFBTztBQUdwQyxjQUFJLEdBQUcsU0FBUyxXQUFXLEVBQUcsUUFBTztBQUdyQyxjQUFJLEdBQUcsU0FBUyxVQUFVLEVBQUcsUUFBTztBQUdwQyxjQUFJLEdBQUcsU0FBUyxnQkFBZ0IsRUFBRyxRQUFPO0FBRzFDLGNBQUksR0FBRyxTQUFTLFdBQVcsRUFBRyxRQUFPO0FBQUEsUUFDdkM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
