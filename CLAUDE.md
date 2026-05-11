# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a meal-planning web app (to be built under `/app`) backed by a library of food recipes stored as markdown files in `images/`. The app lets users plan meals for the week and generate a shopping list from the selected menus.

## Data Source — `images/`

All recipe content lives in `images/`, organised into three subfolders by the number of meals per card:

| Folder | Count | Contents |
|--------|-------|----------|
| `images/1-meal/` | 43 pairs | Single-dish plates (farfurii), standalone recipes (pancakes, cheesecake, etc.) |
| `images/2-meals/` | 4 pairs | Detox-day cards with two meal slots (Masa 1 + Masa 2) |
| `images/3-meals/` | 27 pairs | Full daily menus (Mic Dejun + Prânz + Cină) |

Each recipe is a `.png` image with a matching `.md` file of the same base name.

### Markdown structure

**1-meal** files have a single `## Ingrediente` block:
```markdown
# Farfurie 2 - Salată Grecească
## Ingrediente
- Roșie
- Castravete
...
```

**2-meals** files use `## Masa 1` / `## Masa 2` (sometimes with a `## Gustare` in between):
```markdown
# Meniu Detox - ...
## Masa 1 - Ceai
### Ingrediente
...
## Masa 2 - Bol Quinoa
### Ingrediente
...
```

**3-meals** files use `## Mic Dejun` / `## Prânz` / `## Cină`, each with a `### Ingrediente` sub-section. Snack lines appear as `*Gustare: ...*` in italic at the bottom, not as a full section:
```markdown
# Meniu Zilnic - ...
## Mic Dejun - Tartine cu Somon
### Ingrediente
- ...
## Prânz - Salată Quinoa
### Ingrediente
- ...
## Cină - Ouă cu Spanac
### Ingrediente
- ...
---
*Gustare: un pumm*
```

All text is in **Romanian**. Quantities appear inline in the ingredient line (e.g. `- Quinoa – 2 linguri`). Optional items are marked `(opțional)`.

## App — `/app`

Built with Vite + React + TypeScript + Tailwind CSS, deployable to Cloudflare Pages.

### Commands (run from `app/`)

```bash
npm install        # first-time setup
npm run dev        # start dev server at http://localhost:5173
npm run build      # tsc type-check + vite build → dist/
npm run preview    # preview production build locally
npm run deploy     # build + wrangler pages deploy dist
```

### Architecture

```
app/src/
  lib/
    types.ts           — Menu, MealSection, Ingredient, ShoppingItem interfaces
    parseMenus.ts      — import.meta.glob eager-loads all *.md; parses into Menu[]
    storage.ts         — localStorage helpers for weekPlan and checkedItems
    plannerContext.tsx — React Context (menus, weekPlan, checkedItems + setters)
  components/
    Layout.tsx         — sticky nav (Meniuri / Planificator / Cumpărături)
    MenuCard.tsx       — card with image, title, meal-count badge; compact mode for planner
  pages/
    Browser.tsx        — searchable grid; ?pick=N query activates pick-mode for planner
    Planner.tsx        — 7-day week grid; each slot navigates to Browser with ?pick=N
    ShoppingList.tsx   — aggregated, grouped, checkable ingredient list with clipboard copy
```

**Data flow:** `parseMenus.ts` uses `import.meta.glob('../../../images/**/*.md', { as: 'raw', eager: true })` to bundle all markdown at build time. `vite.config.ts` sets `publicDir` to `../images` so PNG thumbnails are served at `/1-meal/…`, `/2-meals/…`, `/3-meals/…`. User state (week plan + checked items) lives in `localStorage` via the planner context.

### Key parsing rules for ingredient extraction
- For **1-meal** files: ingredients are under `## Ingrediente` (top-level heading, no `###`).
- For **2-meal / 3-meal** files: each meal section is `## <Meal>` with ingredients under `### Ingrediente`.
- Stop collecting when the next `##` heading or `---` is reached.
- Strip quantity suffixes (` – …`, ` - …`) and `(opțional)` before deduplication.
- Image thumbnails are at `/{folder}/{filename}.png` — filenames contain `~` and `(1)` which the browser handles without encoding.
