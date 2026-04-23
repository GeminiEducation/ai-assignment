import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
    // ✅ ADD THIS BLOCK
  build: {
    chunkSizeWarningLimit: 1000, // optional (avoid warning spam)

    rollupOptions: {
      output: {
        manualChunks: {
          // split heavy libs
          pdf: ["pdfjs-dist"],
          canvas: ["html2canvas"],

          // split UI libs
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-toast"
          ],

          // split vendor libs
          vendor: ["react", "react-dom"],

          // supabase separate
          supabase: ["@supabase/supabase-js"]
        },
      },
    },
  },
}));

