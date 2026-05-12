export type MealCount = 1 | 2 | 3

export type SlotKey = 'micDejun' | 'pranz' | 'cina'

export interface Ingredient {
  id: number
  name: string
  quantity: string | null
  optional: boolean
}

export interface MealSection {
  id: number
  mealIndex: number
  slot: string | null     // 'micDejun' | 'pranz' | 'cina' | 'masa1' | 'masa2' | null
  dish: string | null     // dish name after " - " in heading
  instructions: string | null
  ingredients: Ingredient[]
}

export interface Menu {
  id: string
  title: string
  mealCount: MealCount
  folder: '1-meal' | '2-meals' | '3-meals'
  image: string           // bare filename, e.g. "abc~mv2.png"
  imageUrl: string        // full URL (R2 or local)
  snack1: string | null
  snack2: string | null
  meals: MealSection[]
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
