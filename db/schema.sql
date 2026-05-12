-- Cloudflare D1 Database Schema for Meal Planner
-- Stores menus, weekly plans, and shopping lists

-- Menu catalog (one-time import from JSON files)
CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,               -- filename without extension
  title TEXT NOT NULL,
  meal_count INTEGER NOT NULL CHECK (meal_count IN (1, 2, 3)),
  folder TEXT NOT NULL CHECK (folder IN ('1-meal', '2-meals', '3-meals')),
  image TEXT NOT NULL,               -- filename.png (relative within folder)
  snack1 TEXT,                       -- first snack text (gustare 1)
  snack2 TEXT,                       -- second snack text (gustare 2)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual meals within a menu (mic dejun / prânz / cină / masa 1 / masa 2)
-- Each row mirrors one element of the JSON meals[] array.
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id TEXT NOT NULL,
  meal_index INTEGER NOT NULL CHECK (meal_index IN (0, 1, 2)),
  slot TEXT CHECK (slot IN ('micDejun', 'pranz', 'cina', 'masa1', 'masa2')),
  dish TEXT,                         -- dish name (subtitle after " - " in heading)
  instructions TEXT,                 -- preparation steps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  UNIQUE (menu_id, meal_index)
);

-- Ingredients belonging to a meal
CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity TEXT,                     -- e.g. "2 linguri", "100g" (null when not specified)
  optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

-- Weekly meal plans per user/session
CREATE TABLE IF NOT EXISTS weekly_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  week_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Day-by-day meal assignments within a weekly plan.
-- Each slot references a meal directly (not menu + index).
CREATE TABLE IF NOT EXISTS day_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_plan_id TEXT NOT NULL,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  mic_dejun_meal_id INTEGER,         -- FK → meals.id
  gustare1 TEXT,
  pranz_meal_id INTEGER,             -- FK → meals.id
  gustare2 TEXT,
  cina_meal_id INTEGER,              -- FK → meals.id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (mic_dejun_meal_id) REFERENCES meals(id),
  FOREIGN KEY (pranz_meal_id) REFERENCES meals(id),
  FOREIGN KEY (cina_meal_id) REFERENCES meals(id),
  UNIQUE (weekly_plan_id, day_index)
);

-- Shopping list items with checked state
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_plan_id TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  count INTEGER DEFAULT 1 CHECK (count > 0),
  is_checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_menus_folder ON menus(folder);
CREATE INDEX IF NOT EXISTS idx_meals_menu ON meals(menu_id);
CREATE INDEX IF NOT EXISTS idx_meals_slot ON meals(slot);
CREATE INDEX IF NOT EXISTS idx_ingredients_meal ON ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_day_plans_weekly ON day_plans(weekly_plan_id);
CREATE INDEX IF NOT EXISTS idx_day_plans_day_index ON day_plans(day_index);
CREATE INDEX IF NOT EXISTS idx_shopping_weekly ON shopping_list_items(weekly_plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week ON weekly_plans(user_id, week_start);
