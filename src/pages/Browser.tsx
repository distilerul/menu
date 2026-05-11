import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePlanner } from '../lib/plannerContext'
import MenuCard from '../components/MenuCard'
import MenuModal from '../components/MenuModal'
import type { Menu, MealCount, SlotKey } from '../lib/types'

const DAY_NAMES = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

const SLOT_LABELS: Record<SlotKey, string> = {
  micDejun: 'Mic Dejun',
  pranz: 'Prânz',
  cina: 'Cină',
}

const FILTERS: { label: string; value: MealCount | 0 }[] = [
  { label: 'Toate', value: 0 },
  { label: '1 masă', value: 1 },
  { label: '2 mese', value: 2 },
  { label: '3 mese', value: 3 },
]

export default function Browser() {
  const { menus, assignToDay } = usePlanner()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const pickDay = searchParams.get('pick')
  const pickDayIndex = pickDay !== null ? parseInt(pickDay, 10) : null
  const pickSlot = (searchParams.get('slot') ?? null) as SlotKey | null

  const [filter, setFilter] = useState<MealCount | 0>(0)
  const [search, setSearch] = useState('')
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null)

  const filtered = useMemo(() => {
    return menus.filter((m) => {
      if (filter !== 0 && m.mealCount !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return m.title.toLowerCase().includes(q)
      }
      return true
    })
  }, [menus, filter, search])

  function handlePick(menu: Menu) {
    if (pickDayIndex === null) return
    assignToDay(pickDayIndex, menu.id, pickSlot ?? undefined)
    navigate('/planner')
  }

  function handlePickFromModal(menu: Menu) {
    setActiveMenu(null)
    handlePick(menu)
  }

  const pickLabel = pickSlot ? SLOT_LABELS[pickSlot] : null

  return (
    <div className="space-y-4">
      {activeMenu && (
        <MenuModal
          menu={activeMenu}
          onClose={() => setActiveMenu(null)}
          onPick={pickDayIndex !== null ? handlePickFromModal : undefined}
        />
      )}
      {pickDayIndex !== null && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <span className="text-emerald-700 font-medium text-sm">
            Alege{pickLabel ? ` ${pickLabel} pentru` : ' meniu pentru'}{' '}
            <strong>{DAY_NAMES[pickDayIndex]}</strong>
          </span>
          <button
            onClick={() => navigate('/planner')}
            className="ml-auto text-xs text-stone-500 hover:text-stone-700 underline"
          >
            Anulează
          </button>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          placeholder="Caută meniu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-stone-400">
        {filtered.length} meniuri
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((menu) => (
          <MenuCard
            key={menu.id}
            menu={menu}
            onClick={setActiveMenu}
            onPick={pickDayIndex !== null ? handlePick : undefined}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-stone-400">
            Niciun meniu găsit
          </div>
        )}
      </div>
    </div>
  )
}
