import clsx from 'clsx'

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={clsx('bg-white border border-gray-100 rounded-xl p-4 shadow-sm', onClick && 'cursor-pointer hover:border-gray-300 transition-colors', className)}>
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">{children}</div>
}

const TIPO_CONFIG = {
  incidente:    { label: 'Incidente',        bg: 'bg-red-100',    text: 'text-red-700'    },
  logro:        { label: 'Logro',            bg: 'bg-green-100',  text: 'text-green-700'  },
  observacion:  { label: 'Observación',      bg: 'bg-blue-100',   text: 'text-blue-700'   },
  comunicacion: { label: 'Comunicación',     bg: 'bg-purple-100', text: 'text-purple-700' },
  sensorial:    { label: 'Ev. sensorial',    bg: 'bg-orange-100', text: 'text-orange-700' },
  custom:        { label: 'Personalizado',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  aporte_padre:  { label: 'Aporte del padre', bg: 'bg-emerald-100', text: 'text-emerald-700' },
} as const

export function TipoBadge({ tipo }: { tipo: keyof typeof TIPO_CONFIG }) {
  const cfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.observacion
  return <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>{cfg.label}</span>
}

const SEV_CONFIG = {
  1: { label: 'Muy leve',  bg: 'bg-green-100',  text: 'text-green-700'  },
  2: { label: 'Leve',      bg: 'bg-teal-100',   text: 'text-teal-700'   },
  3: { label: 'Moderado',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  4: { label: 'Alto',      bg: 'bg-orange-100', text: 'text-orange-700' },
  5: { label: 'Crítico',   bg: 'bg-red-100',    text: 'text-red-700'    },
} as const

export function SevBadge({ sev }: { sev: 1 | 2 | 3 | 4 | 5 }) {
  const cfg = SEV_CONFIG[sev]
  return <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>Sev {sev} — {cfg.label}</span>
}

const SEV_COLORS = ['#639922','#1D9E75','#EF9F27','#D85A30','#E24B4A']
export function SevDots({ sev }: { sev: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => <div key={i} className="w-2 h-2 rounded-full" style={{ background: i <= sev ? SEV_COLORS[sev-1] : '#E5E7EB' }} />)}
    </div>
  )
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{children}</span>
}

export function BtnPrimary({ children, onClick, disabled = false, className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} className={clsx('px-4 py-2 rounded-full text-sm font-medium text-white bg-[#1D9E75] transition-all', disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#085041] active:scale-95', className)}>
      {children}
    </button>
  )
}

export function BtnGhost({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={clsx('px-4 py-2 rounded-full text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors', className)}>
      {children}
    </button>
  )
}

export function ProgressRing({ value, color, label, size = 64 }: { value: number; color: string; label: string; size?: number }) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        <text x={size/2} y={size/2+5} textAnchor="middle" fontSize="13" fontWeight="600" fill="#111827">{value}</text>
      </svg>
      <span className="text-[11px] text-gray-500 text-center">{label}</span>
    </div>
  )
}

export function tiempoRelativo(fecha: Date): string {
  const diff = Math.floor((Date.now() - fecha.getTime()) / 60000)
  if (diff < 1)  return 'Ahora'
  if (diff < 60) return `Hace ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `Hace ${h}h`
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}
