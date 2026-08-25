import { Pencil, Trash2, Truck } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
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
  if (current <= 0) {
    return <span className="inline-flex items-center justify-center min-w-[48px] px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{current}</span>
  }
  if (current <= threshold) {
    return <span className="inline-flex items-center justify-center min-w-[48px] px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{current}</span>
  }
  return <span className="inline-flex items-center justify-center min-w-[48px] px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">{current}</span>
}

function rowClass(product) {
  if (product.current_stock <= 0) return 'border-l-4 border-l-red-400'
  if (product.current_stock <= (product.min_stock ?? 10)) return 'border-l-4 border-l-amber-400'
  return ''
}

export default function ProductTable({ products, loading, onEdit, onDelete, onShipment }) {
  return (
    <div className="flex-1 overflow-hidden px-4 pt-3 pb-0">
      <div className="h-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200">
              {['#', 'ชื่อสินค้า', 'บาร์โค้ด', 'ประเภทหลัก', 'ประเภทย่อย', 'Brand', 'Lot', 'วันหมดอายุ', 'ตั้งต้น', 'คงเหลือ', 'จัดการ'].map(h => (
                <th key={h} className="sticky top-0 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap z-10">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">กำลังโหลดข้อมูล...</span>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-slate-400 text-sm">
                  ไม่พบรายการสินค้า
                </td>
              </tr>
            ) : (
              products.map(p => (
                <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${rowClass(p)}`}>
                  <td className="px-3 py-2.5 text-slate-400 font-medium text-xs">{p.id}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-slate-800 leading-tight">{p.name}</div>
                    {p.group_name && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{p.group_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{p.barcode || '-'}</td>
                  <td className="px-3 py-2.5">
                    {p.main_category
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 whitespace-nowrap">{p.main_category}</span>
                      : <span className="text-slate-400">-</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    {p.sub_category
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap">{p.sub_category}</span>
                      : <span className="text-slate-400">-</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-xs">{p.brand || '-'}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs font-mono">{p.lot || '-'}</td>
                  <td className="px-3 py-2.5"><ExpiryCell dateStr={p.expiry} /></td>
                  <td className="px-3 py-2.5 text-center text-slate-600">{p.initial_stock}</td>
                  <td className="px-3 py-2.5 text-center">
                    <StockBadge current={p.current_stock} min={p.min_stock} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <ActionBtn title="รับเข้าสินค้า" color="blue" onClick={() => onShipment(p)}>
                        <Truck className="w-3.5 h-3.5" />
                      </ActionBtn>
                      <ActionBtn title="แก้ไข" color="indigo" onClick={() => onEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </ActionBtn>
                      <ActionBtn title="ลบ" color="red" onClick={() => onDelete(p)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActionBtn({ children, title, color, onClick }) {
  const colors = {
    blue: 'bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white',
    red: 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white',
  }
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${colors[color]}`}
    >
      {children}
    </button>
  )
}
