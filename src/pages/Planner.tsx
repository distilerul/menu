import { useNavigate } from 'react-router-dom'
import { usePlanner } from '../lib/plannerContext'
import type { SlotKey, MealSlot } from '../lib/types'

const DAY_NAMES = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

const SLOTS: { key: SlotKey; label: string }[] = [
  { key: 'micDejun', label: 'Mic Dejun' },
  { key: 'pranz', label: 'Prânz' },
  { key: 'cina', label: 'Cină' },
]

function getWeekDays(): Date[] {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const fmt = new Intl.DateTimeFormat('ro', { day: 'numeric', month: 'short' })

function SlotRow({
  slot,
  dayIndex,
  snackBefore,
}: {
  slot: { key: SlotKey; label: string }
  dayIndex: number
  snackBefore: string | null
}) {
  const { menus, weekPlan, clearDaySlot } = usePlanner()
  const navigate = useNavigate()
  const dayPlan = weekPlan[dayIndex]
  const mealSlot: MealSlot | null = dayPlan[slot.key]
  const menu = mealSlot ? menus.find((m) => m.id === mealSlot.menuId) : undefined
  const meal = menu ? menu.meals[mealSlot!.mealIndex] : undefined

  return (
    <>
      {snackBefore && (
        <div className="px-2 py-1 text-xs text-stone-400 italic bg-amber-50 rounded-md border border-amber-100">
          🍎 {snackBefore}
        </div>
      )}
      <div className="space-y-1">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {slot.label}
        </span>
        {menu && meal ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1 bg-white rounded-lg border border-stone-200 p-1.5">
              <img
                src={menu.imageUrl}
                alt={menu.title}
                className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                loading="lazy"
              />
              <p className="text-xs font-medium text-stone-700 leading-tight line-clamp-2 flex-1 min-w-0">
                {meal.subtitle || meal.heading}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => navigate(`/?pick=${dayIndex}&slot=${slot.key}`)}
                className="flex-1 text-xs text-stone-400 hover:text-emerald-600 border border-stone-200 hover:border-emerald-300 rounded-md py-0.5 transition-colors"
              >
                Schimbă
              </button>
              <button
                onClick={() => clearDaySlot(dayIndex, slot.key)}
                className="flex-1 text-xs text-stone-400 hover:text-red-500 border border-stone-200 hover:border-red-300 rounded-md py-0.5 transition-colors"
              >
                Șterge
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate(`/?pick=${dayIndex}&slot=${slot.key}`)}
            className="w-full min-h-[3rem] border-2 border-dashed border-stone-200 hover:border-emerald-400 rounded-lg text-stone-300 hover:text-emerald-500 text-xs transition-colors flex items-center justify-center gap-1"
          >
            <span className="text-base leading-none">+</span>
            <span>Adaugă</span>
          </button>
        )}
      </div>
    </>
  )
}

export default function Planner() {
  const { weekPlan, clearDay } = usePlanner()
  const navigate = useNavigate()
  const weekDays = getWeekDays()

  const hasAny = weekPlan.some(
    (d) => d.micDejun || d.pranz || d.cina,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-800">Săptămâna curentă</h1>
        {hasAny && (
          <button
            onClick={() => navigate('/shopping')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🛒 Listă cumpărături
          </button>
        )}
      </div>

      {/* Horizontal scroll container for 7-day grid */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {weekDays.map((date, i) => {
            const dayPlan = weekPlan[i]
            const isToday = date.toDateString() === new Date().toDateString()
            const dayHasAny = dayPlan.micDejun || dayPlan.pranz || dayPlan.cina

            return (
              <div
                key={i}
                className={`rounded-xl border p-2 flex flex-col gap-2 ${
                  isToday ? 'border-emerald-400 bg-emerald-50/40' : 'border-stone-200 bg-stone-50'
                }`}
              >
                {/* Day header */}
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    className={`text-xs font-bold ${
                      isToday ? 'text-emerald-700' : 'text-stone-600'
                    }`}
                  >
                    {DAY_NAMES[i]}
                  </span>
                  <span className="text-xs text-stone-400">{fmt.format(date)}</span>
                </div>

                {/* Quick-add full day from 3-meal menu */}
                {!dayHasAny && (
                  <button
                    onClick={() => navigate(`/?pick=${i}`)}
                    className="w-full text-xs bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg py-1.5 transition-colors font-medium"
                  >
                    + Meniu zilnic
                  </button>
                )}

                {/* Slots */}
                <SlotRow slot={SLOTS[0]} dayIndex={i} snackBefore={null} />
                <SlotRow slot={SLOTS[1]} dayIndex={i} snackBefore={dayPlan.gustare1} />
                <SlotRow slot={SLOTS[2]} dayIndex={i} snackBefore={dayPlan.gustare2} />

                {/* Clear day */}
                {dayHasAny && (
                  <button
                    onClick={() => clearDay(i)}
                    className="text-xs text-stone-300 hover:text-red-400 transition-colors text-center"
                  >
                    Șterge ziua
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!hasAny && (
        <p className="text-center text-stone-400 text-sm py-4">
          Apasă <strong>+ Meniu zilnic</strong> pe oricare zi pentru a planifica
        </p>
      )}
    </div>
  )
}
