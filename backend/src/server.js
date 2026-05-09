import { createApp } from "./app.js";
import { config } from "./config.js";
import { startBot } from "./bot.js";
import { testSupabaseConnection } from "./supabase-db.js";

const app = createApp();

async function bootstrap() {
  if (config.dbProvider === "postgres") {
    try {
      const result = await testSupabaseConnection();
      console.log(`Postgres ulanish tayyor: ${result.now}`);
    } catch (error) {
      console.error("Postgres ulanish xatosi:", error.message || error);
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
