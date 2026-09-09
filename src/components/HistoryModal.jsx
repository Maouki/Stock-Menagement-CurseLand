import { useEffect, useState } from 'react'
import { X, Truck, PackageMinus, History, ArrowLeftRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function HistoryModal({ product, onClose }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [shipmentsRes, transfersRes] = await Promise.all([
        supabase
          .from('shipments')
          .select('*')
          .eq('product_id', product.id)
          .order('shipment_date', { ascending: false }),
        supabase
          .from('stock_transfers')
          .select('*')
          .eq('product_id', product.id)
          .order('transfer_date', { ascending: false }),
      ])

      const shipments = (shipmentsRes.data || []).map(r => ({
        ...r,
        record_type: r.type,
        date: r.shipment_date,
      }))
      const transfers = (transfersRes.data || []).map(r => ({
        ...r,
        record_type: 'transfer',
        date: r.transfer_date,
      }))

      const combined = [...shipments, ...transfers].sort((a, b) => {
        if (a.date > b.date) return -1
        if (a.date < b.date) return 1
        return (b.created_at || '').localeCompare(a.created_at || '')
      })

      setRecords(combined)
      setLoading(false)
    }
    load()
  }, [product.id])

  const totalIn = records.filter(r => r.record_type === 'in').reduce((s, r) => s + r.quantity, 0)
  const totalOut = records.filter(r => r.record_type === 'out').reduce((s, r) => s + r.quantity, 0)
  const totalTransfer = records.filter(r => r.record_type === 'transfer').reduce((s, r) => s + r.quantity, 0)

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-base font-bold text-slate-800">ประวัติการเคลื่อนไหวสต๊อก</h2>
              <p className="text-xs text-slate-400 mt-0.5">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!loading && records.length > 0 && (
          <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 font-semibold text-xs">
                <Truck className="w-3 h-3" /> รับเข้ารวม
              </span>
              <span className="font-bold text-sky-700">+{totalIn}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold text-xs">
                <PackageMinus className="w-3 h-3" /> จ่ายออกรวม
              </span>
              <span className="font-bold text-orange-600">-{totalOut}</span>
            </div>
            {totalTransfer > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-semibold text-xs">
                  <ArrowLeftRight className="w-3 h-3" /> โอนรวม
                </span>
                <span className="font-bold text-violet-600">-{totalTransfer}</span>
              </div>
            )}
            <div className="ml-auto text-sm text-slate-500">
              สต๊อกปัจจุบัน <span className="font-bold text-slate-700">{product.current_stock}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
              กำลังโหลด...
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">ยังไม่มีประวัติการเคลื่อนไหว</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 sticky top-0">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">วันที่</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">ประเภท</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">จำนวน</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={`${r.record_type}-${r.id}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-3">
                      {r.record_type === 'out' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                          <PackageMinus className="w-3 h-3" /> จ่ายออก
                        </span>
                      ) : r.record_type === 'transfer' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                          <ArrowLeftRight className="w-3 h-3" /> โอนสาขา
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                          <Truck className="w-3 h-3" /> รับเข้า
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold text-base ${
                      r.record_type === 'out' || r.record_type === 'transfer' ? 'text-orange-600' : 'text-sky-600'
                    }`}>
                      {r.record_type === 'out' || r.record_type === 'transfer' ? '-' : '+'}{r.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {r.record_type === 'transfer'
                        ? <span className="text-violet-600 font-medium">→ {r.to_branch}{r.notes ? ` · ${r.notes}` : ''}</span>
                        : r.notes || '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 flex-shrink-0 text-xs text-slate-400">
          {records.length} รายการ
        </div>
      </div>
    </div>
  )
}
