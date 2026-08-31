import { useState, useEffect, useCallback } from 'react'
import { X, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'

const MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const MONTH_FULL  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const WDAY_SHORT  = ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.']
const SOURCE_LABEL = { boardgame: 'บอร์ดเกม (ชั้น 2)', restaurant: 'ร้านอาหาร (ชั้น 1)', grab: 'Grab', expense: 'รายจ่าย' }

const CHANNELS = [
  { key: null,         label: 'ทั้งหมด',           color: null },
  { key: 'restaurant', label: 'ร้านอาหาร (ชั้น 1)', color: 'emerald' },
  { key: 'grab',       label: 'Grab',               color: 'orange' },
  { key: 'boardgame',  label: 'บอร์ดเกม (ชั้น 2)',  color: 'violet' },
]

function fmt(n)     { return Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }) }
function fmtFull(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function getMondayISO(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().split('T')[0]
}

function shiftWeek(isoMonday, delta) {
  const d = new Date(isoMonday + 'T00:00:00')
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().split('T')[0]
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function fmtWeekRange(mondayISO) {
  const s = new Date(mondayISO + 'T00:00:00')
  const e = new Date(mondayISO + 'T00:00:00')
  e.setDate(e.getDate() + 6)
  const ey = e.getFullYear() + 543
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${ey}`
  }
  return `${s.getDate()} ${MONTH_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${ey}`
}

function computeMonthlyData(recs) {
  const months = MONTH_SHORT.map(label => ({ label, income: 0, expense: 0, net: 0 }))
  recs.forEach(r => {
    const m = parseInt(r.record_date.split('-')[1]) - 1
    if (r.type === 'income') months[m].income += parseFloat(r.net_amount)
    else                     months[m].expense += parseFloat(r.amount)
  })
  months.forEach(m => { m.net = m.income - m.expense })
  return months
}

function computeWeeklyData(recs, weekStart) {
  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return { date: d.toISOString().split('T')[0], label: `${WDAY_SHORT[i]}${d.getDate()}`, dayIndex: i, income: 0, expense: 0, net: 0 }
  })
  recs.forEach(r => {
    const slot = slots.find(s => s.date === r.record_date)
    if (!slot) return
    if (r.type === 'income') slot.income += parseFloat(r.net_amount)
    else                     slot.expense += parseFloat(r.amount)
  })
  slots.forEach(s => { s.net = s.income - s.expense })
  return slots
}

function computeDailyData(recs) {
  const byDay = {}
  recs.forEach(r => {
    const d = parseInt(r.record_date.split('-')[2])
    if (!byDay[d]) byDay[d] = { label: String(d), income: 0, expense: 0, net: 0 }
    if (r.type === 'income') byDay[d].income += parseFloat(r.net_amount)
    else                     byDay[d].expense += parseFloat(r.amount)
  })
  Object.values(byDay).forEach(d => { d.net = d.income - d.expense })
  return Object.values(byDay).sort((a, b) => parseInt(a.label) - parseInt(b.label))
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[150px]">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-6">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-bold">฿{fmt(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="flex justify-between gap-6 border-t border-slate-100 mt-1.5 pt-1.5">
          <span className="text-slate-500 font-medium">กำไร</span>
          <span className={`font-bold ${payload[0].value - payload[1].value >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>
            ฿{fmt(payload[0].value - payload[1].value)}
          </span>
        </div>
      )}
    </div>
  )
}

function SummaryCards({ income, expense, channelLabel }) {
  const net = income - expense
  if (channelLabel) {
    return (
      <div className="px-5 py-4 flex-shrink-0">
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <div className="text-xs font-semibold text-emerald-500 mb-1">รายรับ — {channelLabel}</div>
          <div className="text-2xl font-bold text-emerald-700">฿{fmt(income)}</div>
        </div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3 px-5 py-4 flex-shrink-0">
      <div className="bg-emerald-50 rounded-2xl p-3 sm:p-4 text-center">
        <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 mb-1">รายรับสุทธิ</div>
        <div className="text-base sm:text-lg font-bold text-emerald-700">฿{fmt(income)}</div>
      </div>
      <div className="bg-red-50 rounded-2xl p-3 sm:p-4 text-center">
        <div className="text-[11px] sm:text-xs font-semibold text-red-500 mb-1">รายจ่าย</div>
        <div className="text-base sm:text-lg font-bold text-red-600">฿{fmt(expense)}</div>
      </div>
      <div className={`rounded-2xl p-3 sm:p-4 text-center ${net >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
        <div className={`text-[11px] sm:text-xs font-semibold mb-1 ${net >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>กำไรสุทธิ</div>
        <div className={`text-base sm:text-lg font-bold ${net >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>฿{fmt(net)}</div>
      </div>
    </div>
  )
}

export default function DashboardModal({ onClose }) {
  const now = new Date()
  const [view,          setView]         = useState('monthly')
  const [year,          setYear]         = useState(now.getFullYear())
  const [month,         setMonth]        = useState(now.getMonth())
  const [weekStart,     setWeekStart]    = useState(() => getMondayISO())
  const [channelFilter, setChannelFilter] = useState(null)

  // Raw records per view
  const [monthlyRecs, setMonthlyRecs] = useState([])
  const [weeklyRecs,  setWeeklyRecs]  = useState([])
  const [dailyRecs,   setDailyRecs]   = useState([])

  const [selectedDay,  setSelectedDay]  = useState(null)
  const [selectedWDay, setSelectedWDay] = useState(null)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  /* ── Monthly loader ── */
  const loadMonthly = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('finance_records')
      .select('record_date, type, net_amount, amount, source')
      .gte('record_date', `${year}-01-01`)
      .lte('record_date', `${year}-12-31`)
    setMonthlyRecs(data || [])
    setLoading(false)
  }, [year])

  /* ── Weekly loader ── */
  const loadWeekly = useCallback(async () => {
    setLoading(true)
    const weekEnd = addDays(weekStart, 6)
    const { data } = await supabase
      .from('finance_records')
      .select('*')
      .gte('record_date', weekStart)
      .lte('record_date', weekEnd)
      .order('record_date')
      .order('created_at')
    setWeeklyRecs(data || [])
    setSelectedWDay(null)
    setLoading(false)
  }, [weekStart])

  /* ── Daily loader ── */
  const loadDaily = useCallback(async () => {
    setLoading(true)
    const mm = String(month + 1).padStart(2, '0')
    const { data } = await supabase
      .from('finance_records')
      .select('*')
      .gte('record_date', `${year}-${mm}-01`)
      .lte('record_date', `${year}-${mm}-31`)
      .order('record_date')
      .order('created_at')
    setDailyRecs(data || [])
    setSelectedDay(null)
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    if (view === 'monthly')     loadMonthly()
    else if (view === 'weekly') loadWeekly()
    else                        loadDaily()
  }, [view, loadMonthly, loadWeekly, loadDaily])

  /* ── Derived: apply channel filter to raw records ── */
  const applyChannel = recs => channelFilter ? recs.filter(r => r.source === channelFilter) : recs
  const effMonthly = applyChannel(monthlyRecs)
  const effWeekly  = applyChannel(weeklyRecs)
  const effDaily   = applyChannel(dailyRecs)

  /* ── Compute chart data from filtered records ── */
  const monthlyData = computeMonthlyData(effMonthly)
  const weeklyData  = computeWeeklyData(effWeekly, weekStart)
  const dailyData   = computeDailyData(effDaily)

  /* ── Derived totals ── */
  const activeData   = view === 'monthly' ? monthlyData : view === 'weekly' ? weeklyData : dailyData
  const totalIncome  = activeData.reduce((s, d) => s + d.income,  0)
  const totalExpense = activeData.reduce((s, d) => s + d.expense, 0)

  const visibleWeeklyRecs = selectedWDay !== null
    ? effWeekly.filter(r => r.record_date === weeklyData[selectedWDay]?.date)
    : effWeekly

  const visibleDailyRecs = selectedDay
    ? effDaily.filter(r => parseInt(r.record_date.split('-')[2]) === selectedDay)
    : effDaily

  const isClickable   = view === 'daily' || view === 'weekly'
  const channelLabel  = CHANNELS.find(c => c.key === channelFilter)?.label ?? null

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full h-full sm:rounded-2xl sm:max-w-3xl sm:max-h-[92vh] flex flex-col shadow-xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">แดชบอร์ด รายรับ-รายจ่าย</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Controls ── */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 flex-shrink-0">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {[['monthly','รายเดือน'],['weekly','รายสัปดาห์'],['daily','รายวัน']].map(([key, label]) => (
              <button key={key} onClick={() => setView(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  view === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Year picker — monthly & daily only */}
          {view !== 'weekly' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setYear(y => y - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-700 w-16 text-center">{year + 543}</span>
              <button onClick={() => setYear(y => y + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Month picker — daily only */}
          {view === 'daily' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setMonth(m => m === 0 ? 11 : m - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-700 w-24 text-center">{MONTH_FULL[month]}</span>
              <button onClick={() => setMonth(m => m === 11 ? 0 : m + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Week picker — weekly only */}
          {view === 'weekly' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekStart(w => shiftWeek(w, -1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-700 text-center min-w-[160px]">{fmtWeekRange(weekStart)}</span>
              <button onClick={() => setWeekStart(w => shiftWeek(w, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Channel filter ── */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-shrink-0 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-1">ช่องทาง</span>
          {CHANNELS.map(({ key, label }) => (
            <button
              key={String(key)}
              onClick={() => setChannelFilter(prev => prev === key ? null : key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                channelFilter === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Summary cards */}
          <SummaryCards income={totalIncome} expense={totalExpense} channelLabel={channelFilter ? channelLabel : null} />

          {/* Chart */}
          <div className="px-5 pb-4">
            <div className="bg-slate-50 rounded-2xl p-4">
              {loading ? (
                <div className="flex items-center justify-center h-52 text-slate-400 gap-2">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  กำลังโหลด...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={activeData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    onClick={e => {
                      if (!e?.activeLabel) return
                      if (view === 'daily') {
                        const d = parseInt(e.activeLabel)
                        setSelectedDay(prev => prev === d ? null : d)
                      } else if (view === 'weekly') {
                        const idx = weeklyData.findIndex(s => s.label === e.activeLabel)
                        if (idx !== -1) setSelectedWDay(prev => prev === idx ? null : idx)
                      }
                    }}
                    style={{ cursor: isClickable ? 'pointer' : 'default' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      width={38}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar
                      dataKey="income"
                      name={channelFilter ? `รายรับ — ${channelLabel}` : 'รายรับ'}
                      fill="#10b981"
                      radius={[4,4,0,0]}
                      maxBarSize={36}
                    />
                    {!channelFilter && (
                      <Bar dataKey="expense" name="รายจ่าย" fill="#f87171" radius={[4,4,0,0]} maxBarSize={36} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {isClickable && !loading && (
                <p className="text-center text-[11px] text-slate-400 mt-1">แตะแท่งกราฟเพื่อกรองรายการ</p>
              )}
            </div>
          </div>

          {/* Monthly breakdown table */}
          {view === 'monthly' && !loading && (
            <div className="px-5 pb-6">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">รายละเอียดรายเดือน</p>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {(channelFilter
                        ? ['เดือน', `รายรับ — ${channelLabel}`]
                        : ['เดือน','รายรับ','รายจ่าย','กำไร']
                      ).map(h => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-slate-500 ${h === 'เดือน' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, i) => {
                      const hasData = m.income > 0 || m.expense > 0
                      return (
                        <tr key={i} className={`border-b border-slate-100 transition-colors ${hasData ? 'hover:bg-slate-50' : 'opacity-40'}`}>
                          <td className="px-4 py-2.5 font-medium text-slate-700">{MONTH_FULL[i]}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{m.income > 0 ? `฿${fmtFull(m.income)}` : '-'}</td>
                          {!channelFilter && (
                            <>
                              <td className="px-4 py-2.5 text-right text-red-500 font-semibold">{m.expense > 0 ? `฿${fmtFull(m.expense)}` : '-'}</td>
                              <td className={`px-4 py-2.5 text-right font-bold ${m.net >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>
                                {hasData ? `฿${fmtFull(m.net)}` : '-'}
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Weekly breakdown table + record list */}
          {view === 'weekly' && !loading && (
            <div className="px-5 pb-6 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">รายละเอียดรายวัน (สัปดาห์นี้)</p>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {(channelFilter
                          ? ['วัน', `รายรับ — ${channelLabel}`]
                          : ['วัน','รายรับ','รายจ่าย','กำไร']
                        ).map(h => (
                          <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-slate-500 ${h === 'วัน' ? 'text-left' : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.map((d, i) => {
                        const hasData = d.income > 0 || d.expense > 0
                        const isSelected = selectedWDay === i
                        return (
                          <tr
                            key={i}
                            onClick={() => setSelectedWDay(prev => prev === i ? null : i)}
                            className={`border-b border-slate-100 cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-50' : hasData ? 'hover:bg-slate-50' : 'opacity-40'
                            }`}
                          >
                            <td className="px-4 py-2.5 font-medium text-slate-700">
                              <span className="font-semibold text-slate-500 mr-1.5">{WDAY_SHORT[i]}</span>
                              {new Date(d.date + 'T00:00:00').getDate()} {MONTH_SHORT[new Date(d.date + 'T00:00:00').getMonth()]}
                            </td>
                            <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{d.income > 0 ? `฿${fmtFull(d.income)}` : '-'}</td>
                            {!channelFilter && (
                              <>
                                <td className="px-4 py-2.5 text-right text-red-500 font-semibold">{d.expense > 0 ? `฿${fmtFull(d.expense)}` : '-'}</td>
                                <td className={`px-4 py-2.5 text-right font-bold ${d.net >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>
                                  {hasData ? `฿${fmtFull(d.net)}` : '-'}
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {selectedWDay !== null
                      ? `${WDAY_SHORT[selectedWDay]} ${new Date(weeklyData[selectedWDay]?.date + 'T00:00:00').toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' })}`
                      : 'รายการทั้งสัปดาห์'
                    }
                  </p>
                  {selectedWDay !== null && (
                    <button onClick={() => setSelectedWDay(null)}
                      className="text-xs text-indigo-600 hover:underline font-semibold">
                      ดูทั้งหมด
                    </button>
                  )}
                </div>
                <RecordList records={visibleWeeklyRecs} emptyMsg="ไม่มีข้อมูลในสัปดาห์นี้" showDate />
              </div>
            </div>
          )}

          {/* Daily record list */}
          {view === 'daily' && !loading && (
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedDay
                    ? `วันที่ ${selectedDay} ${MONTH_FULL[month]} ${year + 543}`
                    : `รายการทั้งหมด — ${MONTH_FULL[month]} ${year + 543}`}
                </p>
                {selectedDay && (
                  <button onClick={() => setSelectedDay(null)}
                    className="text-xs text-indigo-600 hover:underline font-semibold">
                    ดูทั้งหมด
                  </button>
                )}
              </div>
              <RecordList records={visibleDailyRecs} emptyMsg="ไม่มีข้อมูลในเดือนนี้" showDate />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RecordList({ records, emptyMsg, showDate }) {
  if (records.length === 0) {
    return <div className="text-center py-10 text-slate-400 text-sm">{emptyMsg}</div>
  }
  return (
    <div className="space-y-2">
      {records.map(r => (
        <div key={r.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700">{SOURCE_LABEL[r.source] || r.source}</span>
              {showDate && <span className="text-[11px] text-slate-400">{r.record_date}</span>}
            </div>
            {r.notes && <div className="text-[11px] text-slate-400 truncate mt-0.5">{r.notes}</div>}
          </div>
          {r.image_url && (
            <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <img src={r.image_url} alt="receipt"
                className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
            </a>
          )}
          <div className={`text-sm font-bold flex-shrink-0 ${r.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
            {r.type === 'income' ? '+' : '-'}฿{fmtFull(r.net_amount)}
          </div>
        </div>
      ))}
    </div>
  )
}
