CREATE TABLE IF NOT EXISTS branches (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username VARCHAR(255) UNIQUE,
  password_hash TEXT,
  phone VARCHAR(255),
  monthly_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  role VARCHAR(64) NOT NULL,
  telegram_id VARCHAR(255),
  profile_image TEXT,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  branch_id BIGINT NULL,
  title TEXT NOT NULL,
  monthly_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  schedule TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_courses_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  course_id BIGINT NULL,
  teacher_id BIGINT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(64) NOT NULL DEFAULT 'active',
  enrolled_at DATE NULL,
  trial_required INT NOT NULL DEFAULT 3,
  payment_due_date DATE NULL,
  last_payment_date DATE NULL,
  billing_start_date DATE NULL,
  group_schedule TEXT,
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_students_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  CONSTRAINT fk_students_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  external_id VARCHAR(255),
  received_by_user_id BIGINT NULL,
  reason TEXT,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_received_by FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  teacher_id BIGINT NOT NULL,
  lesson_date DATE NOT NULL,
  status VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_attendance_student_lesson (student_id, lesson_date),
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS telegram_links (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  phone VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_telegram_links_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  actor_user_id BIGINT NULL,
  action VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  details TEXT,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_student_history_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_history_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_role VARCHAR(64) NULL,
  target_user_id BIGINT NULL,
  type VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSON NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'unread',
  created_at DATETIME NOT NULL,
  read_at DATETIME NULL,
  CONSTRAINT fk_notifications_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(191) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_course_assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  teacher_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_teacher_course (teacher_id, course_id),
  CONSTRAINT fk_teacher_course_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_course_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_auth (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL UNIQUE,
  phone VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_student_auth_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qr_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  student_id BIGINT NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_qr_tokens_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS developer_profiles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INT NULL,
  role_title VARCHAR(255) NOT NULL,
  short_bio TEXT,
  bio TEXT,
  skills JSON NULL,
  image TEXT,
  banner_image TEXT,
  certificate_image TEXT,
  telegram_url TEXT,
  instagram_url TEXT,
  github_url TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL,
  read_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  teacher_id BIGINT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_complaint_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_complaint_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reminder_dispatches (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  reminder_type VARCHAR(128) NOT NULL,
  dispatch_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_reminder_dispatch (student_id, reminder_type, dispatch_date),
  CONSTRAINT fk_reminder_dispatch_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_student_auth_access_token ON student_auth(access_token);
