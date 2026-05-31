CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT,
  phone TEXT,
  monthly_salary NUMERIC NOT NULL DEFAULT 0,
  role TEXT NOT NULL,
  telegram_id TEXT,
  profile_image TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  monthly_fee NUMERIC NOT NULL,
  schedule TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
  teacher_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at DATE,
  trial_required INTEGER NOT NULL DEFAULT 3,
  payment_due_date DATE,
  last_payment_date DATE,
  billing_start_date DATE,
  group_schedule TEXT,
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  external_id TEXT,
  received_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(student_id, lesson_date)
);

CREATE TABLE IF NOT EXISTS telegram_links (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS student_history (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  target_role TEXT,
  target_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP NOT NULL,
  read_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_course_assignments (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(teacher_id, course_id)
);

CREATE TABLE IF NOT EXISTS student_auth (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  access_token TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_tokens (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS developer_profiles (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  role_title TEXT NOT NULL,
  short_bio TEXT,
  bio TEXT,
  skills JSONB,
  image TEXT,
  banner_image TEXT,
  certificate_image TEXT,
  telegram_url TEXT,
  instagram_url TEXT,
  github_url TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL,
  read_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminder_dispatches (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  dispatch_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(student_id, reminder_type, dispatch_date)
);

CREATE INDEX IF NOT EXISTS idx_student_auth_access_token ON student_auth(access_token);

ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS developer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reminder_dispatches ENABLE ROW LEVEL SECURITY;
