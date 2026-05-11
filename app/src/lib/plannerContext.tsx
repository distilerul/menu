import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { loadPlan, savePlan, loadChecked, saveChecked } from './storage'
import { loadMenus } from './parseMenus'
import type { Menu, DayPlan, SlotKey, MealSlot } from './types'

interface PlannerCtx {
  menus: Menu[]
  weekPlan: DayPlan[]
  checkedItems: Set<string>
  assignToDay: (day: number, menuId: string, slot?: SlotKey) => void
  clearDaySlot: (day: number, slot: SlotKey) => void
  clearDay: (day: number) => void
  toggleItem: (name: string) => void
  clearChecked: () => void
}

const Ctx = createContext<PlannerCtx | null>(null)

const SLOT_PATTERNS: Record<SlotKey, RegExp> = {
  micDejun: /mic\s*dejun/i,
  pranz: /pr[aâ]nz/i,
  cina: /cin[aă]/i,
}

function buildSlot(menuId: string, pattern: RegExp, meals: Menu['meals']): MealSlot | null {
  const idx = meals.findIndex((m) => pattern.test(m.heading))
  return idx >= 0 ? { menuId, mealIndex: idx } : null
}

function autoPopulate(menu: Menu): Partial<DayPlan> {
  if (menu.mealCount !== 3) {
    return { micDejun: { menuId: menu.id, mealIndex: 0 } }
  }
  return {
    micDejun: buildSlot(menu.id, SLOT_PATTERNS.micDejun, menu.meals),
    gustare1: menu.snack ?? null,
    pranz: buildSlot(menu.id, SLOT_PATTERNS.pranz, menu.meals),
    cina: buildSlot(menu.id, SLOT_PATTERNS.cina, menu.meals),
  }
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [menus] = useState<Menu[]>(() => loadMenus())
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(() => loadPlan())
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => loadChecked())

  const assignToDay = useCallback((day: number, menuId: string, slot?: SlotKey) => {
    const menu = menus.find((m) => m.id === menuId)
    if (!menu) return

    setWeekPlan((prev) => {
      const next = [...prev]
      const current = { ...next[day] }

      if (!slot) {
        // No slot specified: if 3-meal menu, auto-populate all; otherwise assign to micDejun
        const populated = autoPopulate(menu)
        next[day] = { micDejun: null, gustare1: null, pranz: null, gustare2: null, cina: null, ...populated }
      } else {
        // Assign to specific slot — find best section index
        const pattern = SLOT_PATTERNS[slot]
        const idx = menu.meals.findIndex((m) => pattern.test(m.heading))
        current[slot] = { menuId, mealIndex: idx >= 0 ? idx : 0 }
        next[day] = current
      }

      savePlan(next)
      return next
    })
  }, [menus])

  const clearDaySlot = useCallback((day: number, slot: SlotKey) => {
    setWeekPlan((prev) => {
      const next = [...prev]
      next[day] = { ...next[day], [slot]: null }
      savePlan(next)
      return next
    })
  }, [])

  const clearDay = useCallback((day: number) => {
    setWeekPlan((prev) => {
      const next = [...prev]
      next[day] = { micDejun: null, gustare1: null, pranz: null, gustare2: null, cina: null }
      savePlan(next)
      return next
    })
  }, [])

  const toggleItem = useCallback((name: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      saveChecked(next)
      return next
    })
  }, [])

  const clearChecked = useCallback(() => {
    setCheckedItems(new Set())
    saveChecked(new Set())
  }, [])

  return (
    <Ctx.Provider
      value={{ menus, weekPlan, checkedItems, assignToDay, clearDaySlot, clearDay, toggleItem, clearChecked }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function usePlanner(): PlannerCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlanner must be used inside PlannerProvider')
  return ctx
}
