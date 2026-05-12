#!/usr/bin/env node
/**
 * Updates slot field in 1-meal JSON files and promotes MD structure
 * to use ## MealSlot / ### Ingrediente format.
 *
 * Slot labels were read from the top-right corner of each PNG:
 *   C  → cina    (cheese icon)
 *   P  → pranz   (fish / mushroom / chicken-leg icon)
 *   MD → micDejun (avocado / cracker icon)
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIR  = join(ROOT, 'images', '1-meal')

const SLOT_HEADING = {
  micDejun: 'Mic Dejun',
  pranz:    'Prânz',
  cina:     'Cină',
}

// filename (no extension) → slot
const SLOTS = {
  // ── Mic Dejun ────────────────────────────────────────────────────────────
  '2dca9a_1c7a112c755445519da907738c01a8a8~mv2':    'micDejun',
  '2dca9a_258e8ce5197b451bbf0c4b9340da65d9~mv2':    'micDejun',
  '2dca9a_34f6e3015e0d4561ac547ffdacf8cc7f~mv2':    'micDejun',
  '2dca9a_3b34b77229294703ab9b6ebd6901cede~mv2(1)': 'micDejun',
  '2dca9a_58b1b38f6bc1488393dbee01d5a5d904~mv2':    'micDejun',
  '2dca9a_6164f013b73f42c28bcf905669f671fd~mv2':    'micDejun',
  '2dca9a_643bd2bb4b3b492586d2a7dc33cb8713~mv2':    'micDejun',
  '2dca9a_6c22a380a9ee475cb133f2818ac048dc~mv2':    'micDejun',
  '2dca9a_78ce36525af243bf9dffeaff7441f07f~mv2':    'micDejun',
  '2dca9a_7cd79d3da0fd46e78b5bb0a980e9e339~mv2':    'micDejun',
  '2dca9a_7d552c2b0c4646eeafe76295bb318f19~mv2':    'micDejun',
  '2dca9a_874b158449ac4963a57831bf34eb6d0c~mv2':    'micDejun',
  '2dca9a_a45cf906dbd541298b525c952a5b1fd4~mv2':    'micDejun',
  '2dca9a_c1b96f09427c4d6780645842e4686bd7~mv2':    'micDejun',
  // ── Prânz ────────────────────────────────────────────────────────────────
  '2dca9a_052a8fbd00e54525bcd8d537ce3f6c65~mv2':    'pranz',
  '2dca9a_15b2bf8e955f45a69d1dc5e5a0444d6a~mv2':    'pranz',
  '2dca9a_32b9bc55e84b4af6baf7328d573fb4c0~mv2':    'pranz',
  '2dca9a_3409f6e247a74b71bb99337fef31bde9~mv2':    'pranz',
  '2dca9a_3820b988495a4944b73769d8e4ddf390~mv2':    'pranz',
  '2dca9a_3dac3ad82c4f4ce492e757c2356a5dbb~mv2':    'pranz',
  '2dca9a_44cf22b4c2644c5b906ac133b6b4d8f8~mv2':    'pranz',
  '2dca9a_8b9815bd298b4b77bb273198dd483ddd~mv2':    'pranz',
  '2dca9a_946c6ca2337c4b738e76c209e2cbaf9a~mv2':    'pranz',
  '2dca9a_a4a9e6277be6411a9285a2be80859cc8~mv2':    'pranz',
  '2dca9a_aed5ff0ba04144599096b1cf861ed5ac~mv2':    'pranz',
  '2dca9a_c236fb6f0b1c4a7385871714c9f1edc6~mv2':    'pranz',
  '2dca9a_c47ae432d8a249158f0d9a7b0f977c66~mv2':    'pranz',
  '2dca9a_d1cbcd62fae44440912328ffed009454~mv2':    'pranz',
  '2dca9a_d7114b3513004c368e2f53c8e27db173~mv2':    'pranz',
  '2dca9a_e8f33267018c49eb9a29f8e234f24b78~mv2':    'pranz',
  // ── Cină ─────────────────────────────────────────────────────────────────
  '2dca9a_23e806709032453b91311cd7bcf88551~mv2':    'cina',
  '2dca9a_40cff3847cf54cada0e223e28a2e92f0~mv2':    'cina',
  '2dca9a_4bc3949058a446a799b10f24144722fc~mv2(1)': 'cina',
  '2dca9a_6a54addfb05d43d0b810c08f05e178f7~mv2':    'cina',
  '2dca9a_7903807d0af94d9b8bf40ada580612fa~mv2':    'cina',
  '2dca9a_7afa6d33fbf045e48f54c1b1535709db~mv2':    'cina',
  '2dca9a_7bf34f57c2da4207bc758f11657c4b69~mv2':    'cina',
  '2dca9a_98dbae217d7a4c60a9a9ef3ede02378a~mv2':    'cina',
  '2dca9a_a94e1ec1dc2a4630ad4baf423f649e10~mv2':    'cina',
  '2dca9a_c0c0f49b48664299baa10a244863afaf~mv2':    'cina',
  // ── Recipe cards (no slot) ───────────────────────────────────────────────
  // 2dca9a_24862385612d43a79665eec116c663e3~mv2  (Pancakes)
  // 2dca9a_76804e548eef4d8b9bf9f9792614edd6~mv2  (Înghețată de casă)
  // 2dca9a_8bc159bec4de47a09f452cbb57b2f259~mv2  (Cheesecake)
}

function transformMd(content, slot) {
  const heading = SLOT_HEADING[slot]
  const lines = content.split('\n')
  const result = []
  let slotInserted = false

  for (const line of lines) {
    if (!slotInserted && line.startsWith('## ')) {
      result.push(`## ${heading}`, '')
      slotInserted = true
      result.push('### ' + line.slice(3))
    } else if (line.startsWith('## ')) {
      result.push('### ' + line.slice(3))
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

let updated = 0
for (const [filename, slot] of Object.entries(SLOTS)) {
  const jsonPath = join(DIR, `${filename}.json`)
  const mdPath   = join(DIR, `${filename}.md`)

  // ── Update JSON ──────────────────────────────────────────────────────────
  const json = JSON.parse(await readFile(jsonPath, 'utf-8'))
  if (json.meals?.[0]) json.meals[0].slot = slot
  await writeFile(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf-8')

  // ── Update MD ────────────────────────────────────────────────────────────
  const md = await readFile(mdPath, 'utf-8')
  // Skip if already transformed (slot heading already present)
  if (!md.includes(`## ${SLOT_HEADING[slot]}`)) {
    await writeFile(mdPath, transformMd(md, slot), 'utf-8')
  }

  console.log(`  ✓  ${filename}  →  ${slot}`)
  updated++
}

console.log(`\nUpdated ${updated} files`)
