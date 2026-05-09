import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { config } from "./config.js";

let poolInstance = null;
const runtimeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function getPool() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL kiritilmagan. Supabase Transaction Pooler ulanishini env ga yozing.");
  }

  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
  }

  return poolInstance;
}

export function getSupabasePool() {
  return getPool();
}

export async function testSupabaseConnection() {
  const pool = getPool();
  const result = await pool.query("SELECT NOW() as now");
  return result.rows[0];
}

export async function applySupabaseSchema() {
  const pool = getPool();
  const schemaPath = path.join(runtimeRoot, "supabase", "schema.sql");
  const rawSchema = fs.readFileSync(schemaPath, "utf8");
  const statements = rawSchema
    .split(/;\s*\n/g)
    .map(statement => statement.trim())
    .filter(Boolean);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
