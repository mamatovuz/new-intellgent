import dotenv from "dotenv";

dotenv.config();

const rawDatabaseUrl = String(process.env.DATABASE_URL || "").trim();
const rawMongoUri = String(process.env.MONGODB_URI || "").trim();
const rawPostgresUrl = String(process.env.POSTGRES_URL || "").trim();
const rawMysqlUrl = String(process.env.MYSQL_URL || "").trim();
const rawDbProvider = String(process.env.DB_PROVIDER || "").trim().toLowerCase();

function detectProviderFromUrl(value = "") {
  const url = String(value || "").trim().toLowerCase();
  if (!url) return null;
  if (url.startsWith("mongodb://") || url.startsWith("mongodb+srv://")) return "mongodb";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) return "postgres";
  if (url.startsWith("mysql://") || url.startsWith("mysql2://")) return "mysql";
  if (url.startsWith("sqlite://") || url.endsWith(".db") || url.endsWith(".sqlite") || url.endsWith(".sqlite3")) {
    return "sqlite";
  }
  return null;
}

function resolveDatabaseConfig() {
  const candidates = [
    { provider: detectProviderFromUrl(rawDatabaseUrl), url: rawDatabaseUrl, source: "DATABASE_URL" },
    { provider: detectProviderFromUrl(rawMongoUri) || (rawMongoUri ? "mongodb" : null), url: rawMongoUri, source: "MONGODB_URI" },
    { provider: detectProviderFromUrl(rawPostgresUrl) || (rawPostgresUrl ? "postgres" : null), url: rawPostgresUrl, source: "POSTGRES_URL" },
    { provider: detectProviderFromUrl(rawMysqlUrl) || (rawMysqlUrl ? "mysql" : null), url: rawMysqlUrl, source: "MYSQL_URL" }
  ];

  const detected = candidates.find((item) => item.provider && item.url);
  const provider = rawDbProvider || detected?.provider || "sqlite";

  return {
    provider,
    source: rawDbProvider ? "DB_PROVIDER" : detected?.source || "sqlite fallback",
    url: detected?.url || "",
    databaseUrl:
      provider === "postgres"
        ? rawPostgresUrl || (detectProviderFromUrl(rawDatabaseUrl) === "postgres" ? rawDatabaseUrl : "")
        : "",
    mongoUri:
      provider === "mongodb"
        ? rawMongoUri || (detectProviderFromUrl(rawDatabaseUrl) === "mongodb" ? rawDatabaseUrl : "")
        : rawMongoUri,
    mysqlUrl:
      provider === "mysql"
        ? rawMysqlUrl || (detectProviderFromUrl(rawDatabaseUrl) === "mysql" ? rawDatabaseUrl : "")
        : rawMysqlUrl
  };
}

const databaseConfig = resolveDatabaseConfig();
const dbEngine = databaseConfig.provider;
const dbProvider = dbEngine === "mysql" ? "postgres" : dbEngine;

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change_me",
  webUrl: process.env.WEB_URL || "http://localhost:5173",
  dbProvider,
  dbEngine,
  dbProviderSource: databaseConfig.source,
  databaseUrl: databaseConfig.databaseUrl,
  mongoUri: databaseConfig.mongoUri,
  mysqlUrl: databaseConfig.mysqlUrl,
  mongoDbName: process.env.MONGODB_DB_NAME || "ilmnest",
  botEnabled: process.env.BOT_ENABLED !== "false",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "@your_bot_username"
};
