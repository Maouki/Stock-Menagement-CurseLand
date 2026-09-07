import { useEffect, useState, useMemo } from 'react'
import { X, Save } from 'lucide-react'

const BRANCHES = ['ปาร์คอิน', 'บางแสน', 'หนองมน', 'บางพระ']

const EMPTY_FORM = {
  name: '',
  barcode: '',
  main_category: '',
  sub_category: '',
  brand: '',
  lab: '',
  lot: '',
  expiry: '',
  current_stock: 0,
  min_stock: 10,
  group_name: 'รายการสินค้า',
  branch: 'ปาร์คอิน',
}

export default function ProductModal({ product, isEdit, categories, groups, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...product })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const set = (field) => (e) => {
    const value = e.target.type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value
    setForm(f => ({ ...f, [field]: value }))
  }

  const allSubs = useMemo(() => {
    if (form.main_category && categories[form.main_category]) {
      return categories[form.main_category]
    }
    return [...new Set(Object.values(categories).flat())].sort()
  }, [form.main_category, categories])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const data = isEdit ? { ...form, id: product.id } : { ...form }
    const success = await onSave(data)
    if (!success) setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ชื่อสินค้า" required className="sm:col-span-2">
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  required
                  placeholder="ระบุชื่อสินค้า"
                  className={inputCls}
                />
              </Field>

              <Field label="สาขา" required>
                <select
                  value={form.branch}
                  onChange={set('branch')}
                  className={inputCls}
                  required
                >
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              <Field label="กลุ่มสินค้า">
                <input
                  type="text"
                  value={form.group_name}
                  onChange={set('group_name')}
                  list="groupList"
                  placeholder="เช่น รายการสินค้า"
                  className={inputCls}
                />
                <datalist id="groupList">
                  {groups.map(g => <option key={g} value={g} />)}
                </datalist>
              </Field>

              <Field label="บาร์โค้ดสินค้า">
                <input
                  type="text"
                  value={form.barcode}
                  onChange={set('barcode')}
                  placeholder="บาร์โค้ด"
                  className={inputCls}
                />
              </Field>

              <Field label="ประเภทสินค้าหลัก">
                <input
                  type="text"
                  value={form.main_category}
                  onChange={set('main_category')}
                  list="mainCatList"
                  placeholder="เช่น Liquid"
                  className={inputCls}
                />
                <datalist id="mainCatList">
                  {Object.keys(categories).map(c => <option key={c} value={c} />)}
                </datalist>
              </Field>

              <Field label="ประเภทสินค้าย่อย">
                <input
                  type="text"
                  value={form.sub_category}
                  onChange={set('sub_category')}
                  list="subCatList"
                  placeholder="เช่น Syrup"
                  className={inputCls}
                />
                <datalist id="subCatList">
                  {allSubs.map(s => <option key={s} value={s} />)}
                </datalist>
              </Field>

              <Field label="Brand">
                <input type="text" value={form.brand} onChange={set('brand')} placeholder="Brand" className={inputCls} />
              </Field>

              <Field label="Lab">
                <input type="text" value={form.lab} onChange={set('lab')} placeholder="Lab" className={inputCls} />
              </Field>

              <Field label="Lot">
                <input type="text" value={form.lot} onChange={set('lot')} placeholder="Lot number" className={inputCls} />
              </Field>

              <Field label="วันหมดอายุ">
                <input type="date" value={form.expiry || ''} onChange={set('expiry')} className={inputCls} />
              </Field>

              <Field label="สต๊อกคงเหลือ">
                <input type="number" value={form.current_stock} onChange={set('current_stock')} min="0" className={inputCls} />
              </Field>

              <Field label="สต๊อกขั้นต่ำ (แจ้งเตือน)">
                <input type="number" value={form.min_stock} onChange={set('min_stock')} min="0" className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all'

function Field({ label, required, className, children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className || ''}`}>
      <label className="text-xs font-semibold text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
