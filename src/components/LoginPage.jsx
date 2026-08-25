import { useState } from 'react'
import { Boxes, Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const ok = onLogin(username.trim(), password)
    if (!ok) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      setPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen font-sans flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
      <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #a5b4fc, transparent)' }} />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="px-8 pt-10 pb-8 text-center"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)' }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Boxes className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              Stocks CursedLand
            </h1>
            <p className="text-indigo-300 text-sm mt-1 font-medium">Park-in</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-70 active:scale-[0.98]"
              style={{ background: loading ? '#6366f1' : 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>

        <p className="text-center text-indigo-300/60 text-xs mt-6">
          ระบบจัดการสต๊อกสินค้า © 2026
        </p>
      </div>
    </div>
  )
}
