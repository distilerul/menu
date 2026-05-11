export type MealCount = 1 | 2 | 3

export type SlotKey = 'micDejun' | 'pranz' | 'cina'

export interface Ingredient {
  raw: string
  name: string
  optional: boolean
}

export interface MealSection {
  heading: string   // e.g. "Mic Dejun", "Masa 1", "Ingrediente"
  subtitle: string  // e.g. "Tartine cu Somon"
  ingredients: Ingredient[]
}

export interface Menu {
  id: string
  title: string
  mealCount: MealCount
  folder: '1-meal' | '2-meals' | '3-meals'
  meals: MealSection[]
  imageUrl: string
  snack?: string
  rawContent: string
}

export interface MealSlot {
  menuId: string
  mealIndex: number
}

export interface DayPlan {
  micDejun: MealSlot | null
  gustare1: string | null
  pranz: MealSlot | null
  gustare2: string | null
  cina: MealSlot | null
}

export interface ShoppingItem {
  name: string
  optional: boolean
  count: number
}
