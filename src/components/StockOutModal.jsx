import { useEffect, useState } from 'react'
import { X, PackageMinus, Minus, Plus } from 'lucide-react'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function StockOutModal({ product, onSave, onClose }) {
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(todayISO)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const max = product.current_stock
  const adjustQty = delta => setQuantity(q => Math.min(max, Math.max(1, q + delta)))
  const handleQtyInput = e => setQuantity(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)))

  const handleSubmit = async e => {
    e.preventDefault()
    if (quantity > max) return
    setSaving(true)
    await onSave({ productId: product.id, quantity, date, notes })
    setSaving(false)
  }

  const newStock = product.current_stock - quantity
  const isEmpty = max <= 0

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <PackageMinus className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-bold text-slate-800">บันทึกการจ่ายออก</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">สินค้า</div>
            <div className="text-base font-semibold text-slate-800">{product.name}</div>
            {product.barcode && <div className="text-xs text-slate-400 font-mono mt-0.5">{product.barcode}</div>}
          </div>

          {isEmpty && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
              สินค้าหมดสต๊อก ไม่สามารถจ่ายออกได้
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">สต๊อกปัจจุบัน</div>
              <div className="text-2xl font-bold text-slate-700">{product.current_stock}</div>
            </div>
            <div className="text-slate-300 text-xl">→</div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">หลังจ่ายออก</div>
              <div className={`text-2xl font-bold ${
                newStock <= 0 ? 'text-red-500'
                : newStock <= (product.min_stock ?? 10) ? 'text-amber-500'
                : 'text-emerald-600'
              }`}>
                {Math.max(0, newStock)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">จำนวนที่จ่ายออก</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => adjustQty(-1)} disabled={isEmpty}
                className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors active:scale-95 disabled:opacity-40">
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={handleQtyInput}
                min="1"
                max={max}
                disabled={isEmpty}
                className="flex-1 text-center py-2.5 border border-slate-200 rounded-xl text-xl font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:opacity-40"
              />
              <button type="button" onClick={() => adjustQty(1)} disabled={isEmpty}
                className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors active:scale-95 disabled:opacity-40">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">วันที่จ่ายออก</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">หมายเหตุ (ถ้ามี)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="เช่น ชื่อผู้รับ, เหตุผล..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving || isEmpty}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <PackageMinus className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกการจ่ายออก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
