import { useEffect, type ReactNode } from 'react'
import type { Menu } from '../lib/types'

// Minimal markdown renderer for the known syntax in these recipe files
function MdLine({ line, idx }: { line: string; idx: number }): ReactNode {
  if (line.startsWith('# ')) {
    return (
      <h1 key={idx} className="text-lg font-bold text-stone-800 mb-2 mt-1">
        {line.slice(2)}
      </h1>
    )
  }
  if (line.startsWith('## ')) {
    return (
      <h2 key={idx} className="text-sm font-bold text-stone-700 mt-5 mb-1 uppercase tracking-wide">
        {line.slice(3)}
      </h2>
    )
  }
  if (line.startsWith('### ')) {
    return (
      <h3 key={idx} className="text-xs font-semibold text-stone-500 mt-3 mb-1 uppercase tracking-wide">
        {line.slice(4)}
      </h3>
    )
  }
  if (line.startsWith('- ')) {
    return (
      <li key={idx} className="text-sm text-stone-700 ml-4 list-disc leading-relaxed">
        {line.slice(2)}
      </li>
    )
  }
  if (/^---+$/.test(line.trim())) {
    return <hr key={idx} className="my-3 border-stone-200" />
  }
  // *italic* snack/gustare lines
  if (/^\*.+\*$/.test(line.trim())) {
    return (
      <p key={idx} className="text-xs italic text-stone-400 mt-3">
        {line.trim().slice(1, -1)}
      </p>
    )
  }
  if (line.trim() === '') {
    return <div key={idx} className="h-2" />
  }
  return (
    <p key={idx} className="text-sm text-stone-600 leading-relaxed">
      {line}
    </p>
  )
}

interface Props {
  menu: Menu
  onClose: () => void
  onPick?: (menu: Menu) => void
}

export default function MenuModal({ menu, onClose, onPick }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Dialog */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-5xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          aria-label="Închide"
        >
          ✕
        </button>

        {/* Left — full image */}
        <div className="md:w-1/2 flex-shrink-0 bg-stone-100 flex items-center justify-center min-h-48">
          <img
            src={menu.imageUrl}
            alt={menu.title}
            className="w-full h-full object-contain max-h-[90vh]"
          />
        </div>

        {/* Right — markdown content */}
        <div className="md:w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {menu.rawContent.split('\n').map((line, i) => (
              <MdLine key={i} line={line} idx={i} />
            ))}
          </div>

          {/* Footer — pick button if in pick mode */}
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
