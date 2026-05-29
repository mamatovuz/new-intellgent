import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, seed } from "./db.js";
import { config } from "./config.js";
import router from "./routes.js";

const runtimeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function createApp() {
  if (config.dbProvider === "sqlite") {
    migrate();
    seed();
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "12mb" }));
  app.use("/uploads", express.static(path.join(runtimeRoot, "uploads")));
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send([
      "User-agent: *",
      "Allow: /",
      "",
      "Sitemap: https://ilm-nest.uz/sitemap.xml"
    ].join("\n"));
  });
  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ilm-nest.uz/</loc>
    <lastmod>2026-05-29</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ilm-nest.uz/dasturchilar</loc>
    <lastmod>2026-05-29</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);
  });
  app.use("/api", router);
  return app;
}
