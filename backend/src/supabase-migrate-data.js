import path from "node:path";
import Database from "better-sqlite3";
import { Pool } from "pg";
import { config } from "./config.js";

const sqlitePath = path.resolve("backend", "data", "intelligent.db");

const TABLE_ORDER = [
  "branches",
  "users",
  "courses",
  "students",
  "payments",
  "attendance",
  "telegram_links",
  "student_history",
  "notifications",
  "settings",
  "teacher_course_assignments",
  "student_auth",
  "qr_tokens",
  "developer_profiles",
  "contact_requests",
  "reminder_dispatches"
];

const ID_TABLES = TABLE_ORDER.filter((tableName) => tableName !== "settings");

const BOOLEAN_COLUMNS = {
  courses: ["is_active"],
  students: ["is_registered", "is_archived"],
  telegram_links: ["used"],
  notifications: [],
  student_auth: [],
  qr_tokens: ["used"],
  developer_profiles: ["is_active"],
  contact_requests: [],
  reminder_dispatches: []
};

const JSON_COLUMNS = {
  notifications: ["metadata"],
  developer_profiles: ["skills"]
};

function normalizeValue(tableName, columnName, value) {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if ((BOOLEAN_COLUMNS[tableName] || []).includes(columnName)) {
    return Boolean(value);
  }

  if ((JSON_COLUMNS[tableName] || []).includes(columnName)) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

function buildInsertQuery(tableName, columns) {
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
}

async function resetSequences(pool) {
  for (const tableName of ID_TABLES) {
    await pool.query(
      `
        SELECT setval(
          pg_get_serial_sequence($1, 'id'),
          COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
          EXISTS (SELECT 1 FROM ${tableName})
        )
      `,
      [tableName]
    );
  }
}

async function migrateTable(pool, sqliteDb, tableName) {
  const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
  if (!rows.length) {
    console.log(`${tableName}: 0 ta qator`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const insertQuery = buildInsertQuery(tableName, columns);

  for (const row of rows) {
    const values = columns.map((columnName) =>
      normalizeValue(tableName, columnName, row[columnName])
    );
    await pool.query(insertQuery, values);
  }

  console.log(`${tableName}: ${rows.length} ta qator ko'chirildi`);
}

async function main() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL topilmadi. Supabase ulanishini env ga yozing.");
  }

  const sqliteDb = new Database(sqlitePath, { readonly: true });
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const tableList = TABLE_ORDER.join(", ");
    await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

    for (const tableName of TABLE_ORDER) {
      await migrateTable(pool, sqliteDb, tableName);
    }

    await resetSequences(pool);
    console.log("SQLite ma'lumotlari Supabase Postgres bazasiga ko'chirildi.");
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Supabase data migration xatosi:", error.message);
  process.exit(1);
});
