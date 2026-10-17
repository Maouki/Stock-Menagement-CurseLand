import { useEffect, useMemo, useRef, useState } from 'react'
import './HalloweenScene.css'

// Deterministic PRNG so trees/stars look the same on every render
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ───────── Dead tree generator ─────────
// Tree lives in a 300×300 viewBox with the trunk rooted at (150, 300).
function buildTree(seed, { maxDepth = 6, crowCount = 0 } = {}) {
  const rand = mulberry32(seed)
  const segs = []
  const perches = []

  const grow = (x, y, ang, len, w, depth) => {
    const x2 = x + Math.sin(ang) * len
    const y2 = y - Math.cos(ang) * len
    const bend = (rand() - 0.5) * len * 0.35
    const cx = (x + x2) / 2 + Math.cos(ang) * bend
    const cy = (y + y2) / 2 + Math.sin(ang) * bend
    segs.push({
      d: `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      w: Math.max(w, 0.7),
      depth,
    })

    // Fairly horizontal, still-thick branches make good perches
    const a = Math.abs(ang)
    if (depth >= 1 && depth <= 4 && a > 0.65 && a < 1.9 && w > 1.5) {
      const t = 0.5 + rand() * 0.3
      const px = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * x2
      const py = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * y2
      perches.push({ x: px, y: py - w / 2, facing: Math.sin(ang) >= 0 ? 1 : -1 })
    }

    if (depth >= maxDepth || len < 6) return
    const kids = depth === 0 ? 2 : rand() < 0.3 ? 3 : 2
    for (let i = 0; i < kids; i++) {
      const side = kids === 2 ? (i === 0 ? -1 : 1) : i - 1
      const spread = 0.35 + rand() * 0.45
      const lean = depth > 1 ? ang * 0.15 : 0
      grow(
        x2, y2,
        ang + side * spread + lean + (rand() - 0.5) * 0.2,
        len * (0.66 + rand() * 0.14),
        w * 0.66,
        depth + 1,
      )
    }
  }
  grow(150, 300, (rand() - 0.5) * 0.12, 78 + rand() * 14, 13, 0)

  // Pick spread-out perches for the crows
  const shuffled = perches
    .map(p => ({ p, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .map(o => o.p)
  const crows = []
  for (const p of shuffled) {
    if (crows.length >= crowCount) break
    if (crows.every(c => Math.hypot(c.x - p.x, c.y - p.y) > 32)) {
      const facing = rand() < 0.75 ? p.facing : -p.facing
      crows.push({
        ...p,
        facing,
        dx: facing * (220 + rand() * 380),
        dy: -(180 + rand() * 260),
        delay: rand() * 0.25,
        idleDelay: rand() * 7,
      })
    }
  }
  return { segs, crows }
}

// ───────── Crow sprites ─────────
function PerchedCrow({ facing, idleDelay }) {
  return (
    <svg viewBox="0 0 40 32" className="hw-crow-perched" style={{ animationDelay: `${idleDelay}s` }}>
      <g transform={facing < 0 ? 'translate(40 0) scale(-1 1)' : undefined}>
        <path fill="#050506" stroke="rgba(150,145,175,0.45)" strokeWidth="0.7"
          d="M3 25 L12 19 C13 13 19 9 26 9 C28 5 32 4 34.5 7 L40 8.6 L34.6 10.2 C34.8 14 33 18 29 21 C25 24 18 25 13 24 Z" />
        <path stroke="#050506" strokeWidth="1.4" strokeLinecap="round" d="M21 23 L20 31 M25 23 L25.5 31" />
        <circle cx="32.3" cy="7.4" r="0.95" fill="#ff3b2f" opacity="0.85" />
      </g>
    </svg>
  )
}

function FlyingCrow() {
  return (
    <svg viewBox="0 0 40 24" className="hw-crow-flying">
      <path fill="#050506" stroke="rgba(150,145,175,0.45)" strokeWidth="0.7"
        d="M20 11 C16 5 9 2 0 3.5 C7 6.5 11 9.5 13 14 C16 13 18 14 20 16.5 C22 14 24 13 27 14 C29 9.5 33 6.5 40 3.5 C31 2 24 5 20 11 Z" />
      <circle cx="20" cy="11.5" r="2.4" fill="#050506" />
    </svg>
  )
}

// ───────── Tree with crows ─────────
function DeadTree({ seed, className, style, color, maxDepth, crowCount = 0 }) {
  const { segs, crows } = useMemo(
    () => buildTree(seed, { maxDepth, crowCount }),
    [seed, maxDepth, crowCount],
  )
  const [phase, setPhase] = useState('perched') // perched → flying → gone → landing → perched
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const scare = () => {
    if (phase !== 'perched' || crows.length === 0) return
    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
    const comeBack = 5000 + Math.random() * 4000
    setPhase('flying')
    later(() => setPhase('gone'), 2600)
    later(() => setPhase('landing'), comeBack)
    later(() => { setPhase('perched'); timers.current = [] }, comeBack + 1800)
  }

  return (
    <div className={`hw-tree ${className}`} style={style}>
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <g stroke={color} fill="none" strokeLinecap="round">
          {segs.map((s, i) => <path key={i} d={s.d} strokeWidth={s.w} />)}
        </g>
        {crows.length > 0 && (
          <g stroke="transparent" fill="none" strokeLinecap="round"
            className="hw-tree-hit" onPointerEnter={scare}>
            {segs.filter(s => s.depth <= 4).map((s, i) => (
              <path key={i} d={s.d} strokeWidth={s.w + 14} />
            ))}
          </g>
        )}
      </svg>

      {crows.map((c, i) => (
        <div key={i}
          className={`hw-crow is-${phase}`}
          style={{
            left: `${(c.x / 300) * 100}%`,
            top: `${(c.y / 300) * 100}%`,
            '--dx': `${c.dx}px`,
            '--dy': `${c.dy}px`,
            '--lx': `${-c.dx * 0.4}px`,
            animationDelay: phase === 'flying' ? `${c.delay}s` : phase === 'landing' ? `${c.delay * 2}s` : undefined,
          }}
        >
          <PerchedCrow facing={c.facing} idleDelay={c.idleDelay} />
          <FlyingCrow />
        </div>
      ))}
    </div>
  )
}

// ───────── Castle ─────────
const CASTLE = '#0c0c0f'

const archPath = (x, y, w, h) =>
  `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`

const WINDOWS = [
  // x, y, w, h, delay(s), duration(s), blink
  [52, 212, 18, 30, 0.0, 3.2],
  [52, 292, 18, 30, 1.1, 3.8],
  [186, 150, 20, 34, 0.5, 2.9],
  [319, 176, 22, 36, 1.7, 3.5],
  [319, 262, 22, 36, 0.0, 0, true],
  [319, 348, 22, 36, 2.3, 4.1],
  [125, 282, 18, 30, 0.8, 3.3],
  [158, 282, 18, 30, 2.0, 3.6],
  [232, 282, 18, 30, 1.4, 3.0],
  [264, 282, 18, 30, 0.3, 4.2],
  [125, 360, 18, 30, 2.6, 3.4],
  [264, 360, 18, 30, 1.0, 0, true],
  [256, 210, 12, 22, 1.9, 2.7],
  [114, 214, 12, 20, 0.6, 3.9],
  [11, 332, 12, 20, 2.2, 3.1],
]

function Castle() {
  return (
    <div className="hw-castle" aria-hidden="true">
      <div className="hw-castle-aura" />
      <svg viewBox="-8 -2 416 522" className="relative w-full h-auto">
        <defs>
          {/* Blur only used for the 2 blink windows */}
          <filter id="hw-win-blur" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <linearGradient id="hw-win-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#d9dde6" />
          </linearGradient>
        </defs>

        <g fill={CASTLE}>
          {/* Outer curtain wall + battlements */}
          <rect x="0" y="384" width="400" height="140" />
          {Array.from({ length: 14 }, (_, i) => <rect key={`w${i}`} x={i * 29} y="370" width="15" height="15" />)}
          {/* Far-left buttress tower */}
          <rect x="0" y="302" width="34" height="220" />
          <polygon points="-6,304 17,250 40,304" />
          {/* Left tower */}
          <rect x="30" y="180" width="64" height="340" />
          <polygon points="20,182 62,62 104,182" />
          <rect x="60.5" y="30" width="3" height="34" />
          <path d="M63.5 31 L84 37 L63.5 43 Z" />
          {/* Keep + battlements */}
          <rect x="100" y="240" width="192" height="280" />
          {Array.from({ length: 8 }, (_, i) => <rect key={`k${i}`} x={100 + i * 25.4} y="226" width="14" height="16" />)}
          {/* Small turrets on keep */}
          <rect x="108" y="200" width="24" height="44" />
          <polygon points="103,202 120,158 137,202" />
          <rect x="248" y="196" width="28" height="50" />
          <polygon points="242,198 262,146 282,198" />
          {/* Central spire tower */}
          <rect x="165" y="120" width="62" height="130" />
          <polygon points="155,122 196,0 237,122" />
          {/* Right tower */}
          <rect x="292" y="140" width="76" height="380" />
          <polygon points="280,142 330,22 380,142" />
          <rect x="328.5" y="-2" width="3" height="26" />
          <path d="M331.5 -1 L352 5 L331.5 11 Z" />
        </g>

        {/* Gate */}
        <path d={archPath(176, 440, 40, 80)} fill="#050506" />
        <path d="M186 452V520M196 444V520M206 452V520M176 470H216M176 492H216"
          stroke="#1b1b21" strokeWidth="2" />

        {/* Windows — halos are static ambient glow except for the 2 blink windows */}
        {WINDOWS.map(([x, y, w, h, delay, dur, blink], i) => {
          const cls = blink ? ' is-blink' : ''
          const winStyle = { animationDelay: `${delay}s`, animationDuration: `${dur}s` }
          const d = archPath(x, y, w, h)
          return (
            <g key={i}>
              <path d={d} fill="#ffffff"
                filter={blink ? 'url(#hw-win-blur)' : undefined}
                className={`hw-window-halo${cls}`}
                style={blink ? { animationDelay: `${delay}s` } : undefined}
              />
              <path d={d} fill="url(#hw-win-fill)" className={`hw-window${cls}`} style={winStyle} />
              <path d={`M${x + w / 2} ${y + 2}V${y + h}M${x} ${y + h * 0.55}H${x + w}`}
                stroke={CASTLE} strokeWidth="1.6" />
            </g>
          )
        })}

        {/* Rose window — static halo */}
        <circle cx="196" cy="330" r="22" fill="#ffffff" className="hw-window-halo" />
        <circle cx="196" cy="330" r="16" fill="url(#hw-win-fill)" className="hw-window"
          style={{ animationDelay: '1.3s', animationDuration: '4.5s' }} />
        <path d="M196 314V346M180 330H212M184.7 318.7L207.3 341.3M207.3 318.7L184.7 341.3"
          stroke={CASTLE} strokeWidth="1.6" />
      </svg>
    </div>
  )
}

// ───────── Bats ─────────
function Bat({ size, flap }) {
  return (
    <svg viewBox="0 0 100 40" width={size} height={size * 0.4} style={{ animationDuration: `${flap}s` }}>
      <path fill="#0a0a0d"
        d="M50 14 C47 8 44 8 43 12 C36 6 24 4 10 8 C16 12 18 18 16 24 C22 20 28 22 30 28 C34 22 40 22 43 26 C45 24 47 25 50 30 C53 25 55 24 57 26 C60 22 66 22 70 28 C72 22 78 20 84 24 C82 18 84 12 90 8 C76 4 64 6 57 12 C56 8 53 8 50 14 Z M46.5 11 L45.5 5 L49 10 Z M53.5 11 L54.5 5 L51 10 Z" />
    </svg>
  )
}

function BatFlocks() {
  const [flocks, setFlocks] = useState([])

  useEffect(() => {
    if (prefersReducedMotion()) return
    const timers = new Set()
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn() }, ms)
      timers.add(t)
    }
    const spawn = () => {
      const r = Math.random
      const id = `${Date.now()}-${r()}`
      const duration = 7 + r() * 4
      const flock = {
        id,
        duration,
        rev: r() < 0.5,
        top: 5 + r() * 35,
        bats: Array.from({ length: 4 + Math.floor(r() * 6) }, () => ({
          dx: r() * 160,
          dy: (r() - 0.5) * 90,
          delay: r() * 1.4,
          size: 18 + r() * 20,
          flap: 0.16 + r() * 0.12,
          bob: 0.9 + r() * 1.1,
        })),
      }
      setFlocks(f => [...f, flock])
      later(() => setFlocks(f => f.filter(x => x.id !== id)), (duration + 2) * 1000)
      later(spawn, 7000 + r() * 9000)
    }
    later(spawn, 2500)
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="hw-bats" aria-hidden="true">
      {flocks.map(f => (
        <div key={f.id} className="hw-flock" style={{ top: `${f.top}%` }}>
          {f.bats.map((b, i) => (
            <div key={i}
              className={`hw-bat${f.rev ? ' is-rev' : ''}`}
              style={{
                animationDuration: `${f.duration}s`,
                animationDelay: `${b.delay}s`,
                marginTop: b.dy,
                marginLeft: f.rev ? b.dx : -b.dx,
              }}
            >
              <div className="hw-bat-bob" style={{ animationDuration: `${b.bob}s` }}>
                <Bat size={b.size} flap={b.flap} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ───────── Torch cursor glow ─────────
// Rendered outside the scene so it can light up the login card too.
export function TorchGlow() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    let x = 0
    let y = 0
    const place = () => {
      frame = 0
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    const move = e => {
      if (e.pointerType === 'touch') return
      x = e.clientX
      y = e.clientY
      el.classList.add('is-lit')
      if (!frame) frame = requestAnimationFrame(place)
    }
    const hide = () => el.classList.remove('is-lit')
    window.addEventListener('pointermove', move)
    document.documentElement.addEventListener('pointerleave', hide)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', hide)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={ref} className="hw-torch" aria-hidden="true">
      <div className="hw-torch-halo" />
      <div className="hw-torch-core" />
    </div>
  )
}

// ───────── Ground & tall grass ─────────
// Ground surface in a 1000×200 viewBox, stretched to the full width.
const GROUND_CURVES = [
  [[0, 150], [150, 128], [300, 160], [450, 146]],
  [[450, 146], [600, 132], [650, 108], [760, 92]],
  [[760, 92], [850, 78], [950, 86], [1000, 96]],
]
const GROUND_PATH = 'M0 200V150C150 128 300 160 450 146C600 132 650 108 760 92C850 78 950 86 1000 96V200Z'

const groundSamples = (() => {
  const pts = []
  for (const [p0, p1, p2, p3] of GROUND_CURVES) {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, u = 1 - t
      pts.push([
        u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
        u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
      ])
    }
  }
  return pts
})()

const groundY = x => {
  const i = groundSamples.findIndex(p => p[0] >= x)
  if (i <= 0) return groundSamples[Math.max(i, 0)][1]
  const [x0, y0] = groundSamples[i - 1]
  const [x1, y1] = groundSamples[i]
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1)
}

// Blades are grouped into tufts so each tuft sways as one
function buildGrass(seed, { tufts, minH, maxH, sink }) {
  const rand = mulberry32(seed)
  return Array.from({ length: tufts }, () => {
    const cx = rand() * 1010 - 5
    const base = groundY(cx) + sink
    let d = ''
    const blades = 4 + Math.floor(rand() * 5)
    for (let b = 0; b < blades; b++) {
      const x = cx + (rand() - 0.5) * 10
      const h = minH + rand() * (maxH - minH)
      const lean = (rand() - 0.5) * h * 0.7
      const w = 1.2 + rand() * 1.4
      const tx = x + lean
      const ty = base - h
      d += `M${(x - w).toFixed(1)} ${(base + 3).toFixed(1)}` +
        `Q${(x + lean * 0.25).toFixed(1)} ${(base - h * 0.55).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}` +
        `Q${(x + lean * 0.25 + w).toFixed(1)} ${(base - h * 0.5).toFixed(1)} ${(x + w).toFixed(1)} ${(base + 3).toFixed(1)}Z`
    }
    return { d, delay: -rand() * 5, dur: 4 + rand() * 3 }
  })
}

function Grass({ seed, className = '', color, tufts: count, minH, maxH, sink }) {
  const tufts = useMemo(
    () => buildGrass(seed, { tufts: count, minH, maxH, sink }),
    [seed, count, minH, maxH, sink],
  )
  return (
    <svg className={`hw-ground ${className}`} viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
      <g fill={color}>
        {tufts.map((t, i) => (
          <path key={i} d={t.d} className="hw-grass-tuft"
            style={{ animationDelay: `${t.delay}s`, animationDuration: `${t.dur}s` }} />
        ))}
      </g>
    </svg>
  )
}

// ───────── Scene ─────────
const BACK_TREES = [
  { seed: 101, left: '13vw', width: 'clamp(110px, 12vw, 200px)' },
  { seed: 202, left: '38vw', width: 'clamp(120px, 14vw, 230px)' },
  { seed: 303, left: '57vw', width: 'clamp(100px, 11vw, 180px)' },
  { seed: 404, left: '73vw', width: 'clamp(110px, 13vw, 210px)' },
  { seed: 505, left: '89vw', width: 'clamp(100px, 12vw, 190px)' },
]

const FRONT_TREES = [
  { seed: 11, style: { left: '-12vw', width: 'clamp(300px, 42vw, 680px)' }, crows: 5 },
  { seed: 27, style: { left: '27vw', width: 'clamp(200px, 24vw, 400px)' }, crows: 3 },
  { seed: 43, style: { left: '44vw', width: 'clamp(220px, 27vw, 440px)' }, crows: 4 },
  { seed: 58, style: { right: '-10vw', width: 'clamp(220px, 26vw, 420px)' }, crows: 3 },
]

export default function HalloweenScene() {
  const stars = useMemo(() => {
    const r = mulberry32(7)
    return Array.from({ length: 28 }, () => ({
      top: r() * 55,
      left: r() * 100,
      size: 1 + r() * 1.6,
      delay: r() * 4,
      dur: 2.5 + r() * 3,
    }))
  }, [])

  return (
    <div className="hw-scene">
      {stars.map((s, i) => (
        <span key={i} className="hw-star" style={{
          top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size,
          animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`,
        }} />
      ))}
      <div className="hw-moon" />

      {BACK_TREES.map(t => (
        <DeadTree key={t.seed} seed={t.seed} maxDepth={5} color="#1f1f25"
          className="is-back" style={{ left: t.left, width: t.width, transform: 'translateX(-50%)' }} />
      ))}

      <Castle />

      <svg className="hw-ground" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#0a0a0c" d={GROUND_PATH} />
      </svg>
      <Grass seed={71} color="#0d0d10" tufts={55} minH={14} maxH={34} sink={0} />

      {FRONT_TREES.map(t => (
        <DeadTree key={t.seed} seed={t.seed} crowCount={t.crows} color="#060607"
          className="is-front" style={t.style} />
      ))}

      <Grass seed={93} className="is-front-grass" color="#060607" tufts={40} minH={22} maxH={52} sink={14} />

      <div className="hw-fog" />
      <div className="hw-fog is-slow" />

      <BatFlocks />
    </div>
  )
}
