import type { DayPlan, Menu, ShoppingItem } from './types'

export function getAllIngredients(weekPlan: DayPlan[], menus: Menu[]): ShoppingItem[] {
  const seen = new Map<string, ShoppingItem>()
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

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}
