import { Pencil, Trash2, Truck, PackageMinus, History } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return dateStr }
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function ExpiryCell({ dateStr }) {
  const days = daysUntil(dateStr)
  const text = formatDate(dateStr)
  if (days === null) return <span className="text-slate-400">-</span>
  if (days < 0) return <span className="text-red-600 font-semibold">{text}</span>
  if (days <= 90) return <span className="text-amber-600 font-semibold">{text}</span>
  return <span>{text}</span>
}

function StockBadge({ current, min }) {
  const threshold = min ?? 10
  const base = 'inline-flex items-center justify-center min-w-[44px] px-2.5 py-0.5 rounded-full font-bold'
  if (current <= 0) return <span className={`${base} text-xs bg-red-100 text-red-700`}>{current}</span>
  if (current <= threshold) return <span className={`${base} text-xs bg-amber-100 text-amber-700`}>{current}</span>
  return <span className={`${base} text-xs bg-green-100 text-green-700`}>{current}</span>
}

function stockBorderClass(p) {
  if (p.current_stock <= 0) return 'border-l-4 border-l-red-400'
  if (p.current_stock <= (p.min_stock ?? 10)) return 'border-l-4 border-l-amber-400'
  return ''
}

const ACTIONS = [
  { key: 'ship',    label: 'รับเข้า',  color: 'blue',   Icon: Truck },
  { key: 'out',     label: 'จ่ายออก', color: 'orange', Icon: PackageMinus },
  { key: 'history', label: 'ประวัติ', color: 'slate',  Icon: History },
  { key: 'edit',    label: 'แก้ไข',   color: 'indigo', Icon: Pencil },
  { key: 'delete',  label: 'ลบ',      color: 'red',    Icon: Trash2 },
]

const COLORS = {
  blue:   'bg-sky-50    text-sky-600    hover:bg-sky-600    hover:text-white active:scale-95',
  orange: 'bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white active:scale-95',
  slate:  'bg-slate-100 text-slate-500  hover:bg-slate-500  hover:text-white active:scale-95',
  indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white active:scale-95',
  red:    'bg-red-50    text-red-600    hover:bg-red-600    hover:text-white active:scale-95',
}

function resolveHandler(key, p, handlers) {
  if (key === 'ship')    return () => handlers.onShipment(p)
  if (key === 'out')     return () => handlers.onStockOut(p)
  if (key === 'history') return () => handlers.onHistory(p)
  if (key === 'edit')    return () => handlers.onEdit(p)
  if (key === 'delete')  return () => handlers.onDelete(p)
}

export default function ProductTable({ products, loading, onEdit, onDelete, onShipment, onStockOut, onHistory }) {
  const handlers = { onEdit, onDelete, onShipment, onStockOut, onHistory }

  return (
    <div className="flex-1 overflow-hidden px-3 md:px-4 pt-3 pb-0">

      {/* ── Mobile: card list (< md) ─────────────────────────── */}
      <div className="md:hidden h-full overflow-y-auto pb-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">กำลังโหลดข้อมูล...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">ไม่พบรายการสินค้า</div>
        ) : products.map(p => (
          <div key={p.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${stockBorderClass(p)}`}>
            {/* Card body */}
            <div className="px-4 pt-3.5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-[15px] leading-snug">{p.name}</p>
                  {p.barcode && <p className="text-xs text-slate-400 font-mono mt-0.5">{p.barcode}</p>}
                </div>
                <StockBadge current={p.current_stock} min={p.min_stock} />
              </div>

              {(p.main_category || p.sub_category) && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {p.main_category && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{p.main_category}</span>
                  )}
                  {p.sub_category && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{p.sub_category}</span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-slate-500">
                {p.brand && <span>{p.brand}</span>}
                {p.lot   && <span className="font-mono">Lot: {p.lot}</span>}
                {p.expiry && <ExpiryCell dateStr={p.expiry} />}
              </div>
            </div>

            {/* Card action bar */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-2 py-2 flex items-center gap-1.5">
              {ACTIONS.map(({ key, label, color, Icon }) => (
                <button
                  key={key}
                  title={label}
                  onClick={resolveHandler(key, p, handlers)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[11px] font-semibold transition-colors ${COLORS[color]}`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: table (≥ md) ────────────────────────────── */}
      <div className="hidden md:block h-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200">
              {['#', 'ชื่อสินค้า', 'บาร์โค้ด', 'ประเภทหลัก', 'ประเภทย่อย', 'Brand', 'Lot', 'วันหมดอายุ', 'คงเหลือ', 'จัดการ'].map(h => (
                <th key={h} className="sticky top-0 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap z-10">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">กำลังโหลดข้อมูล...</span>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400 text-sm">ไม่พบรายการสินค้า</td>
              </tr>
            ) : products.map(p => (
              <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${stockBorderClass(p)}`}>
                <td className="px-3 py-2.5 text-slate-400 font-medium text-xs">{p.id}</td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-slate-800 leading-tight">{p.name}</div>
                  
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{p.barcode || '-'}</td>
                <td className="px-3 py-2.5">
                  {p.main_category
                    ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 whitespace-nowrap">{p.main_category}</span>
                    : <span className="text-slate-400">-</span>}
                </td>
                <td className="px-3 py-2.5">
                  {p.sub_category
                    ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap">{p.sub_category}</span>
                    : <span className="text-slate-400">-</span>}
                </td>
                <td className="px-3 py-2.5 text-slate-600 text-xs">{p.brand || '-'}</td>
                <td className="px-3 py-2.5 text-slate-500 text-xs font-mono">{p.lot || '-'}</td>
                <td className="px-3 py-2.5"><ExpiryCell dateStr={p.expiry} /></td>
                <td className="px-3 py-2.5 text-center">
                  <StockBadge current={p.current_stock} min={p.min_stock} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {ACTIONS.map(({ key, label, color, Icon }) => (
                      <button
                        key={key}
                        title={label}
                        onClick={resolveHandler(key, p, handlers)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${COLORS[color]}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
