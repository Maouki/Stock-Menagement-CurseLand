import { useState, useRef, useCallback, useEffect } from 'react'
import { X, ScanLine, Trash2, Check, AlertTriangle, Loader2, ImagePlus, Search, Link2, Link2Off, PackagePlus } from 'lucide-react'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

// ---------- Gemini helpers ----------

async function findBestModel() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}&pageSize=100`
  )
  if (!res.ok) throw new Error('ไม่สามารถดึงรายชื่อ model ได้ — ตรวจสอบ API key')
  const { models = [] } = await res.json()
  const candidates = models
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''))
    .sort((a, b) => {
      const score = m => {
        if (m.includes('2.5') && m.includes('flash')) return 5
        if (m.includes('2.5')) return 4
        if (m.includes('2.0') && m.includes('flash')) return 3
        if (m.includes('1.5') && m.includes('flash')) return 2
        if (m.includes('flash')) return 1
        return 0
      }
      return score(b) - score(a)
    })
  if (!candidates.length) throw new Error('ไม่พบ model ที่รองรับ generateContent')
  return candidates[0]
}

async function extractItemsFromImage(base64Data, mimeType) {
  const model = await findBestModel()
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: 'This is a grocery/shopping receipt. Extract all items that are NOT out of stock (ignore lines marked "สินค้าหมด" or crossed-out). Return ONLY a valid JSON array, no markdown fences, no explanation. Each element must have: {"name": "<product name as shown>", "quantity": <number>}. Use the actual ordered quantity shown. If quantity is unclear, use 1.',
            },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini ${res.status} (${model}): ${body}`)
  }
  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

// ---------- Fuzzy matching ----------

function fuzzyMatch(receiptName, products) {
  const name = receiptName.toLowerCase().trim()
  if (!name || !products.length) return null

  const exact = products.find(p => p.name.toLowerCase() === name)
  if (exact) return { product: exact, confidence: 'high' }

  const contains = products.find(p => {
    const pn = p.name.toLowerCase()
    return pn.includes(name) || name.includes(pn)
  })
  if (contains) return { product: contains, confidence: 'medium' }

  const words = name.split(/\s+/).filter(w => w.length >= 3)
  if (words.length) {
    let best = null, bestScore = 0
    for (const p of products) {
      const pWords = p.name.toLowerCase().split(/\s+/)
      const overlap = words.filter(w => pWords.some(pw => pw.includes(w) || w.includes(pw))).length
      const score = overlap / Math.max(words.length, pWords.length)
      if (score > bestScore) { bestScore = score; best = p }
    }
    if (bestScore >= 0.4 && best) return { product: best, confidence: 'low' }
  }

  return null
}

// ---------- Sub-components ----------

const CONFIDENCE_STYLE = {
  high:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  low:    'bg-amber-50 text-amber-700 border-amber-200',
  manual: 'bg-blue-50 text-blue-700 border-blue-200',
}

function MatchBadge({ confidence }) {
  if (confidence === 'manual') return <span className="text-xs text-blue-500 font-medium">เลือกเอง</span>
  if (confidence === 'high' || confidence === 'medium') return <span className="text-xs text-emerald-500 font-medium">จับคู่อัตโนมัติ</span>
  if (confidence === 'low') return <span className="text-xs text-amber-500 font-medium">อาจตรงกัน</span>
  return null
}

function ProductSearch({ products, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = products.filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode || '').includes(q)
  ).slice(0, 40)

  return (
    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-lg bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด..."
          className="flex-1 text-sm text-slate-700 outline-none"
        />
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-44 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-4">ไม่พบสินค้า</p>
        ) : filtered.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
          >
            <div className="text-sm font-medium text-slate-700 truncate">{p.name}</div>
            <div className="text-xs text-slate-400">
              สต๊อก {p.current_stock}{p.barcode ? ` · ${p.barcode}` : ''}{p.brand ? ` · ${p.brand}` : ''}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- Main component ----------

