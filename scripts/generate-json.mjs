#!/usr/bin/env node
/**
 * Generate a .json file next to each .md recipe file.
 * Run: node scripts/generate-json.mjs
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMAGES_DIR = join(ROOT, 'images')
const FOLDERS = ['1-meal', '2-meals', '3-meals']

const SLOT_PATTERNS = [
  { slot: 'micDejun', re: /mic\s*dejun/i },
  { slot: 'pranz',    re: /pr[aâ]nz/i },
  { slot: 'cina',     re: /cin[aă]/i },
  { slot: 'masa1',    re: /^masa\s*1$/i },
  { slot: 'masa2',    re: /^masa\s*2$/i },
]

function detectSlot(heading) {
  for (const { slot, re } of SLOT_PATTERNS) {
    if (re.test(heading.trim())) return slot
  }
  return null
}

function parseIngredient(line) {
  const raw = line.replace(/^-\s+/, '')
  const optional = /\(opțional\)/i.test(raw)
  const cleaned = raw.replace(/\(opțional\)/gi, '').trim()

  // Split on em-dash, en-dash, or plain dash preceded by space
  const match = cleaned.match(/^(.+?)\s+[–—-]\s+(.+)$/)
  if (match) {
    return { name: match[1].trim(), quantity: match[2].trim(), optional }
  }
  return { name: cleaned, quantity: null, optional }
}

function parseSnacks3(content) {
  // *Gustare: text*  or  *Gustare 1: text*  /  *Gustare 2: text*
  const snacks = []
  const re = /\*Gustare\s*\d*\s*[:\s]\s*([^*]+)\*/gi
  let m
  while ((m = re.exec(content)) !== null) snacks.push(m[1].trim())
  return [snacks[0] ?? null, snacks[1] ?? null]
}

function parseMenu(content, folder, filename) {
  const mealCount = folder === '1-meal' ? 1 : folder === '2-meals' ? 2 : 3
  const lines = content.split('\n')

  const title = lines.find(l => l.startsWith('# '))?.slice(2).trim() ?? filename

  const meals = []
  const snackItems = []
  let current = null
  let mode = null // 'ingredients' | 'instructions'
  let instrLines = []

  function flushCurrent() {
    if (!current) return
    current.instructions = instrLines.join('\n').trim() || null
    meals.push(current)
    current = null
    instrLines = []
    mode = null
  }

  for (const line of lines) {
    // ── Top-level heading (##) ───────────────────────────────────────────
    if (/^## /.test(line)) {
      flushCurrent()
      const text = line.slice(3).trim()
      const dashIdx = text.indexOf(' - ')
      const heading = dashIdx >= 0 ? text.slice(0, dashIdx) : text
      const dishPart = dashIdx >= 0 ? text.slice(dashIdx + 3) : null

      // 1-meal: ## Ingrediente / ## Preparare are section markers, not meal headings
      if (mealCount === 1 && /^(ingrediente|preparare|mod de preparare)/i.test(heading)) {
        if (!current) {
          const dishFromTitle = title.includes(' - ') ? title.slice(title.indexOf(' - ') + 3) : title
          current = { slot: null, dish: dishFromTitle, ingredients: [], instructions: null }
        }
        mode = /^ingrediente/i.test(heading) ? 'ingredients' : 'instructions'
        continue
      }

      // 2-meal / 3-meal: ## Gustare sections are snacks, not meal slots
      if (/^gustare/i.test(heading)) {
        // Snack text is in the heading itself or in ### Ingrediente below
        snackItems.push(dishPart ?? heading)
        current = null // skip — treat as snack
        mode = null
        continue
      }

      const slot = detectSlot(heading)
      current = { slot, dish: dishPart, ingredients: [], instructions: null }
      mode = null
      continue
    }

    // ── Sub-heading (###) ────────────────────────────────────────────────
    if (/^### /.test(line)) {
      const text = line.slice(4).trim()
      if (/^ingrediente/i.test(text)) mode = 'ingredients'
      else if (/^(preparare|mod de preparare)/i.test(text)) mode = 'instructions'
      else mode = null
      continue
    }

    // ── Separator ────────────────────────────────────────────────────────
    if (/^---+$/.test(line.trim())) {
      mode = null
      continue
    }

    if (!current) continue

    if (mode === 'ingredients' && line.startsWith('- ')) {
      current.ingredients.push(parseIngredient(line))
    } else if (mode === 'instructions' && line.trim()) {
      instrLines.push(line.trim())
    }
  }

  flushCurrent()

  // Snacks: 3-meal from *Gustare* markers; 2-meal from ## Gustare headings
  let snacks
  if (mealCount === 3) {
    snacks = parseSnacks3(content)
  } else {
    snacks = [snackItems[0] ?? null, snackItems[1] ?? null]
  }

  return { id: filename, title, mealCount, image: `${filename}.png`, meals, snacks }
}

// ── Run ──────────────────────────────────────────────────────────────────────

let total = 0

for (const folder of FOLDERS) {
  const dir = join(IMAGES_DIR, folder)
  const entries = await readdir(dir).catch(() => [])

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue
    const filename = entry.replace(/\.md$/, '')
    const content = await readFile(join(dir, entry), 'utf-8')
    const menu = parseMenu(content, folder, filename)
    const outPath = join(dir, `${filename}.json`)
    await writeFile(outPath, JSON.stringify(menu, null, 2) + '\n', 'utf-8')
    console.log(`  ✓  ${folder}/${filename}.json`)
    total++
  }
}

console.log(`\nGenerated ${total} JSON files`)
