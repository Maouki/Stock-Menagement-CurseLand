import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function DeleteModal({ product, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Trash2 className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">ยืนยันการลบ</h3>
        <p className="text-sm text-slate-500 mb-6">
          ต้องการลบ <span className="font-semibold text-slate-700">"{product.name}"</span> ใช่หรือไม่?
          <br />การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'กำลังลบ...' : 'ลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
