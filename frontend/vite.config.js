import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const port = Number(process.env.PORT || 5173);
const allowedHosts = [
  "localhost",
  "127.0.0.1",
  "ilm-nest.uz",
  "www.ilm-nest.uz",
  ".railway.app"
];

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port,
    allowedHosts
  },
  preview: {
    host: "0.0.0.0",
    port,
    allowedHosts
  }
});
