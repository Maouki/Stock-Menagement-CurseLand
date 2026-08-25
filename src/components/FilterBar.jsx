const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'low', label: 'สต๊อกต่ำ ≤ ขั้นต่ำ' },
  { key: 'out', label: 'หมดสต๊อก' },
  { key: 'expiring', label: 'ใกล้หมดอายุ (90 วัน)' },
]

const SORTS = [
  { key: 'id', label: 'ลำดับ' },
  { key: 'name', label: 'ชื่อสินค้า' },
  { key: 'current_stock', label: 'สต๊อกคงเหลือ' },
  { key: 'expiry', label: 'วันหมดอายุ' },
]

export default function FilterBar({ activeFilter, onFilterChange, sortBy, onSortChange }) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeFilter === f.key
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="hidden sm:inline">เรียงตาม</span>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none cursor-pointer hover:border-slate-300 transition-colors"
        >
          {SORTS.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
