import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import { config } from "./config.js";

let poolInstance = null;
const runtimeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isMysqlEngine() {
  return config.dbEngine === "mysql";
}

function getConnectionString() {
  return config.databaseUrl || config.mysqlUrl || "";
}

function normalizeSqlForMysql(text = "") {
  let sql = String(text || "");

  sql = sql.replace(/\$(\d+)(::[a-z_]+)?/gi, "?");
  sql = sql.replace(/\bILIKE\b/gi, "LIKE");
  sql = sql.replace(/::int\b/gi, "");
  sql = sql.replace(/::date\b/gi, "");
  sql = sql.replace(/::numeric\b/gi, "");
  sql = sql.replace(/::timestamp\b/gi, "");
  sql = sql.replace(/\s+as\s+"([^"]+)"/gi, " AS $1");
  sql = sql.replace(/\bTRUE\b/gi, "TRUE");
  sql = sql.replace(/\bFALSE\b/gi, "FALSE");

  sql = sql.replace(/CURRENT_DATE\s*-\s*INTERVAL\s*'(\d+)\s+day'/gi, "DATE_SUB(CURRENT_DATE, INTERVAL $1 DAY)");
  sql = sql.replace(/([a-z_][a-z0-9_\.]*)::date/gi, "DATE($1)");
  sql = sql.replace(/TO_CHAR\(DATE_TRUNC\('month',\s*([a-z_][a-z0-9_\.]*)\),\s*'YYYY-MM'\)/gi, "DATE_FORMAT($1, '%Y-%m')");
  sql = sql.replace(/DATE_TRUNC\('month',\s*([a-z_][a-z0-9_\.]*)\)\s*=\s*DATE_TRUNC\('month',\s*([a-z_][a-z0-9_\.]*)\)/gi, "DATE_FORMAT($1, '%Y-%m') = DATE_FORMAT($2, '%Y-%m')");

  sql = sql.replace(/COUNT\(\*\)\s+FILTER\s*\(\s*WHERE\s+(.+?)\s*\)::int/gi, "SUM(CASE WHEN $1 THEN 1 ELSE 0 END)");
  sql = sql.replace(/COUNT\(DISTINCT\s+([a-z_][a-z0-9_\.]*)\)\s+FILTER\s*\(\s*WHERE\s+(.+?)\s*\)::int/gi, "COUNT(DISTINCT CASE WHEN $2 THEN $1 END)");

  sql = sql.replace(/ON CONFLICT\s*\(\s*student_id\s*,\s*lesson_date\s*\)\s*DO UPDATE SET status = excluded\.status,\s*teacher_id = excluded\.teacher_id/gi,
    "ON DUPLICATE KEY UPDATE status = VALUES(status), teacher_id = VALUES(teacher_id)");
  sql = sql.replace(/ON CONFLICT\s*\(\s*key\s*\)\s*DO UPDATE SET value = excluded\.value,\s*updated_at = excluded\.updated_at/gi,
    "ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)");
  sql = sql.replace(/ON CONFLICT\s*\(\s*key\s*\)\s*DO UPDATE SET value = EXCLUDED\.value,\s*updated_at = EXCLUDED\.updated_at/gi,
    "ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)");

  return sql;
}

function stripReturningId(sql = "") {
  return sql.replace(/\s+RETURNING\s+id\s*$/i, "");
}

async function runMysqlQuery(executor, text, params = []) {
  const originalSql = String(text || "").trim();
  const normalizedSql = normalizeSqlForMysql(originalSql);

  if (/^BEGIN$/i.test(originalSql) || /^COMMIT$/i.test(originalSql) || /^ROLLBACK$/i.test(originalSql)) {
    await executor.query(normalizedSql);
    return { rows: [] };
  }

  const expectsReturningId = /\bRETURNING\s+id\b/i.test(originalSql);
  const sql = expectsReturningId ? stripReturningId(normalizedSql) : normalizedSql;
  const [rows] = await executor.query(sql, params);

  if (expectsReturningId) {
    const insertId = Number(rows?.insertId || 0);
    return { rows: [{ id: insertId }] };
  }

  if (Array.isArray(rows)) {
    return { rows };
  }

  return { rows: [] };
}

function createMysqlPoolWrapper(pool) {
  return {
    async query(text, params = []) {
      return runMysqlQuery(pool, text, params);
    },
    async connect() {
      const connection = await pool.getConnection();
      return {
        async query(text, params = []) {
          return runMysqlQuery(connection, text, params);
        },
        release() {
          connection.release();
        }
      };
    }
  };
}

function getPool() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("SQL ulanish URL topilmadi. DATABASE_URL yoki POSTGRES_URL/MYSQL_URL env ga yozing.");
  }

  if (!poolInstance) {
    if (isMysqlEngine()) {
      const mysqlPool = mysql.createPool(connectionString);
      poolInstance = createMysqlPoolWrapper(mysqlPool);
    } else {
      poolInstance = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });
    }
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

function getSchemaPath() {
  return isMysqlEngine()
    ? path.join(runtimeRoot, "mysql", "schema.sql")
    : path.join(runtimeRoot, "supabase", "schema.sql");
}

export async function applySupabaseSchema() {
  const pool = getPool();
  const schemaPath = getSchemaPath();
  const rawSchema = fs.readFileSync(schemaPath, "utf8");
  const statements = rawSchema
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
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
