const FILTERS = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'low',      label: 'สต๊อกต่ำ' },
  { key: 'out',      label: 'หมดสต๊อก' },
  { key: 'expiring', label: 'ใกล้หมดอายุ' },
]

const SORTS = [
  { key: 'id',            label: 'ลำดับ' },
  { key: 'name',          label: 'ชื่อสินค้า' },
  { key: 'current_stock', label: 'สต๊อกคงเหลือ' },
  { key: 'expiry',        label: 'วันหมดอายุ' },
]

export default function FilterBar({ activeFilter, onFilterChange, sortBy, onSortChange }) {
  return (
    <div className="bg-white border-b border-slate-200 flex-shrink-0">
      <div className="flex items-center gap-2 px-3 md:px-4 py-2.5">
        {/* Filter tabs — scrollable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 pb-0.5 scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeFilter === f.key
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort — always visible */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">เรียง</span>
          <select
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer hover:border-slate-300 transition-colors bg-white"
          >
            {SORTS.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
