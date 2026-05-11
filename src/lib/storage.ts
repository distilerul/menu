import type { DayPlan } from './types'

const PLAN_KEY = 'weekPlan_v2'
const CHECKED_KEY = 'checkedItems'

function emptyDay(): DayPlan {
  return { micDejun: null, gustare1: null, pranz: null, gustare2: null, cina: null }
}

export function loadPlan(): DayPlan[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return Array.from({ length: 7 }, emptyDay)
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length === 7) return parsed
  } catch {
    // ignore
  }
  return Array.from({ length: 7 }, emptyDay)
}

export function savePlan(plan: DayPlan[]): void {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
}

export function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKED_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {
    // ignore
  }
  return new Set()
}

export function saveChecked(items: Set<string>): void {
  localStorage.setItem(CHECKED_KEY, JSON.stringify(Array.from(items)))
}
