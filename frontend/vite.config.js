
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/SMART-FEEDBACK-ANALYZER/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:5000",
      "/logout": "http://127.0.0.1:5000"
    }
  }
});
