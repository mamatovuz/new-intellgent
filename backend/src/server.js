import { createApp } from "./app.js";
import { config } from "./config.js";
import { startBot } from "./bot.js";
import { testMongoConnection } from "./mongo-db.js";
import { ensureMongoSeed } from "./mongo-seed.js";
import { applySupabaseSchema, getSupabasePool, testSupabaseConnection } from "./supabase-db.js";
import { migrateSqliteDataToSupabase } from "./supabase-migrate-data.js";
import { migrate, seed } from "./db.js";

const app = createApp();

async function bootstrap() {
  if (config.dbProvider === "postgres") {
    try {
      await applySupabaseSchema();
      const result = await testSupabaseConnection();
      console.log(`Postgres ulanish tayyor: ${result.now}`);

      const existingUsers = await getSupabasePool().query(`SELECT COUNT(*)::int as count FROM users`);
      const userCount = Number(existingUsers.rows[0]?.count || 0);
      if (userCount === 0) {
        console.log("Mahalliy SQLite tayyorlanmoqda...");
        migrate();
        seed();
        console.log("Postgres bo'sh. SQLite ma'lumotlari avtomatik ko'chirilmoqda...");
        await migrateSqliteDataToSupabase();
        console.log("SQLite ma'lumotlari Postgresga ko'chirildi.");
      }
    } catch (error) {
      console.error("Postgres ulanish xatosi:", error.message || error);
      process.exit(1);
    }
  } else if (config.dbProvider === "mongodb") {
    try {
      const result = await testMongoConnection();
      console.log(`MongoDB ulanish tayyor: ${result.host}/${result.name}`);
      await ensureMongoSeed();
    } catch (error) {
      console.error("MongoDB ulanish xatosi:", error.message || error);
      process.exit(1);
    }
  }

  app.listen(config.port, () => {
    console.log(`Intelligent backend ishga tushdi: http://localhost:${config.port}`);
    console.log(`DB provider: ${config.dbProvider}`);
  });

  startBot();
}

bootstrap();
