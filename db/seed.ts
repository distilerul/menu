/**
 * Seed script: Import existing markdown recipes into D1
 * 
 * Run from project root:
 *   npx wrangler d1 execute menu-db --file db/schema.sql
 *   npm install
 *   npx ts-node db/seed.ts
 * 
 * This reads all markdown files from images/ and populates the menus,
 * meal_sections, and ingredients tables via D1 API.
 */

import fs from 'fs'
import path from 'path'

// D1 database type (portable, without @cloudflare/workers-types)
interface D1Database {
  prepare(sql: string): D1StatementBuilder
}

interface D1StatementBuilder {
  bind(...values: any[]): D1StatementExecutor
}

interface D1StatementExecutor {
  run(): Promise<D1Result>
}

interface D1Result {
  meta: { last_row_id?: number }
}

// Parse markdown similar to parseMenus.ts
interface ParsedMenu {
  id: string
  title: string
  mealCount: 1 | 2 | 3
  folder: '1-meal' | '2-meals' | '3-meals'
  rawContent: string
  imageUrl: string
  snack?: string
  meals: Array<{
    heading: string
    subtitle: string
    ingredients: Array<{ raw: string; name: string; optional: boolean }>
  }>
}

function parseIngredient(line: string) {
  const raw = line.replace(/^-\s+/, '')
  const optional = /\(opțional\)/i.test(raw)
  const name = raw
    .replace(/\(opțional\)/gi, '')
    .replace(/\s*[–-]\s*\S.*$/, '')
    .trim()
  return { raw, name, optional }
}

function parseMenu(
  content: string,
  folder: string,
  filename: string
): ParsedMenu {
  const lines = content.split('\n')
  const mealCount = (
    folder === '1-meal' ? 1 : folder === '2-meals' ? 2 : 3
  ) as 1 | 2 | 3

  const title =
    lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? filename

  const snackMatch = content.match(/\*Gustare[^:]*: ([^*]+)\*/)
  const snack = snackMatch?.[1]?.trim()

  const meals: ParsedMenu['meals'] = []
  let current: (typeof meals)[0] | null = null
  let inIngredients = false

  for (const line of lines) {
    if (/^## /.test(line)) {
      if (current) meals.push(current)
      const text = line.slice(3).trim()
      const dash = text.indexOf(' - ')
      current = {
        heading: dash >= 0 ? text.slice(0, dash) : text,
        subtitle: dash >= 0 ? text.slice(dash + 3) : '',
        ingredients: [],
      }
      inIngredients = mealCount === 1 && /^Ingrediente/i.test(text)
      continue
    }

    if (/^###\s+Ingrediente/.test(line)) {
      inIngredients = true
      continue
    }

    if (/^##/.test(line) || /^---/.test(line)) {
      inIngredients = false
      continue
    }

    if (inIngredients && line.startsWith('- ') && current) {
      current.ingredients.push(parseIngredient(line))
    }
  }

  if (current) meals.push(current)

  return {
    id: filename,
    title,
    mealCount,
    folder: folder as ParsedMenu['folder'],
    rawContent: content,
    imageUrl: `/${folder}/${filename}.png`,
    snack,
    meals,
  }
}

async function seedDatabase(db: D1Database) {
  const imagePath = path.join(__dirname, '..', 'images')

  // Iterate through all markdown files
  for (const folder of ['1-meal', '2-meals', '3-meals']) {
    const folderPath = path.join(imagePath, folder)
    if (!fs.existsSync(folderPath)) continue

    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.md'))

    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const filename = file.replace(/\.md$/, '')

      const menu = parseMenu(content, folder, filename)

      // Insert menu
      await db
        .prepare(
          `
        INSERT OR REPLACE INTO menus (id, title, meal_count, folder, raw_content, image_url, snack)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          menu.id,
          menu.title,
          menu.mealCount,
          menu.folder,
          menu.rawContent,
          menu.imageUrl,
          menu.snack || null
        )
        .run()

      // Insert meal sections and ingredients
      for (let mealIdx = 0; mealIdx < menu.meals.length; mealIdx++) {
        const meal = menu.meals[mealIdx]

        const mealResult = await db
          .prepare(
            `
          INSERT INTO meal_sections (menu_id, meal_index, heading, subtitle)
          VALUES (?, ?, ?, ?)
        `
          )
          .bind(menu.id, mealIdx, meal.heading, meal.subtitle)
          .run()

        const mealSectionId = mealResult.meta.last_row_id

        for (const ing of meal.ingredients) {
          await db
            .prepare(
              `
            INSERT INTO ingredients (meal_section_id, raw, name, optional)
            VALUES (?, ?, ?, ?)
          `
            )
            .bind(mealSectionId, ing.raw, ing.name, ing.optional ? 1 : 0)
            .run()
        }
      }

      console.log(`✓ Seeded ${menu.id}`)
    }
  }

  console.log('✓ Seeding complete')
}

// Export for use in migrations
export { seedDatabase, parseMenu }
