-- Foldify schema. Raw SQL, no ORM.
--
-- Every table uses CREATE TABLE IF NOT EXISTS so this file can be executed on
-- every boot. Foreign keys are only enforced because db/index.ts turns them on
-- with `PRAGMA foreign_keys = ON` — SQLite has them OFF by default, which makes
-- every REFERENCES clause below decorative without it.
--
-- There is deliberately NO cart table. The cart lives in localStorage on the
-- client; only a completed order reaches the database.

-- ---------------------------------------------------------------- users

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ------------------------------------------------------------- sessions

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT    NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- ----------------------------------------------------------- categories

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT
);

-- ------------------------------------------------------------- products

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  -- Money is stored in minor units (paisa) as an integer. Never a float.
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency    TEXT    NOT NULL DEFAULT 'NPR' CHECK (currency IN ('NPR')),
  image_url   TEXT,
  category_id INTEGER NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  difficulty  TEXT    NOT NULL DEFAULT 'beginner'
                      CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_is_published ON products (is_published);
CREATE INDEX IF NOT EXISTS idx_products_difficulty ON products (difficulty);

-- ------------------------------------------------------------ tutorials

CREATE TABLE IF NOT EXISTS tutorials (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT    NOT NULL UNIQUE,
  title             TEXT    NOT NULL,
  summary           TEXT    NOT NULL DEFAULT '',
  difficulty        TEXT    NOT NULL DEFAULT 'beginner'
                            CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_minutes INTEGER NOT NULL DEFAULT 10 CHECK (estimated_minutes > 0),
  cover_image_url   TEXT,
  is_published      INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tutorials_slug ON tutorials (slug);
CREATE INDEX IF NOT EXISTS idx_tutorials_is_published ON tutorials (is_published);

CREATE TABLE IF NOT EXISTS tutorial_steps (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tutorial_id   INTEGER NOT NULL,
  step_number   INTEGER NOT NULL CHECK (step_number > 0),
  instruction   TEXT    NOT NULL,
  fold_type     TEXT    NOT NULL DEFAULT 'valley'
                        CHECK (fold_type IN ('valley', 'mountain', 'reverse', 'squash', 'petal', 'other')),
  image_url     TEXT,
  -- Provisional: the Craft Maker file format is not designed yet.
  craft_file_id TEXT,
  UNIQUE (tutorial_id, step_number),
  FOREIGN KEY (tutorial_id) REFERENCES tutorials (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tutorial_steps_tutorial_id ON tutorial_steps (tutorial_id);

-- --------------------------------------------------------------- orders

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'paid', 'processing', 'shipped',
                                             'delivered', 'cancelled', 'refunded')),
  total_minor      INTEGER NOT NULL CHECK (total_minor >= 0),
  currency         TEXT    NOT NULL DEFAULT 'NPR' CHECK (currency IN ('NPR')),
  shipping_name    TEXT    NOT NULL,
  shipping_phone   TEXT    NOT NULL,
  shipping_address TEXT    NOT NULL,
  shipping_city    TEXT    NOT NULL,
  payment_ref      TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL,
  product_id      INTEGER NOT NULL,
  -- Snapshot: the product row may be renamed or repriced after purchase.
  product_name    TEXT    NOT NULL,
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- -------------------------------------------------------------- reviews

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (product_id, user_id),
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);

-- ----------------------------------------------------- analytics views

CREATE TABLE IF NOT EXISTS product_views (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id    INTEGER,
  viewed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views (product_id);

CREATE TABLE IF NOT EXISTS tutorial_views (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tutorial_id INTEGER NOT NULL,
  user_id     INTEGER,
  viewed_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tutorial_id) REFERENCES tutorials (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tutorial_views_tutorial_id ON tutorial_views (tutorial_id);

-- ----------------------------------------------------- contact messages

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  subject    TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  is_handled INTEGER NOT NULL DEFAULT 0 CHECK (is_handled IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_is_handled ON contact_messages (is_handled);
