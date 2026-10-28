import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import logo from '../assets/logo.png'
import HalloweenScene, { TorchGlow } from './HalloweenScene'

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
    try {
      const err = await onLogin(username.trim(), password)
      if (err) {
        setError(err)
        setPassword('')
      }
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen font-sans relative overflow-hidden" style={{ background: '#1A1A1D' }}>
      <HalloweenScene />

      <div className="relative z-20 min-h-screen flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-sm pointer-events-auto animate-fade-in">
          {/* Card */}
          <div className="rounded-3xl overflow-hidden border border-white/10 backdrop-blur-md"
            style={{
              background: 'rgba(22, 22, 25, 0.82)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 70px rgba(255,255,255,0.04)',
            }}
          >
            {/* Header */}
            <div className="px-8 pt-10 pb-6 text-center border-b border-white/5">
{/* Recolor the black-on-white logo: white → page bg #1A1A1D, black → white */}
              <svg width="0" height="0" className="absolute" aria-hidden="true">
                <filter id="logo-recolor" colorInterpolationFilters="sRGB">
                  <feColorMatrix type="saturate" values="0" />
                  <feComponentTransfer>
                    <feFuncR type="table" tableValues="1 0.102" />
                    <feFuncG type="table" tableValues="1 0.102" />
                    <feFuncB type="table" tableValues="1 0.114" />
                  </feComponentTransfer>
                </filter>
              </svg>
              <img
                src={logo}
                alt="CursedLand แดนต้องสาป"
                className="w-28 h-28 rounded-full mx-auto mb-4 object-cover"
                style={{ filter: 'url(#logo-recolor) drop-shadow(0 0 14px rgba(255,255,255,0.25))' }}
              />
              <h1 className="text-2xl font-bold leading-tight text-white"
                style={{ textShadow: '0 0 18px rgba(255,255,255,0.35)' }}
              >
                Stocks CursedLand
              </h1>
              
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="ชื่อผู้ใช้"
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full bg-[#111113] border border-[#2c2c32] text-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/70 focus:ring-2 focus:ring-white/15 transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
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
                    className="w-full bg-[#111113] border border-[#2c2c32] text-slate-100 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-white/70 focus:ring-2 focus:ring-white/15 transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-900/70 text-red-300 text-sm rounded-xl px-4 py-3 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#1A1A1D] font-bold text-sm transition-all disabled:opacity-70 active:scale-[0.98] hover:bg-slate-200"
                style={{ boxShadow: '0 8px 24px rgba(255,255,255,0.12)' }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#1A1A1D]/30 border-t-[#1A1A1D] rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-500 text-xs mt-6">
            ระบบจัดการสต๊อกสินค้า © 2026
          </p>
        </div>
      </div>
      <TorchGlow />
    </div>
  )
}
