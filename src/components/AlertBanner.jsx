import { AlertTriangle, X } from 'lucide-react'

export default function AlertBanner({ lowCount, outCount, onFilter, onDismiss }) {
  return (
    <div className="mx-4 mt-3 flex-shrink-0 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-sm text-amber-800">
          {outCount > 0 && (
            <>มี <strong>{outCount}</strong> รายการหมดสต๊อก</>
          )}
          {outCount > 0 && lowCount > 0 && ' · '}
          {lowCount > 0 && (
            <>มี <strong>{lowCount}</strong> รายการสต๊อกต่ำ</>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {outCount > 0 && (
          <button
            onClick={() => onFilter('out')}
            className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            ดูรายการหมด
          </button>
        )}
        {lowCount > 0 && (
          <button
            onClick={() => onFilter('low')}
            className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            ดูรายการต่ำ
          </button>
        )}
        <button
          onClick={onDismiss}
          className="w-6 h-6 flex items-center justify-center rounded text-amber-600 hover:bg-amber-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
