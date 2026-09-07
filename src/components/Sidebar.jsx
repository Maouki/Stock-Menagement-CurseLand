import { Boxes, Folder, Tag, LayoutGrid, Building2 } from 'lucide-react'

const BRANCHES = [
  { key: 'ปาร์คอิน', label: 'ปาร์คอิน' },
  { key: 'บางแสน',   label: 'บางแสน' },
  { key: 'หนองมน',   label: 'หนองมน' },
  { key: 'บางพระ',   label: 'บางพระ' },
]

export default function Sidebar({
  open, activeBranch, onBranchChange, categories, activeMain, activeSub, onCategoryChange, stats,
}) {
  return (
    <aside className={`
      fixed top-0 left-0 h-full w-64 bg-indigo-950 text-indigo-200
      flex flex-col z-50 overflow-y-auto
      transition-transform duration-200
      ${open ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Boxes className="w-6 h-6 text-indigo-300 flex-shrink-0" />
          <span className="text-white font-bold text-lg leading-tight">สต๊อกสินค้า</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 mb-2">สาขา</div>
        <div className="flex flex-col gap-0.5">
          {BRANCHES.map(b => (
            <button
              key={b.key}
              onClick={() => onBranchChange(b.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                activeBranch === b.key ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-white/10'
              }`}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pt-4 pb-4 flex-shrink-0">
        <StatCard label="รายการทั้งหมด" value={stats.total} />
        <StatCard label="สต๊อกต่ำ" value={stats.low_stock} color="text-yellow-300" />
        <StatCard label="หมดสต๊อก" value={stats.out_of_stock} color="text-red-400" />
        <StatCard label="ใกล้หมดอายุ" value={stats.expiring_soon} color="text-cyan-300" />
      </div>

      <div className="px-4 pb-6 flex-shrink-0">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 mb-2">หมวดหมู่</div>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onCategoryChange('', '')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
              !activeMain ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            ทั้งหมด
          </button>

          {Object.entries(categories).map(([main, subs]) => (
            <div key={main}>
              <button
                onClick={() => onCategoryChange(main, '')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left font-medium transition-colors ${
                  activeMain === main && !activeSub
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <Folder className="w-4 h-4 flex-shrink-0" />
                {main}
              </button>
              {subs.map(sub => (
                <button
                  key={sub}
                  onClick={() => onCategoryChange(main, sub)}
                  className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-sm text-left transition-colors ${
                    activeMain === main && activeSub === sub
                      ? 'bg-indigo-600 text-white'
                      : 'text-indigo-300 hover:bg-white/10'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                  {sub}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="rounded-lg p-3 text-center transition-colors" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className={`text-xl font-bold leading-none ${color}`}>{value}</div>
      <div className="text-[11px] text-indigo-300 mt-1">{label}</div>
    </div>
  )
}
