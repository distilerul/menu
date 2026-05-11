import { Outlet, NavLink } from 'react-router-dom'
import { usePlanner } from '../lib/plannerContext'

export default function Layout() {
  const { weekPlan } = usePlanner()
  const planned = weekPlan.filter(Boolean).length

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14">
          <span className="text-lg font-bold text-emerald-700 mr-4">🥗 Meniu</span>
          <nav className="flex gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              Meniuri
            </NavLink>
            <NavLink
              to="/planner"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              Planificator
              {planned > 0 && (
                <span className="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {planned}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/shopping"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              Cumpărături
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
