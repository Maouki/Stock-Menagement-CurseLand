import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export default function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])

  const isSuccess = type === 'success'

  return (
    <div className={`
      fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3
      rounded-xl text-white shadow-lg animate-slide-up max-w-sm
      ${isSuccess ? 'bg-emerald-600' : 'bg-red-500'}
    `}>
      {isSuccess
        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        : <XCircle className="w-5 h-5 flex-shrink-0" />
      }
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-80 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
