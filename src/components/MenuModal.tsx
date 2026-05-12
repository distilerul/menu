import { useEffect } from 'react'
import type { Menu, MealSection } from '../lib/types'

const SLOT_LABEL: Record<string, string> = {
  micDejun: 'Mic Dejun',
  pranz: 'Prânz',
  cina: 'Cină',
  masa1: 'Masa 1',
  masa2: 'Masa 2',
}

function MealBlock({ meal }: { meal: MealSection }) {
  const heading = meal.slot ? (SLOT_LABEL[meal.slot] ?? meal.slot) : null
  const title = [heading, meal.dish].filter(Boolean).join(' — ')

  return (
    <div className="mt-4 first:mt-0">
      {title && (
        <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-2">
          {title}
        </h2>
      )}
      {meal.ingredients.length > 0 && (
        <ul className="space-y-0.5 mb-2">
          {meal.ingredients.map((ing) => (
            <li key={ing.id} className="text-sm text-stone-700 ml-3 list-disc leading-relaxed">
              {ing.name}
              {ing.quantity && (
                <span className="text-stone-400"> — {ing.quantity}</span>
              )}
              {ing.optional && (
                <span className="text-stone-400 italic"> (opțional)</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {meal.instructions && (
        <div className="mt-2 text-sm text-stone-600 leading-relaxed whitespace-pre-line">
          {meal.instructions}
        </div>
      )}
    </div>
  )
}

interface Props {
  menu: Menu
  onClose: () => void
  onPick?: (menu: Menu) => void
}

export default function MenuModal({ menu, onClose, onPick }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-5xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          aria-label="Închide"
        >
          ✕
        </button>

        {/* Image */}
        <div className="md:w-1/2 flex-shrink-0 bg-stone-100 flex items-center justify-center min-h-48">
          <img
            src={menu.imageUrl}
            alt={menu.title}
            className="w-full h-full object-contain max-h-[90vh]"
          />
        </div>

        {/* Content */}
        <div className="md:w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <h1 className="text-lg font-bold text-stone-800 mb-4">{menu.title}</h1>
            {menu.meals.map((meal) => (
              <MealBlock key={meal.id} meal={meal} />
            ))}
            {(menu.snack1 || menu.snack2) && (
              <p className="mt-4 text-xs italic text-stone-400">
                {[menu.snack1, menu.snack2].filter(Boolean).map((s, i) => (
                  <span key={i}>{i > 0 ? ' · ' : ''}{s}</span>
                ))}
              </p>
            )}
          </div>

          {onPick && (
            <div className="border-t border-stone-100 px-5 py-4 flex-shrink-0">
              <button
                onClick={() => onPick(menu)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Alege acest meniu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
