#!/usr/bin/env node
/**
 * Reads the JSON recipe files and generates SQL seed data for D1.
 *
 * Usage:
 *   node db/generate-seed.js            # writes db/seed-data.sql
 *   node db/generate-seed.js --stdout   # prints to stdout
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, '..', 'images')
const FOLDERS    = ['1-meal', '2-meals', '3-meals']
const BATCH      = 50   // rows per INSERT VALUES (…) statement

// ── helpers ──────────────────────────────────────────────────────────────────

function esc(val) {
  if (val === null || val === undefined) return 'NULL'
  return `'${String(val).replace(/'/g, "''")}'`
}

function batched(rows, columns, table) {
  if (!rows.length) return ''
  let sql = ''
  for (let i = 0; i < rows.length; i += BATCH) {
    sql += `INSERT INTO ${table} (${columns}) VALUES\n`
    sql += rows.slice(i, i + BATCH).join(',\n') + ';\n\n'
  }
  return sql
}

// ── collect data ─────────────────────────────────────────────────────────────

const menuRows       = []
const mealRows       = []
const ingredientRows = []

let mealId = 0

for (const folder of FOLDERS) {
  const dir = path.join(IMAGES_DIR, folder)
  if (!fs.existsSync(dir)) continue

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()

  for (const file of files) {
    let json
    try {
      json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
    } catch (e) {
      process.stderr.write(`SKIP ${file}: ${e.message}\n`)
      continue
    }

    const snack1 = json.snacks?.[0] ?? null
    const snack2 = json.snacks?.[1] ?? null

    menuRows.push(
      `(${esc(json.id)}, ${esc(json.title)}, ${json.mealCount}, ${esc(folder)}, ${esc(json.image)}, ${esc(snack1)}, ${esc(snack2)})`
    )

    for (let idx = 0; idx < (json.meals ?? []).length; idx++) {
      const meal = json.meals[idx]
      mealId++
      const mid = mealId

      mealRows.push(
        `(${mid}, ${esc(json.id)}, ${idx}, ${esc(meal.slot)}, ${esc(meal.dish)}, ${esc(meal.instructions)})`
      )

      for (const ing of (meal.ingredients ?? [])) {
        ingredientRows.push(
          `(${mid}, ${esc(ing.name)}, ${esc(ing.quantity)}, ${ing.optional ? 1 : 0})`
        )
      }
    }
  }
}

// ── build SQL ─────────────────────────────────────────────────────────────────

let sql = '-- D1 Seed Data: auto-generated from JSON recipe files\n'
sql    += `-- Generated: ${new Date().toISOString()}\n`
sql    += `-- Menus: ${menuRows.length}  Meals: ${mealRows.length}  Ingredients: ${ingredientRows.length}\n\n`

// Clear existing data (cascade handles meals → ingredients)
sql += 'DELETE FROM ingredients;\nDELETE FROM meals;\nDELETE FROM menus;\n\n'

sql += batched(menuRows,       'id, title, meal_count, folder, image, snack1, snack2',      'menus')
sql += batched(mealRows,       'id, menu_id, meal_index, slot, dish, instructions',          'meals')
sql += batched(ingredientRows, 'meal_id, name, quantity, optional',                          'ingredients')

// ── output ────────────────────────────────────────────────────────────────────

const toStdout = process.argv.includes('--stdout')
if (toStdout) {
  process.stdout.write(sql)
} else {
  const out = path.join(__dirname, 'seed-data.sql')
  fs.writeFileSync(out, sql, 'utf-8')
  process.stderr.write(`Wrote ${out}\n`)
  process.stderr.write(`  menus: ${menuRows.length}\n`)
  process.stderr.write(`  meals: ${mealRows.length}\n`)
  process.stderr.write(`  ingredients: ${ingredientRows.length}\n`)
}
