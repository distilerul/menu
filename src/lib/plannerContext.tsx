import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { loadPlan, savePlan, loadChecked, saveChecked } from './storage'
import type { Menu, DayPlan, SlotKey, MealSlot } from './types'

interface PlannerCtx {
  menus: Menu[]
  loading: boolean
  weekPlan: DayPlan[]
  checkedItems: Set<string>
  assignToDay: (day: number, menuId: string, slot?: SlotKey) => void
  clearDaySlot: (day: number, slot: SlotKey) => void
  clearDay: (day: number) => void
  toggleItem: (name: string) => void
  clearChecked: () => void
}

const Ctx = createContext<PlannerCtx | null>(null)

function mealBySlot(menu: Menu, slot: SlotKey): MealSlot | null {
  const idx = menu.meals.findIndex((m) => m.slot === slot)
  return idx >= 0 ? { menuId: menu.id, mealIndex: idx } : null
}

function autoPopulate(menu: Menu): Partial<DayPlan> {
  if (menu.mealCount === 3) {
    return {
      micDejun: mealBySlot(menu, 'micDejun'),
      gustare1: menu.snack1 ?? null,
      pranz: mealBySlot(menu, 'pranz'),
      cina: mealBySlot(menu, 'cina'),
    }
  }
  // 1- or 2-meal: assign to the slot declared on the first meal, default micDejun
  const declared = menu.meals[0]?.slot
  const target: SlotKey =
    declared === 'pranz' || declared === 'cina' ? declared : 'micDejun'
  return { [target]: { menuId: menu.id, mealIndex: 0 } }
}

const r2Base = (import.meta.env.VITE_R2_IMAGE_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

function withImageUrl(menu: any): Menu {
  return {
    ...menu,
    imageUrl: r2Base
      ? `${r2Base}/${menu.folder}/${menu.image}`
      : `/${menu.folder}/${menu.image}`,
  }
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(() => loadPlan())
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => loadChecked())

  useEffect(() => {
    fetch('/api/menus')
      .then((r) => r.json())
      .then((data: any[]) => setMenus(data.map(withImageUrl)))
      .catch((e) => console.error('Failed to load menus:', e))
      .finally(() => setLoading(false))
  }, [])

  const assignToDay = useCallback(
    (day: number, menuId: string, slot?: SlotKey) => {
      const menu = menus.find((m) => m.id === menuId)
      if (!menu) return

      setWeekPlan((prev) => {
        const next = [...prev]
        if (!slot) {
          const populated = autoPopulate(menu)
          next[day] = {
            micDejun: null,
            gustare1: null,
            pranz: null,
            gustare2: null,
            cina: null,
            ...populated,
          }
        } else {
          const idx = menu.meals.findIndex((m) => m.slot === slot)
          const current = { ...next[day] }
          current[slot] = { menuId, mealIndex: idx >= 0 ? idx : 0 }
          next[day] = current
        }
        savePlan(next)
        return next
      })
    },
    [menus],
  )

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
      value={{
        menus,
        loading,
        weekPlan,
        checkedItems,
        assignToDay,
        clearDaySlot,
        clearDay,
        toggleItem,
        clearChecked,
      }}
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
