# Supabase migratsiya

Bu loyiha hozircha SQLite bilan ishlayapti, lekin Supabase/Postgres uchun poydevor qo'shildi.

## Kerakli env

`.env` ichiga yozing:

```env
DB_PROVIDER=postgres
DATABASE_URL=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
```

## Nima tayyor bo'ldi

- `backend/supabase/schema.sql`:
  Postgres uchun to'liq schema
- `backend/src/supabase-db.js`:
  Supabase Transaction Pooler ulanishi va schema apply helper
- `backend/src/config.js`:
  `DB_PROVIDER` va `DATABASE_URL` qo'llab-quvvatlaydi

## Muhim izoh

Backendning hozirgi biznes logikasi `better-sqlite3` va synchronous `db.prepare(...).get/run/all` uslubiga qattiq bog'langan.
Supabase/Postgres esa asynchronous ishlaydi. Shu sabab to'liq migratsiya uchun:

1. auth
2. services
3. routes

qatlamlari async query oqimiga ko'chirilishi kerak.

## Keyingi bosqichlar

1. `pg` dependency o'rnatish
2. Schema'ni Supabase'ga apply qilish
3. `db.js` va `services.js` qatlamini async Postgres querylarga ko'chirish
4. Seed va eski SQLite ma'lumotlarini import qilish
