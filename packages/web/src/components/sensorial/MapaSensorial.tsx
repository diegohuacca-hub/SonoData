import { useState, useEffect, useMemo } from 'react'
import { Card, SectionLabel, BtnPrimary, BtnGhost } from '../ui/Common'
import { CANALES_CONFIG, REACCIONES_OPTS, ESTRATEGIAS_OPTS, type EstimuloSensorial, type CanalSensorial } from '../../store/demo.data'
import { escucharMapaSensorial } from '../../services/sensorial.service'
import { useAuthStore } from '../../store/auth.store'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'

const ALUMNO_ID = 'alumno_001'

const TIERS = [
  { min:9, max:10, label:'Crítico',  color:'#E24B4A', bg:'#FCEBEB', tc:'#501313' },
  { min:7, max:8,  label:'Alto',     color:'#D85A30', bg:'#FAECE7', tc:'#4A1B0C' },
  { min:5, max:6,  label:'Moderado', color:'#EF9F27', bg:'#FAEEDA', tc:'#412402' },
  { min:3, max:4,  label:'Leve',     color:'#639922', bg:'#EAF3DE', tc:'#173404' },
  { min:1, max:2,  label:'Mínimo',   color:'#378ADD', bg:'#E6F1FB', tc:'#042C53' },
]

interface GuiaTerapeuta {
  rutinas: string
  evitar: string
  estrategias: string
  comunicacion: string
  apoyos: string
  notas: string
  publicada: boolean
  fechaActualizacion?: Date
  generadaPorIA?: boolean
}

const GUIA_VACIA: GuiaTerapeuta = {
  rutinas: '', evitar: '', estrategias: '',
  comunicacion: '', apoyos: '', notas: '', publicada: false,
}

const SECCIONES = [
  { key:'rutinas',      label:'🕐 Rutinas recomendadas',       placeholder:'Ej: Zona de descompresión de 20-30 min al llegar del colegio...' },
  { key:'evitar',       label:'🚨 Qué evitar',                 placeholder:'Ej: Evitar exposición al timbre sin anticipación...' },
  { key:'estrategias',  label:'✅ Estrategias de manejo',      placeholder:'Ej: Ante sobrecarga auditiva: auriculares + rincón de calma...' },
  { key:'comunicacion', label:'💬 Comunicación con el alumno', placeholder:'Ej: Usar frases cortas y directas. Dar tiempo de respuesta...' },
  { key:'apoyos',       label:'💪 Apoyos positivos',           placeholder:'Ej: Bloques LEGO como regulador post-colegio (20-30 min)...' },
  { key:'notas',        label:'📝 Notas adicionales',          placeholder:'Cualquier observación adicional para la familia...' },
]

