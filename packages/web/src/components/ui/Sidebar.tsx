import clsx from 'clsx'

interface NavItem { id: string; label: string; icon: string }

interface SidebarProps {
  rol: string
  seccion: string
  onChange: (s: string) => void
  onLogout: () => void
  nombreUsuario: string
  alertasPendientes?: number
  navItems: NavItem[]
}

export default function Sidebar({ rol, seccion, onChange, onLogout, nombreUsuario, alertasPendientes = 0, navItems }: SidebarProps) {
  const ROL_COLOR: Record<string,{bg:string;text:string}> = {
    padre:     { bg:'bg-emerald-100', text:'text-emerald-800' },
    terapeuta: { bg:'bg-purple-100',  text:'text-purple-800'  },
    docente:   { bg:'bg-amber-100',   text:'text-amber-800'   },
    admin:     { bg:'bg-red-100',     text:'text-red-800'     },
  }
  const rc = ROL_COLOR[rol] ?? ROL_COLOR.admin

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 py-6 px-3 fixed left-0 top-0">
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 text-sm font-bold">S</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">SensoryTEA</div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${rc.bg} ${rc.text}`}>{rol}</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => onChange(item.id)}
              className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left',
                seccion === item.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700')}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'alertas' && alertasPendientes > 0 && (
                <span className="ml-auto text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{alertasPendientes}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-gray-100 pt-4 px-3">
          <div className="text-xs text-gray-500 mb-2 truncate">{nombreUsuario}</div>
          <button onClick={onLogout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Cerrar sesión →</button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
        {navItems.map(item => (
          <button key={item.id} onClick={() => onChange(item.id)}
            className={clsx('flex-1 flex flex-col items-center gap-1 py-3 text-[10px] transition-all relative',
              seccion === item.id ? 'text-emerald-700' : 'text-gray-400')}>
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'alertas' && alertasPendientes > 0 && (
              <span className="absolute top-2 right-1/4 text-[9px] font-bold bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center">{alertasPendientes}</span>
            )}
          </button>
        ))}
      </nav>
    </>
  )
}
