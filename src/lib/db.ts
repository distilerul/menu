import type { Menu, MealSection, Ingredient } from './types'

export interface Env {
  DB: D1Database
}

// ── helpers ───────────────────────────────────────────────────────────────────

const r2Base = ((import.meta as any).env?.VITE_R2_IMAGE_BASE_URL ?? '')
  .trim().replace(/\/+$/, '') as string

function imageUrl(folder: string, image: string): string {
  return r2Base ? `${r2Base}/${folder}/${image}` : `/${folder}/${image}`
}

// ── menus ─────────────────────────────────────────────────────────────────────

const ALL_MENUS_SQL = `
  SELECT
    m.id          AS menu_id,
    m.title,
    m.meal_count  AS meal_count,
    m.folder,
    m.image,
    m.snack1,
    m.snack2,
    ml.id         AS meal_id,
    ml.meal_index,
    ml.slot,
    ml.dish,
    ml.instructions,
    i.id          AS ing_id,
    i.name        AS ing_name,
    i.quantity,
    i.optional
  FROM menus m
  LEFT JOIN meals    ml ON ml.menu_id  = m.id
  LEFT JOIN ingredients i ON i.meal_id = ml.id
  ORDER BY m.title, ml.meal_index, i.id
`

function rowsToMenus(rows: any[]): Menu[] {
  const menuMap = new Map<string, any>()

  for (const row of rows) {
    if (!menuMap.has(row.menu_id)) {
      menuMap.set(row.menu_id, {
        id: row.menu_id,
        title: row.title,
        mealCount: row.meal_count as 1 | 2 | 3,
        folder: row.folder,
        image: row.image,
        imageUrl: imageUrl(row.folder, row.image),
        snack1: row.snack1,
        snack2: row.snack2,
        _meals: new Map<number, any>(),
      })
    }
    const menu = menuMap.get(row.menu_id)

    if (row.meal_id != null) {
      if (!menu._meals.has(row.meal_id)) {
        menu._meals.set(row.meal_id, {
          id: row.meal_id,
          mealIndex: row.meal_index,
          slot: row.slot,
          dish: row.dish,
          instructions: row.instructions,
          ingredients: [] as Ingredient[],
        } satisfies MealSection)
      }
      if (row.ing_id != null) {
        menu._meals.get(row.meal_id).ingredients.push({
          id: row.ing_id,
          name: row.ing_name,
          quantity: row.quantity,
          optional: Boolean(row.optional),
        })
      }
    }
  }

  return Array.from(menuMap.values()).map((m) => {
    const { _meals, ...rest } = m
    return { ...rest, meals: Array.from(_meals.values()) } as Menu
  })
}

export async function getAllMenus(env: Env): Promise<Menu[]> {
  const { results } = await env.DB.prepare(ALL_MENUS_SQL).all()
  return rowsToMenus(results)
}

export async function getMenusByFolder(folder: string, env: Env): Promise<Menu[]> {
  const { results } = await env.DB.prepare(
    ALL_MENUS_SQL.replace('FROM menus m', 'FROM menus m WHERE m.folder = ?1')
  ).bind(folder).all()
  return rowsToMenus(results)
}

export async function getMenuById(id: string, env: Env): Promise<Menu | null> {
  const { results } = await env.DB.prepare(
    ALL_MENUS_SQL.replace('FROM menus m', 'FROM menus m WHERE m.id = ?1')
  ).bind(id).all()
  const menus = rowsToMenus(results)
  return menus[0] ?? null
}

// ── weekly plans ──────────────────────────────────────────────────────────────

export async function createWeeklyPlan(weekStart: string, userId: string | undefined, env: Env) {
  const planId = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO weekly_plans (id, user_id, week_start) VALUES (?, ?, ?)'
  ).bind(planId, userId ?? null, weekStart).run()

  const stmts = Array.from({ length: 7 }, (_, day) =>
    env.DB.prepare(
      'INSERT INTO day_plans (weekly_plan_id, day_index) VALUES (?, ?)'
    ).bind(planId, day)
  )
  await env.DB.batch(stmts)

  return { id: planId, week_start: weekStart }
}

export async function getWeeklyPlan(id: string, env: Env) {
  const { results: planRows } = await env.DB.prepare(
    'SELECT * FROM weekly_plans WHERE id = ?'
  ).bind(id).all()
  if (!planRows.length) return null

  const { results: dayRows } = await env.DB.prepare(
    'SELECT * FROM day_plans WHERE weekly_plan_id = ? ORDER BY day_index'
  ).bind(id).all()

  return { ...planRows[0], days: dayRows }
}

export async function updateDayPlan(
  weeklyPlanId: string,
  dayIndex: number,
  dayData: {
    micDejunMealId?: number | null
    gustare1?: string | null
    pranzMealId?: number | null
    gustare2?: string | null
    cinaMealId?: number | null
  },
  env: Env,
) {
  const colMap: Record<string, string> = {
    micDejunMealId: 'mic_dejun_meal_id',
    gustare1: 'gustare1',
    pranzMealId: 'pranz_meal_id',
    gustare2: 'gustare2',
    cinaMealId: 'cina_meal_id',
  }
  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP']
  const binds: any[] = []
  for (const [key, val] of Object.entries(dayData)) {
    if (key in colMap) { sets.push(`${colMap[key]} = ?`); binds.push(val) }
  }
  binds.push(weeklyPlanId, dayIndex)
  await env.DB.prepare(
    `UPDATE day_plans SET ${sets.join(', ')} WHERE weekly_plan_id = ? AND day_index = ?`
  ).bind(...binds).run()
}

// ── shopping list ─────────────────────────────────────────────────────────────

export async function getShoppingList(weeklyPlanId: string, env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT ingredient_name, SUM(count) AS total_count, MAX(is_optional) AS is_optional, MAX(is_checked) AS is_checked
    FROM shopping_list_items
    WHERE weekly_plan_id = ?
    GROUP BY ingredient_name
    ORDER BY ingredient_name
  `).bind(weeklyPlanId).all()
  return results
}

export async function syncShoppingList(weeklyPlanId: string, env: Env) {
  await env.DB.prepare(
    'DELETE FROM shopping_list_items WHERE weekly_plan_id = ?'
  ).bind(weeklyPlanId).run()

  const { results } = await env.DB.prepare(`
    SELECT i.name, i.optional, COUNT(*) AS cnt
    FROM day_plans dp
    JOIN meals ml ON (ml.id = dp.mic_dejun_meal_id OR ml.id = dp.pranz_meal_id OR ml.id = dp.cina_meal_id)
    JOIN ingredients i ON i.meal_id = ml.id
    WHERE dp.weekly_plan_id = ?
    GROUP BY i.name, i.optional
  `).bind(weeklyPlanId).all()

  if (!results.length) return
  const stmts = (results as any[]).map((r) =>
    env.DB.prepare(`
      INSERT INTO shopping_list_items (weekly_plan_id, ingredient_name, is_optional, count)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (weekly_plan_id, ingredient_name) DO UPDATE SET count = count + excluded.count
    `).bind(weeklyPlanId, r.name, r.optional ? 1 : 0, r.cnt)
  )
  await env.DB.batch(stmts)
}

export async function toggleShoppingItem(weeklyPlanId: string, itemId: number, env: Env) {
  await env.DB.prepare(
    'UPDATE shopping_list_items SET is_checked = NOT is_checked WHERE weekly_plan_id = ? AND id = ?'
  ).bind(weeklyPlanId, itemId).run()
}