export default function ReceiptImportModal({ branch, existingProducts = [], onImport, onClose }) {
  const [step, setStep] = useState('upload')
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMime, setImageMime] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [searchingItemId, setSearchingItemId] = useState(null)
  const fileInputRef = useRef()

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') {
        if (searchingItemId !== null) setSearchingItemId(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, searchingItemId])

  const processFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น'); return }
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target.result
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
      setImageMime(file.type)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0])
  }, [processFile])

  const handleExtract = async () => {
    if (!imageBase64) return
    if (!GEMINI_KEY) { setError('ไม่พบ VITE_GEMINI_API_KEY — กรุณาเพิ่มค่านี้ใน .env'); return }
    setStep('extracting'); setError(null)
    try {
      const extracted = await extractItemsFromImage(imageBase64, imageMime)
      if (!Array.isArray(extracted) || extracted.length === 0) {
        setError('ไม่พบรายการสินค้าในภาพ กรุณาลองใหม่'); setStep('upload'); return
      }
      setItems(extracted.map((item, i) => {
        const name = String(item.name || '').trim()
        const match = fuzzyMatch(name, existingProducts)
        return {
          id: i,
          name,
          quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
          matchedProduct: match?.product ?? null,
          matchConfidence: match?.confidence ?? null,
        }
      }))
      setStep('confirm')
    } catch (err) {
      setError(`เกิดข้อผิดพลาด: ${err.message}`); setStep('upload')
    }
  }

  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))

  const setMatch = (id, product) => {
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, matchedProduct: product, matchConfidence: product ? 'manual' : null } : it
    ))
    setSearchingItemId(null)
  }

  const clearMatch = id =>
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, matchedProduct: null, matchConfidence: null } : it
    ))

  const removeItem = id => setItems(prev => prev.filter(it => it.id !== id))

  const handleConfirm = async () => {
    const valid = items.filter(i => i.name.trim() && i.quantity > 0)
    if (!valid.length) return
    setImporting(true)
    await onImport(valid.map(i => ({
      name: i.name,
      quantity: i.quantity,
      matchedProductId: i.matchedProduct?.id ?? null,
    })))
    setImporting(false)
  }

  const autoMatchCount = items.filter(i => i.matchedProduct && i.matchConfidence !== 'manual').length
  const manualMatchCount = items.filter(i => i.matchedProduct && i.matchConfidence === 'manual').length
  const newCount = items.filter(i => !i.matchedProduct).length

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-800">นำเข้าจากใบเสร็จ</h2>
              <p className="text-xs text-slate-500 mt-0.5">สาขา{branch} · สแกนใบเสร็จเพื่อเพิ่มสต๊อกอัตโนมัติ</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="p-6 space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-4 cursor-pointer transition-colors
                  ${dragOver ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => processFile(e.target.files[0])} />
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="max-h-72 max-w-full rounded-xl object-contain shadow-md" />
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                      <ImagePlus className="w-8 h-8 text-amber-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">วางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                      <p className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, WEBP</p>
                    </div>
                  </>
                )}
              </div>
              {imagePreview && (
                <button onClick={e => { e.stopPropagation(); setImagePreview(null); setImageBase64(null); setError(null) }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline">
                  เลือกรูปใหม่
                </button>
              )}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Extracting */}
          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <p className="text-sm font-medium text-slate-600">กำลังวิเคราะห์รายการสินค้าจากใบเสร็จ...</p>
              <p className="text-xs text-slate-400">อาจใช้เวลาสักครู่</p>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="p-6 space-y-4">

              {/* Summary pills */}
              <div className="flex flex-wrap gap-2">
                {autoMatchCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Link2 className="w-3 h-3" /> จับคู่อัตโนมัติ {autoMatchCount} รายการ
                  </span>
                )}
                {manualMatchCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Link2 className="w-3 h-3" /> เลือกเอง {manualMatchCount} รายการ
                  </span>
                )}
                {newCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <PackagePlus className="w-3 h-3" /> สร้างสินค้าใหม่ {newCount} รายการ
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400">
                แก้ไขชื่อหรือจำนวนได้ · คลิก <span className="font-semibold">เลือกสินค้า</span> เพื่อจับคู่กับสินค้าที่มีอยู่ · สินค้าที่ไม่มีคู่จะสร้างรายการใหม่
              </div>

              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-start gap-3 px-4 py-3">

                      {/* Left: name + match */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          value={item.name}
                          onChange={e => updateItem(item.id, 'name', e.target.value)}
                          className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-amber-400 outline-none pb-0.5 transition-colors"
                          placeholder="ชื่อสินค้า"
                        />

                        {/* Match row */}
                        {item.matchedProduct ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${CONFIDENCE_STYLE[item.matchConfidence]}`}>
                              <Link2 className="w-3 h-3" />
                              {item.matchedProduct.name}
                            </span>
                            <MatchBadge confidence={item.matchConfidence} />
                            <button
                              onClick={() => { setSearchingItemId(item.id === searchingItemId ? null : item.id) }}
                              className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                              เปลี่ยน
                            </button>
                            <button
                              onClick={() => clearMatch(item.id)}
                              className="text-xs text-red-400 hover:text-red-600 underline"
                            >
                              ยกเลิกการจับคู่
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <PackagePlus className="w-3 h-3" /> สร้างสินค้าใหม่
                            </span>
                            <button
                              onClick={() => setSearchingItemId(item.id === searchingItemId ? null : item.id)}
                              className="text-xs text-indigo-500 hover:text-indigo-700 underline font-medium"
                            >
                              เลือกสินค้าที่มีอยู่
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right: qty + delete */}
                      <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 text-right text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition-colors"
                        />
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline product search */}
                    {searchingItemId === item.id && (
                      <div className="border-t border-slate-100 px-4 pb-3 pt-2">
                        <ProductSearch
                          products={existingProducts}
                          onSelect={p => setMatch(item.id, p)}
                          onClose={() => setSearchingItemId(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {items.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-8">ไม่มีรายการ</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            ยกเลิก
          </button>
          {step === 'upload' && (
            <button onClick={handleExtract} disabled={!imageBase64}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <ScanLine className="w-4 h-4" />
              วิเคราะห์ใบเสร็จ
            </button>
          )}
          {step === 'confirm' && (
            <button onClick={handleConfirm} disabled={importing || items.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {importing ? 'กำลังนำเข้า...' : `ยืนยัน ${items.length} รายการ`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
