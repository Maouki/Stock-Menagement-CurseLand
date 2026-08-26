import { useState, useEffect, useCallback } from 'react'
import { X, Wallet, Gamepad2, UtensilsCrossed, Bike, Upload, ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmt(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

const INCOME_SOURCES = [
  {
    key: 'boardgame',
    label: 'ร้านบอร์ดเกม',
    sublabel: 'ชั้น 2',
    Icon: Gamepad2,
    bg: 'bg-indigo-100',
    icon: 'text-indigo-600',
    border: 'border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50',
    hasImage: true,
  },
  {
    key: 'restaurant',
    label: 'ร้านอาหาร',
    sublabel: 'ชั้น 1',
    Icon: UtensilsCrossed,
    bg: 'bg-emerald-100',
    icon: 'text-emerald-600',
    border: 'border-emerald-100 hover:border-emerald-400 hover:bg-emerald-50',
    hasImage: true,
  },
  {
    key: 'grab',
    label: 'Grab',
    sublabel: 'หักค่าบริการ 30%',
    Icon: Bike,
    bg: 'bg-green-100',
    icon: 'text-green-600',
    border: 'border-green-100 hover:border-green-400 hover:bg-green-50',
    hasImage: false,
    deduction: 0.30,
  },
]

const SOURCE_LABEL = {
  boardgame:  'ร้านบอร์ดเกม (ชั้น 2)',
  restaurant: 'ร้านอาหาร (ชั้น 1)',
  grab:       'Grab',
  expense:    'รายจ่าย',
}

export default function FinanceModal({ onClose }) {
  const [tab, setTab]               = useState('income')
  const [source, setSource]         = useState(null)
  const [amount, setAmount]         = useState('')
  const [notes, setNotes]           = useState('')
  const [date, setDate]             = useState(todayISO)
  const [imageFile, setImageFile]   = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [records, setRecords]       = useState([])
  const [loadingRec, setLoadingRec] = useState(true)

  // Edit state
  const [editingRecord, setEditingRecord]   = useState(null)
  const [editAmount, setEditAmount]         = useState('')
  const [editNotes, setEditNotes]           = useState('')
  const [editImageFile, setEditImageFile]   = useState(null)
  const [editImgPreview, setEditImgPreview] = useState(null)

  // Delete confirm state
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const loadRecords = useCallback(async () => {
    setLoadingRec(true)
    const { data } = await supabase
      .from('finance_records')
      .select('*')
      .eq('record_date', date)
      .order('created_at', { ascending: false })
    setRecords(data || [])
    setLoadingRec(false)
  }, [date])

  useEffect(() => { loadRecords() }, [loadRecords])

  // Pre-fill edit form when a record is selected for editing
  useEffect(() => {
    if (editingRecord) {
      setEditAmount(String(editingRecord.amount))
      setEditNotes(editingRecord.notes || '')
      setEditImgPreview(editingRecord.image_url || null)
      setEditImageFile(null)
    }
  }, [editingRecord])

  const selectedSrc = INCOME_SOURCES.find(s => s.key === source)
  const parsed      = parseFloat(amount) || 0
  const net         = selectedSrc?.deduction ? parsed * (1 - selectedSrc.deduction) : parsed

  const editSrc     = editingRecord ? INCOME_SOURCES.find(s => s.key === editingRecord.source) : null
  const editParsed  = parseFloat(editAmount) || 0
  const editNet     = editSrc?.deduction ? editParsed * (1 - editSrc.deduction) : editParsed

  const totalIncome  = records.filter(r => r.type === 'income') .reduce((s, r) => s + parseFloat(r.net_amount), 0)
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + parseFloat(r.amount),     0)
  const netProfit    = totalIncome - totalExpense

  const resetForm = () => {
    setSource(null); setAmount(''); setNotes('')
    setImageFile(null); setImgPreview(null)
  }

  const handleImage = e => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  const handleEditImage = e => {
    const file = e.target.files[0]
    if (!file) return
    setEditImageFile(file)
    setEditImgPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (parsed <= 0) return
    if (tab === 'expense' && !notes.trim()) return
    setSaving(true)

    let imageUrl = null
    if (imageFile) {
      const ext  = imageFile.name.split('.').pop()
      const path = `${date}/${source || 'expense'}-${Date.now()}.${ext}`
      const { data: up, error: upErr } = await supabase.storage
        .from('receipts').upload(path, imageFile, { upsert: true })
      if (!upErr) {
        imageUrl = supabase.storage.from('receipts').getPublicUrl(up.path).data.publicUrl
      }
    }

    await supabase.from('finance_records').insert({
      record_date: date,
      type:        tab === 'income' ? 'income' : 'expense',
      source:      tab === 'income' ? source : 'expense',
      amount:      parsed,
      net_amount:  tab === 'income' ? net : parsed,
      image_url:   imageUrl,
      notes,
    })

    setSaving(false)
    resetForm()
    loadRecords()
  }

  const handleUpdate = async () => {
    if (editParsed <= 0) return
    if (editingRecord.type === 'expense' && !editNotes.trim()) return
    setSaving(true)

    let imageUrl = editImgPreview ? editingRecord.image_url : null
    if (editImageFile) {
      const ext  = editImageFile.name.split('.').pop()
      const path = `${editingRecord.record_date}/${editingRecord.source || 'expense'}-${Date.now()}.${ext}`
      const { data: up, error: upErr } = await supabase.storage
        .from('receipts').upload(path, editImageFile, { upsert: true })
      if (!upErr) {
        imageUrl = supabase.storage.from('receipts').getPublicUrl(up.path).data.publicUrl
      }
    }

    await supabase.from('finance_records').update({
      amount:     editParsed,
      net_amount: editingRecord.type === 'income' ? editNet : editParsed,
      notes:      editNotes,
      image_url:  imageUrl,
    }).eq('id', editingRecord.id)

    setSaving(false)
    setEditingRecord(null)
    loadRecords()
  }

  const handleDelete = async (record) => {
    setDeleting(true)
    if (record.image_url) {
      const parts = record.image_url.split('/receipts/')
      if (parts.length > 1) {
        await supabase.storage.from('receipts').remove([decodeURIComponent(parts[1])])
      }
    }
    await supabase.from('finance_records').delete().eq('id', record.id)
    setDeleting(false)
    setConfirmDelete(null)
    if (editingRecord?.id === record.id) setEditingRecord(null)
    loadRecords()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          {editingRecord ? (
            <button
              onClick={() => setEditingRecord(null)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">ยกเลิกแก้ไข</span>
            </button>
          ) : tab === 'income' && source ? (
            <button
              onClick={() => setSource(null)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">เลือกแหล่งรายรับ</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-800">บันทึกรายรับ-รายจ่าย</h2>
            </div>
          )}
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Edit record form ── */}
          {editingRecord ? (
            <div className="px-5 py-4 space-y-4">
              {/* Source label */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${editingRecord.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-sm font-semibold text-slate-700">
                  {SOURCE_LABEL[editingRecord.source] || editingRecord.source}
                </span>
                <span className="ml-auto text-xs text-slate-400">{fmtDate(editingRecord.record_date)}</span>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {editingRecord.type === 'income' ? 'ยอดรายรับ (บาท)' : 'จำนวนเงิน (บาท)'}
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  min="0" step="0.01"
                  placeholder="0.00"
                  autoFocus
                  className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold outline-none transition-all ${
                    editingRecord.type === 'income'
                      ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      : 'focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  }`}
                />
              </div>

              {/* Grab deduction breakdown */}
              {editSrc?.deduction && editParsed > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>ยอดรวม</span>
                    <span className="font-semibold">฿{fmt(editParsed)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>หักค่าบริการ 30%</span>
                    <span className="font-semibold">-฿{fmt(editParsed * 0.30)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1.5 border-t border-orange-200 text-slate-700">
                    <span>รายรับสุทธิ</span>
                    <span className="text-emerald-600">฿{fmt(editNet)}</span>
                  </div>
                </div>
              )}

              {/* Image (income sources with image) */}
              {(editSrc?.hasImage || editingRecord.image_url) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">รูปใบเสร็จ / สรุปยอด</label>
                  {editImgPreview ? (
                    <div className="relative">
                      <img src={editImgPreview} alt="preview" className="w-full rounded-xl object-cover max-h-52" />
                      <button
                        onClick={() => { setEditImageFile(null); setEditImgPreview(null) }}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                      <Upload className="w-6 h-6 text-slate-300" />
                      <span className="text-xs text-slate-400 font-medium">แตะเพื่ออัปโหลดรูปใหม่</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleEditImage} />
                    </label>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {editingRecord.type === 'expense'
                    ? <>รายละเอียด <span className="text-red-500">*</span></>
                    : 'หมายเหตุ (ถ้ามี)'
                  }
                </label>
                {editingRecord.type === 'expense' ? (
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="เช่น รายได้ช่วงเย็น..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                )}
              </div>

              <button
                onClick={handleUpdate}
                disabled={saving || editParsed <= 0 || (editingRecord.type === 'expense' && !editNotes.trim())}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50 ${
                  editingRecord.type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          ) : (
            <>
              {/* ── Date + Tab switcher ── */}
              <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3 flex-shrink-0">
                <input
                  type="date"
                  value={date}
                  onChange={e => { setDate(e.target.value); resetForm() }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                  {['income', 'expense'].map(t => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); resetForm() }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {t === 'income' ? 'รายรับ' : 'รายจ่าย'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Income: source picker ── */}
              {tab === 'income' && !source && (
                <div className="px-5 py-4 space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">เลือกแหล่งรายรับ</p>
                  {INCOME_SOURCES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setSource(s.key)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left ${s.border}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                        <s.Icon className={`w-6 h-6 ${s.icon}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-[15px]">{s.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.sublabel}</div>
                      </div>
                      {s.deduction && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">หัก 30%</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Income: form ── */}
              {tab === 'income' && source && (
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">ยอดรายรับ (บาท)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      min="0" step="0.01"
                      placeholder="0.00"
                      autoFocus
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  {selectedSrc?.deduction && parsed > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>ยอดรวม</span>
                        <span className="font-semibold">฿{fmt(parsed)}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>หักค่าบริการ 30%</span>
                        <span className="font-semibold">-฿{fmt(parsed * 0.30)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1.5 border-t border-orange-200 text-slate-700">
                        <span>รายรับสุทธิ</span>
                        <span className="text-emerald-600">฿{fmt(net)}</span>
                      </div>
                    </div>
                  )}

                  {selectedSrc?.hasImage && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">แนบรูปใบเสร็จ / สรุปยอด</label>
                      {imgPreview ? (
                        <div className="relative">
                          <img src={imgPreview} alt="preview" className="w-full rounded-xl object-cover max-h-52" />
                          <button
                            onClick={() => { setImageFile(null); setImgPreview(null) }}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                          <Upload className="w-6 h-6 text-slate-300" />
                          <span className="text-xs text-slate-400 font-medium">แตะเพื่ออัปโหลดรูป</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
                        </label>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">หมายเหตุ (ถ้ามี)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="เช่น รายได้ช่วงเย็น..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving || parsed <= 0}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? 'กำลังบันทึก...' : `บันทึกรายรับ${parsed > 0 ? '  ฿' + fmt(net) : ''}`}
                  </button>
                </div>
              )}

              {/* ── Expense: form ── */}
              {tab === 'expense' && (
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      min="0" step="0.01"
                      placeholder="0.00"
                      autoFocus
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      รายละเอียด <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="เช่น ค่าวัตถุดิบ, ค่าน้ำ-ไฟ, ค่าจ้าง..."
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving || parsed <= 0 || !notes.trim()}
                    className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {saving ? 'กำลังบันทึก...' : `บันทึกรายจ่าย${parsed > 0 ? '  ฿' + fmt(parsed) : ''}`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Daily summary ── */}
          <div className="px-5 pb-6 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              สรุป {fmtDate(date)}
            </p>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-[11px] text-emerald-600 font-semibold mb-1">รายรับสุทธิ</div>
                <div className="text-sm font-bold text-emerald-700">฿{fmt(totalIncome)}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-[11px] text-red-500 font-semibold mb-1">รายจ่าย</div>
                <div className="text-sm font-bold text-red-600">฿{fmt(totalExpense)}</div>
              </div>
              <div className={`rounded-xl p-3 text-center ${netProfit >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
                <div className={`text-[11px] font-semibold mb-1 ${netProfit >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>กำไรสุทธิ</div>
                <div className={`text-sm font-bold ${netProfit >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>฿{fmt(netProfit)}</div>
              </div>
            </div>

            {/* Record list */}
            {loadingRec ? (
              <div className="text-center py-6 text-slate-400 text-sm">กำลังโหลด...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">ยังไม่มีรายการวันนี้</div>
            ) : (
              <div className="space-y-2">
                {records.map(r => (
                  confirmDelete === r.id ? (
                    <div key={r.id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
                      <span className="flex-1 text-sm text-red-600 font-semibold">ยืนยันการลบ?</span>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deleting}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting ? '...' : 'ลบ'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        editingRecord?.id === r.id ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-700 leading-tight">
                          {SOURCE_LABEL[r.source] || r.source}
                        </div>
                        {r.notes && <div className="text-[11px] text-slate-400 truncate mt-0.5">{r.notes}</div>}
                      </div>
                      {r.image_url && (
                        <a href={r.image_url} target="_blank" rel="noopener noreferrer">
                          <img src={r.image_url} alt="receipt" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
                        </a>
                      )}
                      <div className={`text-sm font-bold flex-shrink-0 ${r.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {r.type === 'income' ? '+' : '-'}฿{fmt(r.net_amount)}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setEditingRecord(r); setConfirmDelete(null) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(r.id); setEditingRecord(null) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
