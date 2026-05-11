import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanner } from '../lib/plannerContext'
import { getAllIngredients } from '../lib/parseMenus'
import type { ShoppingItem } from '../lib/types'

export default function ShoppingList() {
  const { menus, weekPlan, checkedItems, toggleItem, clearChecked } = usePlanner()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const filledDays = useMemo(
    () => weekPlan.filter((d) => d.micDejun || d.pranz || d.cina),
    [weekPlan],
  )

  const items = useMemo(() => getAllIngredients(weekPlan, menus), [weekPlan, menus])

  // Group by first letter
  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>()
    for (const item of items) {
      const letter = item.name[0]?.toUpperCase() ?? '#'
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push(item)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'ro'))
  }, [items])

  const checkedCount = items.filter((i) => checkedItems.has(i.name)).length

  async function copyToClipboard() {
    const text = items
      .filter((i) => !checkedItems.has(i.name))
      .map((i) => `• ${i.name}`)
      .join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (filledDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-stone-400">
        <p className="text-4xl">🛒</p>
        <p className="text-sm">Niciun meniu planificat încă.</p>
        <button
          onClick={() => navigate('/planner')}
          className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Deschide planificatorul
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-stone-800">Listă de cumpărături</h1>
          <p className="text-xs text-stone-400">
            {items.length} ingrediente din {filledDays.length}{' '}
            {filledDays.length === 1 ? 'zi' : 'zile'}
            {checkedCount > 0 && ` · ${checkedCount} bifate`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="text-sm border border-stone-300 text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? '✓ Copiat!' : '📋 Copiază'}
          </button>
          {checkedCount > 0 && (
            <button
              onClick={clearChecked}
              className="text-sm border border-stone-300 text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Resetează bifele
            </button>
          )}
        </div>
      </div>

      {/* Grouped list */}
      <div className="space-y-4">
        {grouped.map(([letter, groupItems]) => (
          <div key={letter}>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 px-1">
              {letter}
            </h2>
            <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
              {groupItems.map((item) => {
                const checked = checkedItems.has(item.name)
                return (
                  <label
                    key={item.name}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.name)}
                      className="w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                    />
                    <span
                      className={`text-sm flex-1 ${
                        checked ? 'line-through text-stone-400' : 'text-stone-700'
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.optional && (
                      <span className="text-xs text-stone-400 italic">opțional</span>
                    )}
                    {item.count > 1 && (
                      <span className="text-xs text-stone-400">×{item.count}</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
