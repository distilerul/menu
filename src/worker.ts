import * as db from './lib/db'
import type { Env } from './lib/db'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    if (pathname.startsWith('/api/')) {
      return handleApi(pathname, url, request, env)
    }

    return new Response('Not found', { status: 404 })
  },
}

async function handleApi(pathname: string, url: URL, request: Request, env: Env): Promise<Response> {
  try {
    // GET /api/menus          — all menus with meals + ingredients
    // GET /api/menus?folder=  — filtered by folder
    if (pathname === '/api/menus' && request.method === 'GET') {
      const folder = url.searchParams.get('folder')
      const menus = folder
        ? await db.getMenusByFolder(folder, env)
        : await db.getAllMenus(env)
      return json(menus)
    }

    // GET /api/menus/:id
    if (/^\/api\/menus\/[^/]+$/.test(pathname) && request.method === 'GET') {
      const id = pathname.split('/').pop()!
      const menu = await db.getMenuById(id, env)
      return menu ? json(menu) : json({ error: 'Not found' }, 404)
    }

    // POST /api/plans
    if (pathname === '/api/plans' && request.method === 'POST') {
      const { weekStart, userId } = (await request.json()) as any
      const plan = await db.createWeeklyPlan(weekStart, userId, env)
      return json(plan, 201)
    }

    // GET /api/plans/:id
    if (/^\/api\/plans\/[^/]+$/.test(pathname) && request.method === 'GET') {
      const id = pathname.split('/').pop()!
      const plan = await db.getWeeklyPlan(id, env)
      return plan ? json(plan) : json({ error: 'Not found' }, 404)
    }

    // PUT /api/plans/:id/days/:dayIndex
    if (/^\/api\/plans\/[^/]+\/days\/\d+$/.test(pathname) && request.method === 'PUT') {
      const parts = pathname.split('/')
      const planId = parts[3]
      const dayIndex = parseInt(parts[5], 10)
      const dayData = (await request.json()) as any
      await db.updateDayPlan(planId, dayIndex, dayData, env)
      return json({ success: true })
    }

    // GET /api/shopping/:weeklyPlanId
    if (/^\/api\/shopping\/[^/]+$/.test(pathname) && request.method === 'GET') {
      const weeklyPlanId = pathname.split('/').pop()!
      const items = await db.getShoppingList(weeklyPlanId, env)
      return json(items)
    }

    // POST /api/shopping/:weeklyPlanId/sync
    if (/^\/api\/shopping\/[^/]+\/sync$/.test(pathname) && request.method === 'POST') {
      const weeklyPlanId = pathname.split('/')[3]
      await db.syncShoppingList(weeklyPlanId, env)
      return json({ success: true })
    }

    // PUT /api/shopping/:weeklyPlanId/:itemId
    if (/^\/api\/shopping\/[^/]+\/\d+$/.test(pathname) && request.method === 'PUT') {
      const parts = pathname.split('/')
      const weeklyPlanId = parts[3]
      const itemId = parseInt(parts[4], 10)
      await db.toggleShoppingItem(weeklyPlanId, itemId, env)
      return json({ success: true })
    }

    return json({ error: 'Not found' }, 404)
  } catch (err) {
    console.error('API error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
