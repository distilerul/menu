import type { Menu } from '../lib/types'

const MEAL_BADGE: Record<number, string> = {
  1: 'bg-amber-100 text-amber-800',
  2: 'bg-sky-100 text-sky-800',
  3: 'bg-emerald-100 text-emerald-800',
}

const MEAL_LABEL: Record<number, string> = {
  1: '1 masă',
  2: '2 mese',
  3: '3 mese',
}

interface Props {
  menu: Menu
  /** When set, renders a pick button instead of navigating */
  onPick?: (menu: Menu) => void
  /** Opens the detail modal when the card body is clicked */
  onClick?: (menu: Menu) => void
  /** Compact mode for planner slots */
  compact?: boolean
}

export default function MenuCard({ menu, onPick, onClick, compact = false }: Props) {
  const subtitle = menu.meals
    .filter((m) => m.heading !== 'Ingrediente' && m.heading !== 'Mod de preparare')
    .map((m) => m.subtitle || m.heading)
    .filter(Boolean)
    .join(' · ')

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 p-2 w-full">
        <img
          src={menu.imageUrl}
          alt={menu.title}
          className="w-14 h-14 object-cover rounded-md flex-shrink-0"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-stone-800 leading-tight line-clamp-2">
            {menu.title}
          </p>
          <span
            className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${MEAL_BADGE[menu.mealCount]}`}
          >
            {MEAL_LABEL[menu.mealCount]}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick ? () => onClick(menu) : undefined}
    >
      <div className="aspect-video relative overflow-hidden bg-stone-100">
        <img
          src={menu.imageUrl}
          alt={menu.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <span
          className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${MEAL_BADGE[menu.mealCount]}`}
        >
          {MEAL_LABEL[menu.mealCount]}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2">
          {menu.title}
        </p>
        {subtitle && (
          <p className="text-xs text-stone-500 line-clamp-1">{subtitle}</p>
        )}
        {onPick && (
          <button
            onClick={(e) => { e.stopPropagation(); onPick(menu) }}
            className="mt-auto w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
          >
            Alege
          </button>
        )}
      </div>
    </div>
  )
}
