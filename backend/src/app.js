import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, seed } from "./db.js";
import { config } from "./config.js";
import router from "./routes.js";

const runtimeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function createApp() {
  if (config.dbProvider !== "postgres") {
    migrate();
    seed();
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "12mb" }));
  app.use("/uploads", express.static(path.join(runtimeRoot, "uploads")));
  app.use("/api", router);
  return app;
}
