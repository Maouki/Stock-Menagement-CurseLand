import { Menu, Search, Plus, LogOut, User, Wallet, BarChart2 } from 'lucide-react'

export default function Topbar({ onToggleSidebar, searchQuery, onSearch, onAdd, onFinance, onDashboard, currentUser, onLogout, activeBranch }) {
  return (
    <div className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
      <div className="h-16 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="เมนู"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-base font-bold text-slate-800">ระบบจัดการสต๊อกสินค้า</span>
            <span className="text-xs text-indigo-600 font-semibold">สาขา{activeBranch}</span>
          </div>
          <h1 className="text-sm font-bold text-slate-800 truncate sm:hidden">
            สต๊อกสินค้า
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative hidden sm:flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearch(e.target.value)}
              placeholder="ค้นหาสินค้า, บาร์โค้ด, Brand..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-48 md:w-64 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <button
            onClick={onDashboard}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold transition-colors border border-indigo-200"
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">แดชบอร์ด</span>
          </button>

          <button
            onClick={onFinance}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold transition-colors border border-emerald-200"
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">รายรับ-จ่าย</span>
          </button>

          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">เพิ่มสินค้า</span>
          </button>

          {/* User badge + logout */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">{currentUser}</span>
            </div>
            <button
              onClick={onLogout}
              title="ออกจากระบบ"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="sm:hidden px-4 pb-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
    </div>
  )
}
