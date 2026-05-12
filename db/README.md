# D1 Database Setup

Cloudflare D1 database schema and migration scripts for the meal planner.

## Files

- **schema.sql** — D1 DDL (create tables, indexes)
- **generate-seed.js** — Node.js script to generate seed SQL from markdown files
- **seed-data.sql** — Generated SQL INSERT statements (auto-created by generate-seed.js)

## Setup Steps

### 1. Create D1 database

```bash
# From project root
npm install

# Create database (choose a name, e.g. "menu-db")
npx wrangler d1 create menu-db
```

This will output your database binding and update `wrangler.toml` with:
```toml
[[d1_databases]]
binding = "DB"
database_name = "menu-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. Apply schema

```bash
# Apply DDL to your database
npx wrangler d1 execute menu-db --file db/schema.sql
```

### 3. Seed recipes from markdown

**Option A: Auto-generate SQL from markdown** (Recommended)

```bash
# Generate seed SQL from all markdown files in images/
node db/generate-seed.js > db/seed-data.sql

# Execute the seed
npx wrangler d1 execute menu-db --file db/seed-data.sql
```

**Option B: Manual SQL insert** (if you prefer to seed specific menus)

Edit `db/seed-data.sql` manually, then:
```bash
npx wrangler d1 execute menu-db --file db/seed-data.sql
```

## Schema Overview

### menus
- `id` (TEXT PRIMARY KEY) — filename, e.g. `2dca9a_052a8fbd...~mv2`
- `title` — menu title from markdown
- `meal_count` — 1, 2, or 3
- `folder` — '1-meal', '2-meals', or '3-meals'
- `raw_content` — full markdown content
- `image_url` — `/folder/filename.png` or R2 URL
- `snack` — optional snack text

### meal_sections
- `id` (PRIMARY KEY)
- `menu_id` → menus(id)
- `meal_index` — 0, 1, or 2 (Mic Dejun, Prânz, Cină)
- `heading` — e.g., "Mic Dejun"
- `subtitle` — e.g., "Tartine cu Somon"

### ingredients
- `id` (PRIMARY KEY)
- `meal_section_id` → meal_sections(id)
- `raw` — original line, e.g. "Quinoa – 2 linguri"
- `name` — normalized, e.g. "Quinoa"
- `optional` — boolean

### weekly_plans
- `id` (TEXT PRIMARY KEY) — uuid or user session id
- `user_id` (TEXT, optional) — for multi-user support
- `week_start` (DATE) — Monday of the week
- `created_at`, `updated_at` — timestamps

### day_plans
- `id` (PRIMARY KEY)
- `weekly_plan_id` → weekly_plans(id)
- `day_index` — 0–6 (Monday–Sunday)
- `mic_dejun_menu_id`, `mic_dejun_meal_index` — breakfast slot
- `gustare1` — snack text
- `pranz_menu_id`, `pranz_meal_index` — lunch slot
- `gustare2` — snack text
- `cina_menu_id`, `cina_meal_index` — dinner slot

### shopping_list_items
- `id` (PRIMARY KEY)
- `weekly_plan_id` → weekly_plans(id)
- `ingredient_name` — e.g., "Quinoa"
- `is_optional` — boolean
- `count` — how many times this ingredient appears in the week
- `is_checked` — user's checked state
- `created_at` — timestamp

## API Endpoints (Worker)

Typical endpoints to add to your Worker:

```typescript
// GET /api/menus?folder=3-meals
// GET /api/meals/:id
// POST /api/plans (create weekly plan)
// GET /api/plans/:id (fetch weekly plan)
// PUT /api/plans/:id (update day slots)
// GET /api/shopping/:weekId (get aggregated shopping list)
// PUT /api/shopping/:weekId/:itemId (mark checked)
```

## Development

To manually test queries:

```bash
# Query the database directlyas menu_count FROM menus"

# List all menus
npx wrangler d1 execute menu-db --command "SELECT id, title, meal_count FROM menus LIMIT 10
npx wrangler d1 execute menu-db --command "SELECT COUNT(*) FROM menus"
```

To reset the database:

```bash
# Delete and recreate
npx wrangler d1 delete menu-db
npx wrangler d1 create menu-db
npx wrangler d1 execute menu-db --file db/schema.sql
npx ts-node db/seed.ts
```
