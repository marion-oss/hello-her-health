CREATE TABLE IF NOT EXISTS waitlist (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  user_agent TEXT
);
