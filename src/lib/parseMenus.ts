import type { Ingredient, MealSection, Menu, MealCount } from './types'

const rawFiles = import.meta.glob('../../images/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function parseIngredient(line: string): Ingredient {
  const raw = line.replace(/^-\s+/, '')
  const optional = /\(opțional\)/i.test(raw)
  const name = raw
    .replace(/\(opțional\)/gi, '')
    .replace(/\s*[–-]\s*\S.*$/, '') // strip quantity suffix after dash/em-dash
    .trim()
  return { raw, name, optional }
}

function parseMenu(content: string, folder: string, filename: string): Menu {
  const lines = content.split('\n')
  const mealCount = (
    folder === '1-meal' ? 1 : folder === '2-meals' ? 2 : 3
  ) as MealCount

  const title =
    lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? filename

  // *Gustare: ...*  or  *Gustare 1: ...*
  const snackMatch = content.match(/\*Gustare[^:]*: ([^*]+)\*/)
  const snack = snackMatch?.[1]?.trim()

  const meals: MealSection[] = []
  let current: MealSection | null = null
  let inIngredients = false

  for (const line of lines) {
    // Top-level section heading: ## Foo
    if (/^## /.test(line)) {
      if (current) meals.push(current)
      const text = line.slice(3).trim()
      const dash = text.indexOf(' - ')
      current = {
        heading: dash >= 0 ? text.slice(0, dash) : text,
        subtitle: dash >= 0 ? text.slice(dash + 3) : '',
        ingredients: [],
      }
      // 1-meal files use ## Ingrediente (or ## Ingrediente Blat etc.) directly
      inIngredients = mealCount === 1 && /^Ingrediente/i.test(text)
      continue
    }

    // Sub-heading for ingredients: ### Ingrediente
    if (/^###\s+Ingrediente/.test(line)) {
      inIngredients = true
      continue
    }

    // Any other ## or ### heading, or --- separator, stops ingredient collection
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
    folder: folder as Menu['folder'],
    meals,
    imageUrl: `/${folder}/${filename}.png`,
    snack,
    rawContent: content,
  }
}

let _cache: Menu[] | null = null

export function loadMenus(): Menu[] {
  if (_cache) return _cache
  _cache = Object.entries(rawFiles).map(([filePath, content]) => {
    const parts = filePath.replace(/\\/g, '/').split('/')
    const folder = parts[parts.length - 2]
    const filename = parts[parts.length - 1].replace(/\.md$/, '')
    return parseMenu(content, folder, filename)
  })
  return _cache
}

export function getAllIngredients(
  weekPlan: import('./types').DayPlan[],
  menus: Menu[],
): import('./types').ShoppingItem[] {
  const seen = new Map<string, import('./types').ShoppingItem>()
  const slots = ['micDejun', 'pranz', 'cina'] as const

  for (const day of weekPlan) {
    for (const slotKey of slots) {
      const slot = day[slotKey]
      if (!slot) continue
      const menu = menus.find((m) => m.id === slot.menuId)
      if (!menu) continue
      const meal = menu.meals[slot.mealIndex]
      if (!meal) continue
      for (const ing of meal.ingredients) {
        const key = ing.name.toLowerCase().normalize('NFC')
        if (!seen.has(key)) {
          seen.set(key, { name: ing.name, optional: ing.optional, count: 1 })
        } else {
          seen.get(key)!.count++
        }
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ro'),
  )
}
