import { Boxes, ExternalLink } from 'lucide-react'


export default function SetupGuide() {
  return (
    <div className="min-h-screen bg-slate-100 font-sans flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Boxes className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">ระบบจัดการสต๊อกสินค้า</h1>
            <p className="text-sm text-slate-400">ปาร์คอิน v2.0</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">ต้องกำหนดค่า Supabase ก่อนใช้งาน</p>
          <p className="text-sm text-amber-700">ยังไม่พบค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY</p>
        </div>

        <ol className="space-y-4 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="font-semibold text-slate-700">สร้างโปรเจกต์ใน Supabase</p>
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                supabase.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="font-semibold text-slate-700">รัน SQL Migration</p>
              <p className="text-slate-500 mt-0.5">ไปที่ SQL Editor แล้ว copy ไฟล์ <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">supabase/migrations/001_initial_schema.sql</code></p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p className="font-semibold text-slate-700">สร้างไฟล์ .env</p>
              <div className="bg-slate-900 text-green-400 rounded-lg px-3 py-2.5 mt-1.5 text-xs font-mono leading-relaxed">
                <div>VITE_SUPABASE_URL=https://xxx.supabase.co</div>
                <div>VITE_SUPABASE_ANON_KEY=eyJxxx...</div>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span>
            <div>
              <p className="font-semibold text-slate-700">รัน <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npm run dev</code></p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  )
}
