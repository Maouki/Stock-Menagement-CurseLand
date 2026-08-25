/**
 * Import Excel → Supabase products table
 *
 * Usage:
 *   node scripts/import-excel.js                          (uses สต๊อกสินค้า ปาร์คอิน.xlsx)
 *   node scripts/import-excel.js path/to/other.xlsx
 *   node scripts/import-excel.js --clear                  (deletes all products first)
 *   node scripts/import-excel.js path/to/file.xlsx --clear
 *
 * Column mapping (matches existing app.py):
 *   A=ลำดับ  B=บาร์โค้ด  C=ประเภทหลัก  D=ประเภทย่อย  E=ชื่อสินค้า
 *   F=Brand  G=Lab  H=Lot  I=วันหมดอายุ  J=สต๊อกตั้งต้น  K=สต๊อกคงเหลือ
 *   Data starts at row 3 (row 1=headers, row 2=category label)
 */

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT   = resolve(__dir, '..')

// ── Load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const path = resolve(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv()

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) {
  console.error('\n❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  console.error('   Make sure your .env file exists and has both variables.\n')
  process.exit(1)
}

const supabase = createClient(URL, KEY)

// ── CLI args ─────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2)
const clear   = args.includes('--clear')
const fileArg = args.find(a => !a.startsWith('--'))

const EXCEL = fileArg
  ? resolve(fileArg)
  : resolve(ROOT, 'สต๊อกสินค้า ปาร์คอิน.xlsx')

if (!existsSync(EXCEL)) {
  console.error(`\n❌  File not found: ${EXCEL}`)
  console.error('   Pass the path as the first argument, e.g.:')
  console.error('   node scripts/import-excel.js "C:/path/to/file.xlsx"\n')
  process.exit(1)
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function str(v) {
  if (v === null || v === undefined) return ''
  const s = String(v).trim()
  return s === 'None' ? '' : s
}

function num(v, fallback = 0) {
  const n = parseInt(v)
  return isNaN(n) ? fallback : Math.max(0, n)
}

function parseDate(v) {
  if (!v) return null
  // Excel numeric serial date
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  if (v instanceof Date) return v.toISOString().split('T')[0]
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d)) return d.toISOString().split('T')[0]
  }
  return null
}

// ── Parse one sheet ──────────────────────────────────────────────────────────
function parseSheet(ws, sheetName) {
  const ref = ws['!ref']
  if (!ref) return []

  const range = XLSX.utils.decode_range(ref)
  const rows  = []

  // Row 3 = index 2 (0-based), matching DATA_START_ROW = 3 in app.py
  for (let r = 2; r <= range.e.r; r++) {
    const cell = (col) => {
      const c = ws[XLSX.utils.encode_cell({ r, c: col })]
      return c ? c.v : null
    }

    const name = str(cell(4)) // column E
    if (!name) continue       // skip rows without product name

    rows.push({
      barcode:       str(cell(1)),      // B
      main_category: str(cell(2)),      // C
      sub_category:  str(cell(3)),      // D
      name,                             // E
      brand:         str(cell(5)),      // F
      lab:           str(cell(6)),      // G
      lot:           str(cell(7)),      // H
      expiry:        parseDate(cell(8)),// I
      initial_stock: num(cell(9)),      // J
      current_stock: num(cell(10)),     // K
      min_stock:     10,
      group_name:    sheetName,
    })
  }

  return rows
}

// ── Insert rows in batches ───────────────────────────────────────────────────
async function insertBatch(rows, sheetName) {
  const BATCH = 100
  let ok = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('products').insert(slice)
    if (error) {
      console.error(`  ❌  Batch ${Math.floor(i / BATCH) + 1} failed: ${error.message}`)
    } else {
      ok += slice.length
    }
  }

  return ok
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📂  File  : ${EXCEL}`)
  console.log(`🌐  Project: ${URL}\n`)

  if (clear) {
    process.stdout.write('🗑️   Clearing existing products... ')
    const { error } = await supabase.from('products').delete().neq('id', 0)
    if (error) { console.error('\n❌  Clear failed:', error.message); process.exit(1) }
    console.log('done\n')
  }

  const wb = XLSX.readFile(EXCEL, { cellDates: false })
  console.log(`📋  Sheets : ${wb.SheetNames.join(', ')}\n`)

  let total = 0

  for (const sheetName of wb.SheetNames) {
    const rows = parseSheet(wb.Sheets[sheetName], sheetName)

    if (rows.length === 0) {
      console.log(`  ⚠️  "${sheetName}" — no data rows, skipped`)
      continue
    }

    process.stdout.write(`  📥  "${sheetName}" (${rows.length} rows)... `)
    const inserted = await insertBatch(rows, sheetName)
    console.log(`✅  ${inserted} inserted`)
    total += inserted
  }

  console.log(`\n🎉  Finished — ${total} products imported to Supabase\n`)
}

main().catch(err => {
  console.error('\n❌  Fatal:', err.message)
  process.exit(1)
})