export default function MapaSensorial() {
  const { usuario } = useAuthStore()
  const [tab, setTab]             = useState<'tierlist'|'radar'|'guia'>('tierlist')
  const [estimulos, setEstimulos] = useState<EstimuloSensorial[]>([])
  const [cargando, setCargando]   = useState(true)
  const [filtroCanal, setFiltroCanal] = useState<CanalSensorial|'todos'>('todos')
  const [selEstimulo, setSelEstimulo] = useState<string|null>(null)
  const [guia, setGuia]               = useState<GuiaTerapeuta>(GUIA_VACIA)
  const [guiaEditando, setGuiaEditando] = useState<GuiaTerapeuta>(GUIA_VACIA)
  const [modoEdicion, setModoEdicion]   = useState(false)
  const [guardandoGuia, setGuardandoGuia] = useState(false)
  const [generandoIA, setGenerandoIA]     = useState(false)
  const [guiaCargada, setGuiaCargada]     = useState(false)

  const esTerapeuta = usuario?.rol === 'terapeuta'
  const esPadre     = usuario?.rol === 'padre'

  useEffect(() => {
    const unsub = escucharMapaSensorial((data) => { setEstimulos(data); setCargando(false) })
    cargarGuia()
    return unsub
  }, [])

  async function cargarGuia() {
    try {
      const snap = await getDoc(doc(db, 'alumnos', ALUMNO_ID, 'config', 'guia_padre'))
      if (snap.exists()) {
        const data = snap.data()
        const g: GuiaTerapeuta = {
          rutinas:      data.rutinas      ?? '',
          evitar:       data.evitar       ?? '',
          estrategias:  data.estrategias  ?? '',
          comunicacion: data.comunicacion ?? '',
          apoyos:       data.apoyos       ?? '',
          notas:        data.notas        ?? '',
          publicada:    data.publicada    ?? false,
          generadaPorIA: data.generadaPorIA ?? false,
          fechaActualizacion: data.fechaActualizacion instanceof Timestamp ? data.fechaActualizacion.toDate() : undefined,
        }
        setGuia(g); setGuiaEditando(g)
      }
      setGuiaCargada(true)
    } catch(e) { setGuiaCargada(true) }
  }

  async function guardarGuia(publicar: boolean) {
    setGuardandoGuia(true)
    try {
      const datos = { ...guiaEditando, publicada: publicar, fechaActualizacion: new Date(), actualizadoPor: `${usuario?.nombre} ${usuario?.apellidos}` }
      await setDoc(doc(db, 'alumnos', ALUMNO_ID, 'config', 'guia_padre'), datos)
      setGuia({ ...datos }); setModoEdicion(false)
    } catch(e) { console.error(e) }
    finally { setGuardandoGuia(false) }
  }

  async function generarConIA() {
    setGenerandoIA(true)
    try {
      const criticos  = estimulos.filter(e => e.impacto >= 9)
      const altos     = estimulos.filter(e => e.impacto >= 7 && e.impacto < 9)
      const positivos = estimulos.filter(e => e.impacto <= 2)
      const moderados = estimulos.filter(e => e.impacto >= 3 && e.impacto < 7)

      const prompt = `Eres un terapeuta especializado en TEA. Genera una guía práctica para los padres de Mateo Mendoza (7 años, TEA nivel 1).

PERFIL SENSORIAL:
- Críticos (9-10): ${criticos.map(e=>`${e.nombre}`).join(', ') || 'ninguno'}
- Alto impacto (7-8): ${altos.map(e=>`${e.nombre} — estrategias: ${e.estrategias?.join(', ')}`).join(' | ') || 'ninguno'}
- Moderados: ${moderados.map(e=>e.nombre).join(', ') || 'ninguno'}
- Reguladores positivos: ${positivos.map(e=>`${e.nombre}: ${e.notas}`).join(' | ') || 'ninguno'}

Genera contenido para cada sección en lenguaje simple para padres sin formación clínica. Máximo 4 oraciones por sección.
Responde SOLO en JSON con estas claves: rutinas, evitar, estrategias, comunicacion, apoyos, notas`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1500, messages:[{role:'user',content:prompt}] }),
      })

      const data = await response.json()
      const texto = data.content?.[0]?.text ?? ''
      const parsed = JSON.parse(texto.replace(/```json|```/g,'').trim())
      setGuiaEditando(prev => ({ ...prev, ...parsed, generadaPorIA:true }))
      setModoEdicion(true)
    } catch(e) {
      generarGuiaBasica()
    } finally { setGenerandoIA(false) }
  }

  function generarGuiaBasica() {
    const criticos  = estimulos.filter(e => e.impacto >= 9)
    const altos     = estimulos.filter(e => e.impacto >= 7 && e.impacto < 9)
    const positivos = estimulos.filter(e => e.impacto <= 2)
    setGuiaEditando(prev => ({
      ...prev,
      evitar:      [...criticos.map(e=>`• ${e.nombre}: ${e.estrategias?.[0]??'evitar siempre'}`), ...altos.map(e=>`• ${e.nombre}: gestionar con anticipación`)].join('\n') || 'Sin estímulos críticos aún.',
      apoyos:      positivos.length>0 ? positivos.map(e=>`• ${e.nombre}: ${e.notas??e.estrategias?.[0]??''}`).join('\n') : 'El terapeuta aún no registró reguladores positivos.',
      estrategias: estimulos.filter(e=>e.estrategias?.length>0).slice(0,3).map(e=>`• Ante ${e.nombre}: ${e.estrategias[0]}`).join('\n') || 'Se completará en próximas sesiones.',
      rutinas:     'Complete esta sección con las rutinas recomendadas para el hogar.',
      comunicacion:'Use frases cortas y directas. Dé tiempo para procesar antes de responder.',
      notas:       'Guía generada automáticamente desde el mapa sensorial.',
      generadaPorIA: false,
    }))
    setModoEdicion(true)
  }

  const estimulosFiltrados = useMemo(() =>
    estimulos.filter(e => filtroCanal==='todos'||e.canal===filtroCanal).sort((a,b)=>b.scorePrioridad-a.scorePrioridad),
    [estimulos, filtroCanal]
  )

  const statsPorCanal = useMemo(() =>
    (Object.keys(CANALES_CONFIG) as CanalSensorial[]).map(canal => {
      const items = estimulos.filter(e=>e.canal===canal)
      const avg = items.length ? items.reduce((a,b)=>a+b.impacto,0)/items.length : 0
      return { canal, avg:Math.round(avg*10)/10, count:items.length }
    }).sort((a,b)=>b.avg-a.avg),
    [estimulos]
  )

  const estSel = estimulos.find(e=>e.id===selEstimulo)
  if(cargando) return <div className="text-center py-8 text-sm text-gray-400">Cargando mapa sensorial...</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {[
          {id:'tierlist', label:`Tierlist (${estimulos.length})`},
          {id:'radar',    label:'Radar por canal'},
          {id:'guia',     label: esPadre ? '📖 Mi guía' : '📖 Guía para el padre'},
        ].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id as any);setSelEstimulo(null)}}
            className={`text-sm px-4 py-2.5 border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${tab===t.id?'border-gray-900 text-gray-900 font-medium':'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TIERLIST */}
      {tab==='tierlist'&&(
        estimulos.length===0?(
          <Card className="text-center py-10">
            <div className="text-4xl mb-4">🗺️</div>
            <div className="font-semibold text-gray-900 text-lg mb-2">Mapa sensorial vacío</div>
            <div className="text-sm text-gray-400 max-w-sm mx-auto">Registra estímulos desde la bitácora usando el tipo "Ev. sensorial".</div>
          </Card>
        ):(
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="text-center py-3"><div className="text-xl font-semibold text-gray-900">{estimulos.length}</div><div className="text-[10px] text-gray-400 mt-0.5">Mapeados</div></Card>
              <Card className="text-center py-3" style={{background:'#FCEBEB'}}><div className="text-xl font-semibold text-red-700">{estimulos.filter(e=>e.impacto>=9).length}</div><div className="text-[10px] text-gray-400 mt-0.5">Críticos</div></Card>
              <Card className="text-center py-3" style={{background:'#FAEEDA'}}><div className="text-xl font-semibold text-orange-700">{estimulos.filter(e=>e.impacto>=7&&e.impacto<9).length}</div><div className="text-[10px] text-gray-400 mt-0.5">Alto impacto</div></Card>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={()=>setFiltroCanal('todos')} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filtroCanal==='todos'?'bg-gray-900 text-white border-gray-900':'text-gray-500 border-gray-200'}`}>Todos</button>
              {(Object.entries(CANALES_CONFIG) as [CanalSensorial,typeof CANALES_CONFIG[CanalSensorial]][]).map(([id,cfg])=>(
                <button key={id} onClick={()=>setFiltroCanal(filtroCanal===id?'todos':id)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={filtroCanal===id?{background:cfg.bg,color:cfg.tc,borderColor:cfg.color}:{color:'#6B7280',borderColor:'#E5E7EB'}}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
            {TIERS.map(tier=>{
              const items=estimulosFiltrados.filter(e=>e.impacto>=tier.min&&e.impacto<=tier.max)
              if(!items.length) return null
              return(
                <div key={tier.label} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden" style={{borderLeft:`3px solid ${tier.color}`}}>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{background:tier.bg,color:tier.tc}}>{tier.min===tier.max?tier.min:`${tier.min}-${tier.max}`}</div>
                    <div className="font-medium text-sm text-gray-900 flex-1">{tier.label}</div>
                    <div className="text-xs text-gray-400">{items.length} estímulo{items.length>1?'s':''}</div>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {items.map(e=>{
                      const cfg=CANALES_CONFIG[e.canal]; const isSel=selEstimulo===e.id
                      return(
                        <button key={e.id} onClick={()=>setSelEstimulo(isSel?null:e.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all"
                          style={isSel?{background:tier.bg,borderColor:tier.color,borderWidth:1.5,color:tier.tc}:{borderColor:'#E5E7EB',color:'#374151'}}>
                          <span>{cfg.emoji}</span><span>{e.nombre}</span><span className="font-semibold" style={{color:tier.color}}>{e.impacto}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {estSel&&(
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-base">{estSel.nombre}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{background:CANALES_CONFIG[estSel.canal].bg,color:CANALES_CONFIG[estSel.canal].tc}}>
                      {CANALES_CONFIG[estSel.canal].emoji} {CANALES_CONFIG[estSel.canal].label}
                    </span>
                  </div>
                  <button onClick={()=>setSelEstimulo(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[{label:'Impacto',valor:`${estSel.impacto}/10`,color:'#E24B4A'},{label:'Frecuencia',valor:`${estSel.frecuencia}/5`,color:'#EF9F27'},{label:'Recuperac.',valor:`${estSel.recuperacion}/5`,color:'#7F77DD'},{label:'Score',valor:`${estSel.scorePrioridad}`,color:'#1D9E75'}].map(s=>(
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3"><div className="text-[10px] text-gray-400 mb-1">{s.label}</div><div className="text-xl font-semibold" style={{color:s.color}}>{s.valor}</div></div>
                  ))}
                </div>
                {estSel.reacciones?.length>0&&<div className="mb-3"><div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Reacciones</div><div className="flex flex-wrap gap-1">{estSel.reacciones.map(r=><span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">{r}</span>)}</div></div>}
                {estSel.estrategias?.length>0&&<div className="mb-3"><div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Estrategias</div><div className="flex flex-wrap gap-1">{estSel.estrategias.map(s=><span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">{s}</span>)}</div></div>}
                {estSel.notas&&<div className="bg-blue-50 rounded-lg p-3"><div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notas</div><div className="text-sm text-gray-700">{estSel.notas}</div></div>}
              </div>
            )}
          </div>
        )
      )}

      {/* RADAR */}
      {tab==='radar'&&(
        <div className="flex flex-col gap-4">
          {estimulos.length===0?(
            <Card className="text-center py-8 text-sm text-gray-400">El radar aparecerá cuando registres al menos un estímulo.</Card>
          ):(
            <>
              <Card>
                <SectionLabel>Intensidad promedio por canal</SectionLabel>
                <div className="flex flex-col gap-3">
                  {statsPorCanal.map(s=>{const cfg=CANALES_CONFIG[s.canal];return(
                    <div key={s.canal}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{cfg.emoji} {cfg.label}</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{s.count} estímulos</span><span className="text-sm font-semibold" style={{color:cfg.color}}>{s.avg}/10</span></div>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${s.avg*10}%`,background:cfg.color}}/></div>
                    </div>
                  )})}
                </div>
              </Card>
              <Card>
                <SectionLabel>Radar de canales sensoriales</SectionLabel>
                <div className="flex justify-center">
                  <svg width="280" height="280" viewBox="0 0 280 280">
                    {[0.25,0.5,0.75,1].map(v=>{const r=110*v;const pts=(Object.keys(CANALES_CONFIG) as CanalSensorial[]).map((_,i,arr)=>{const a=(i/arr.length)*2*Math.PI-Math.PI/2;return`${140+r*Math.cos(a)},${140+r*Math.sin(a)}`}).join(' ');return<polygon key={v} points={pts} fill="none" stroke="#F3F4F6" strokeWidth="1"/>})}
                    {(Object.keys(CANALES_CONFIG) as CanalSensorial[]).map((_,i,arr)=>{const a=(i/arr.length)*2*Math.PI-Math.PI/2;return<line key={i} x1="140" y1="140" x2={140+110*Math.cos(a)} y2={140+110*Math.sin(a)} stroke="#F3F4F6" strokeWidth="1"/>})}
                    <polygon points={(Object.keys(CANALES_CONFIG) as CanalSensorial[]).map((canal,i,arr)=>{const stat=statsPorCanal.find(s=>s.canal===canal);const v=stat?(stat.avg/10)*110:0;const a=(i/arr.length)*2*Math.PI-Math.PI/2;return`${140+v*Math.cos(a)},${140+v*Math.sin(a)}`}).join(' ')} fill="#FAECE7" fillOpacity="0.6" stroke="#D85A30" strokeWidth="1.5"/>
                    {(Object.entries(CANALES_CONFIG) as [CanalSensorial,typeof CANALES_CONFIG[CanalSensorial]][]).map(([canal,cfg],i,arr)=>{const a=(i/arr.length)*2*Math.PI-Math.PI/2;return<text key={canal} x={140+128*Math.cos(a)} y={140+128*Math.sin(a)} textAnchor="middle" dominantBaseline="central" fontSize="11" fill={cfg.color} fontWeight="500" fontFamily="system-ui">{cfg.emoji} {cfg.label}</text>})}
                  </svg>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* GUÍA */}
      {tab==='guia'&&(
        <div className="flex flex-col gap-4">

          {/* Vista padre */}
          {esPadre&&(
            !guia.publicada?(
              <Card className="text-center py-10">
                <div className="text-4xl mb-4">📖</div>
                <div className="font-semibold text-gray-900 text-lg mb-2">Guía en preparación</div>
                <div className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                  {estimulos.length>0?'El terapeuta está preparando tu guía personalizada basada en el perfil sensorial de Mateo.':'El equipo aún está mapeando el perfil sensorial de Mateo.'}
                </div>
              </Card>
            ):(
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div className="text-sm font-medium text-emerald-800 mb-1">📖 Guía personalizada de Mateo</div>
                  <div className="text-xs text-emerald-700">Preparada por el equipo terapéutico{guia.fechaActualizacion&&` · Actualizada el ${guia.fechaActualizacion.toLocaleDateString('es-PE',{day:'numeric',month:'long'})}`}{guia.generadaPorIA&&' · Con asistencia de IA'}</div>
                </div>
                {SECCIONES.map(s=>{const valor=guia[s.key as keyof GuiaTerapeuta] as string;if(!valor)return null;return(
                  <Card key={s.key}><SectionLabel>{s.label}</SectionLabel><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{valor}</p></Card>
                )})}
              </>
            )
          )}

          {/* Vista terapeuta/docente */}
          {!esPadre&&(
            <>
              {!modoEdicion&&(
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{guia.publicada?'✅ Guía publicada para el padre':'⏳ Guía no publicada aún'}</div>
                    {guia.fechaActualizacion&&<div className="text-xs text-gray-400 mt-0.5">Actualizada: {guia.fechaActualizacion.toLocaleDateString('es-PE',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}{guia.generadaPorIA&&' · Con IA'}</div>}
                  </div>
                  {esTerapeuta&&(
                    <div className="flex gap-2 flex-wrap">
                      <BtnGhost onClick={()=>{setGuiaEditando({...guia});setModoEdicion(true)}}>✏️ {guia.publicada?'Editar guía':'Crear guía'}</BtnGhost>
                      <button onClick={generarConIA} disabled={generandoIA||estimulos.length===0}
                        className="text-xs font-medium px-3 py-2 rounded-full border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-40">
                        {generandoIA?'⏳ Generando...':'🤖 Generar con IA'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {modoEdicion&&esTerapeuta&&(
                <div className="flex flex-col gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
                    <span><span className="font-medium">✏️ Editando guía</span> — el padre no verá los cambios hasta que publiques</span>
                    <button onClick={()=>setModoEdicion(false)} className="text-xs underline text-blue-500">Cancelar</button>
                  </div>
                  {guiaEditando.generadaPorIA&&(
                    <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-xs text-purple-700">
                      🤖 Contenido generado por IA — revisa y edita antes de publicar
                    </div>
                  )}
                  {SECCIONES.map(s=>(
                    <Card key={s.key}>
                      <SectionLabel>{s.label}</SectionLabel>
                      <textarea value={guiaEditando[s.key as keyof GuiaTerapeuta] as string}
                        onChange={e=>setGuiaEditando(prev=>({...prev,[s.key]:e.target.value}))}
                        placeholder={s.placeholder} rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#1D9E75] resize-none"/>
                    </Card>
                  ))}
                  <div className="flex justify-end gap-2">
                    <BtnGhost onClick={()=>guardarGuia(false)} disabled={guardandoGuia}>Guardar borrador</BtnGhost>
                    <BtnPrimary onClick={()=>guardarGuia(true)} disabled={guardandoGuia}>{guardandoGuia?'Publicando...':'✅ Publicar para el padre'}</BtnPrimary>
                  </div>
                </div>
              )}

              {!modoEdicion&&(
                guia.publicada?(
                  <div className="flex flex-col gap-3">
                    {SECCIONES.map(s=>{const valor=guia[s.key as keyof GuiaTerapeuta] as string;if(!valor)return null;return(
                      <Card key={s.key}><SectionLabel>{s.label}</SectionLabel><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{valor}</p></Card>
                    )})}
                  </div>
                ):(
                  <Card className="text-center py-10">
                    <div className="text-4xl mb-4">📖</div>
                    <div className="font-semibold text-gray-900 text-lg mb-2">Guía no creada aún</div>
                    <div className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed mb-4">
                      {esTerapeuta?'Crea la guía manualmente o usa la IA para generarla desde el perfil sensorial.':'El terapeuta aún no ha creado la guía para el padre.'}
                    </div>
                    {esTerapeuta&&(
                      <div className="flex gap-3 justify-center flex-wrap">
                        <BtnGhost onClick={()=>{setGuiaEditando({...GUIA_VACIA});setModoEdicion(true)}}>✏️ Crear manualmente</BtnGhost>
                        <button onClick={generarConIA} disabled={generandoIA||estimulos.length===0}
                          className="text-sm font-medium px-4 py-2 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors disabled:opacity-40">
                          {generandoIA?'⏳ Generando...':'🤖 Generar con IA'}
                        </button>
                      </div>
                    )}
                  </Card>
                )
              )}

              {/* Sin terapeuta — guía automática */}
              {!esTerapeuta&&!guia.publicada&&estimulos.length>0&&(
                <div className="flex flex-col gap-3 mt-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                    ⚠️ No hay terapeuta asignado — mostrando guía automática desde el mapa sensorial
                  </div>
                  {estimulos.filter(e=>e.impacto>=9).length>0&&(
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="font-semibold text-red-800 mb-3">🚨 Estímulos críticos — evitar siempre</div>
                      {estimulos.filter(e=>e.impacto>=9).map(e=>(
                        <div key={e.id} className="py-2 border-b border-red-200 last:border-0">
                          <div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-red-600">{e.impacto}</span><span className="font-medium text-sm text-red-900">{e.nombre}</span></div>
                          {e.estrategias?.length>0&&<div className="text-xs text-red-700 ml-7">{e.estrategias.join(' · ')}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {estimulos.filter(e=>e.impacto>=7&&e.impacto<9).length>0&&(
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="font-semibold text-orange-800 mb-3">⚠️ Alto impacto — gestionar activamente</div>
                      {estimulos.filter(e=>e.impacto>=7&&e.impacto<9).map(e=>(
                        <div key={e.id} className="py-2 border-b border-orange-200 last:border-0">
                          <div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-orange-600">{e.impacto}</span><span className="font-medium text-sm text-orange-900">{e.nombre}</span></div>
                          {e.estrategias?.length>0&&<div className="text-xs text-orange-700 ml-7">{e.estrategias.join(' · ')}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {estimulos.filter(e=>e.impacto<=2).length>0&&(
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="font-semibold text-green-800 mb-3">✅ Reguladores positivos</div>
                      {estimulos.filter(e=>e.impacto<=2).map(e=>(
                        <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-green-200 last:border-0">
                          <span>{CANALES_CONFIG[e.canal].emoji}</span><span className="text-sm text-green-900">{e.nombre}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
