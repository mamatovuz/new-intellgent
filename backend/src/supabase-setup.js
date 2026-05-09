import { applySupabaseSchema, testSupabaseConnection } from "./supabase-db.js";

async function main() {
  const connection = await testSupabaseConnection();
  console.log("Supabase connection ok:", connection.now);

  await applySupabaseSchema();
  console.log("Supabase schema muvaffaqiyatli qo'llandi.");
}

main().catch(error => {
  console.error("Supabase setup xatosi:", error.message);
  process.exit(1);
});
