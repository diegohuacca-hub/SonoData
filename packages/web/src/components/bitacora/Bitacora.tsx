import { useState, useEffect } from 'react'
import { Card, SectionLabel, TipoBadge, SevBadge, Tag, BtnPrimary, BtnGhost, tiempoRelativo } from '../ui/Common'
import { type RegistroBitacora, type TipoRegistro, type Severidad, type Visibilidad, type Comentario, type CanalSensorial, CANALES_CONFIG, REACCIONES_OPTS, ESTRATEGIAS_OPTS } from '../../store/demo.data'
import { escucharBitacora, crearRegistro, editarRegistro, agregarComentario, eliminarRegistro } from '../../services/bitacora.service'
import { crearEstimulo } from '../../services/sensorial.service'
import { useAuthStore } from '../../store/auth.store'

type RegistroConComentarios = RegistroBitacora & { comentarios?: Comentario[]; camposExtra?: {label:string;valor:string}[]; tags?: string[] }

const TIPOS_PROFESIONAL: { id: TipoRegistro; label: string; color: string; bg: string; tc: string }[] = [
  { id:'incidente',    label:'Incidente',       color:'#E24B4A', bg:'#FCEBEB', tc:'#501313' },
  { id:'logro',        label:'Logro',           color:'#639922', bg:'#EAF3DE', tc:'#173404' },
  { id:'observacion',  label:'Observación',     color:'#378ADD', bg:'#E6F1FB', tc:'#042C53' },
  { id:'comunicacion', label:'Comunicación',    color:'#7F77DD', bg:'#EEEDFE', tc:'#26215C' },
  { id:'sensorial',    label:'Ev. sensorial',   color:'#D85A30', bg:'#FAECE7', tc:'#4A1B0C' },
  { id:'custom',       label:'Personalizado',   color:'#BA7517', bg:'#FAEEDA', tc:'#412402' },
]
const TIPOS_PADRE: { id: TipoRegistro; label: string; color: string; bg: string; tc: string }[] = [
  { id:'aporte_padre', label:'Nota sobre mi hijo',    color:'#1D9E75', bg:'#E1F5EE', tc:'#085041' },
  { id:'logro',        label:'Logro en casa',         color:'#639922', bg:'#EAF3DE', tc:'#173404' },
  { id:'sensorial',    label:'Ev. sensorial',         color:'#D85A30', bg:'#FAECE7', tc:'#4A1B0C' },
  { id:'observacion',  label:'Observación del hogar', color:'#378ADD', bg:'#E6F1FB', tc:'#042C53' },
]
const TODOS_TIPOS = [...TIPOS_PROFESIONAL, { id:'aporte_padre' as TipoRegistro, label:'Aporte del padre', color:'#1D9E75', bg:'#E1F5EE', tc:'#085041' }]

const SEVS: { n: Severidad; label: string; desc: string; color: string; bg: string }[] = [
  { n:1, label:'Muy leve',  desc:'Sin intervención',     color:'#639922', bg:'#EAF3DE' },
  { n:2, label:'Leve',      desc:'Monitorear',           color:'#1D9E75', bg:'#E1F5EE' },
  { n:3, label:'Moderado',  desc:'Intervención suave',   color:'#EF9F27', bg:'#FAEEDA' },
  { n:4, label:'Alto',      desc:'Intervención directa', color:'#D85A30', bg:'#FAECE7' },
  { n:5, label:'Crítico',   desc:'Escalar a terapeuta',  color:'#E24B4A', bg:'#FCEBEB' },
]
const CONTEXTOS = ['Recreo','Hora de clase','Tránsito entre actividades','Comedor','Llegada al colegio','Salida','Actividad grupal','Actividad individual','Interacción con pares','Interacción con adulto','En casa','Fuera de casa']
const INTERVENCIONES = ['Rincón de calma','Apoyo visual (pictogramas)','Redirección de actividad','Contacto con terapeuta','Apoyo físico suave','Refuerzo positivo','Ninguna necesaria']
const AREAS = ['Lenguaje y comunicación','Habilidades sociales','Regulación emocional','Motricidad fina','Motricidad gruesa','Atención y concentración','Conducta adaptativa','Autonomía']
const VIS_OPTS: { id: Visibilidad; label: string; icon: string }[] = [
  { id:'todos',       label:'Padre · Terapeuta · Docente', icon:'◉' },
  { id:'profesional', label:'Solo Terapeuta + Docente',    icon:'◈' },
  { id:'borrador',    label:'Borrador (solo yo)',          icon:'◌' },
]
const VIS_OPTS_PADRE: { id: Visibilidad; label: string; icon: string }[] = [
  { id:'todos',    label:'Visible para terapeuta y docente', icon:'◉' },
  { id:'borrador', label:'Solo para mí (borrador)',          icon:'◌' },
]

const FORM_VACIO = {
  tipo: 'incidente' as TipoRegistro, severidad: 3 as Severidad,
  titulo: '', descripcion: '', duracionMin: '', seguimiento: false,
  contextos: [] as string[], intervenciones: [] as string[],
  areas: [] as string[], visibilidad: 'todos' as Visibilidad,
  canal: 'auditivo' as CanalSensorial,
  impacto: 5, frecuencia: 3, recuperacion: 3,
  reacciones: [] as string[], estrategias: [] as string[],
  camposExtra: [] as {label:string;valor:string}[],
  tags: [] as string[],
}

function calcularScore(imp:number,frec:number,rec:number){return Math.round((imp*0.6+frec*0.25+rec*0.15)*10)/10}

function ComentarioInput({ onGuardar }: { onGuardar: (texto: string) => void }) {
  const [texto, setTexto] = useState('')
  return (
    <div className="flex gap-2 items-start mt-3">
      <textarea value={texto} onChange={e=>setTexto(e.target.value)}
        placeholder="Agregar comentario o recomendación..." rows={2}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#1D9E75] resize-none"/>
      <button onClick={()=>{if(!texto.trim())return;onGuardar(texto.trim());setTexto('')}}
        disabled={!texto.trim()}
        className="px-3 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#085041] transition-colors flex-shrink-0">
        Enviar
      </button>
    </div>
  )
}

export default function Bitacora() {
  const { usuario } = useAuthStore()
  const [tab, setTab]             = useState<'historial'|'nuevo'|'resumen'>('historial')
  const [registros, setRegistros] = useState<RegistroConComentarios[]>([])
  const [cargando, setCargando]   = useState(true)
  const [form, setForm]           = useState(FORM_VACIO)
  const [modoEdicion, setModoEdicion] = useState<string|null>(null)
  const [errores, setErrores]     = useState<Record<string,boolean>>({})
  const [guardado, setGuardado]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [expandido, setExpandido] = useState<string|null>(null)
  const [filtroTipo, setFiltroTipo] = useState<TipoRegistro|'todos'>('todos')
  const [filtroSev, setFiltroSev]   = useState<Severidad|0>(0)
  const [nuevoTag, setNuevoTag]     = useState('')
  const [nuevoCampoLabel, setNuevoCampoLabel] = useState('')

  const esPadre       = usuario?.rol === 'padre'
  const esTerapeuta   = usuario?.rol === 'terapeuta'
  const esProfesional = usuario?.rol === 'terapeuta' || usuario?.rol === 'docente'
  const puedeCrear    = esPadre || esProfesional
  const TIPOS         = esPadre ? TIPOS_PADRE : TIPOS_PROFESIONAL
  const esSensorial   = form.tipo === 'sensorial'

  useEffect(() => {
    const unsub = escucharBitacora((data) => {
      setRegistros(data as RegistroConComentarios[])
      setCargando(false)
    })
    return unsub
  }, [])

  const registrosActivos = registros.filter(r=>!(r as any).eliminado)
  const registrosFiltrados = registrosActivos
    .filter(r=>{
      if(esPadre) return r.visibilidad==='todos'||r.autorRol==='padre'
      if(r.visibilidad==='borrador') return r.autorRol===usuario?.rol
      return true
    })
    .filter(r=>filtroTipo==='todos'||r.tipo===filtroTipo)
    .filter(r=>filtroSev===0||r.severidad===filtroSev)

  function toggleArr<T>(arr:T[],val:T):T[]{return arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]}

  // Verificar si puede editar un registro
  function puedeEditar(r: RegistroConComentarios): boolean {
    if (esTerapeuta) return true
    return r.autorNombre === `${usuario?.nombre} ${usuario?.apellidos}`
  }

  // Cargar registro en el formulario para editar
  function iniciarEdicion(r: RegistroConComentarios) {
    setModoEdicion(r.id)
    setForm({
      tipo:          r.tipo,
      severidad:     r.severidad,
      titulo:        r.titulo,
      descripcion:   r.descripcion,
      duracionMin:   r.duracionMin?.toString() ?? '',
      seguimiento:   r.requiereSeguimiento,
      contextos:     r.contextos ?? [],
      intervenciones:r.intervenciones ?? [],
      areas:         r.areaDesarrollo ?? [],
      visibilidad:   r.visibilidad,
      canal:         'auditivo' as CanalSensorial,
      impacto:       5, frecuencia:3, recuperacion:3,
      reacciones:    [],
      estrategias:   [],
      camposExtra:   (r as any).camposExtra ?? [],
      tags:          (r as any).tags ?? [],
    })
    setTab('nuevo')
  }

  function validar():boolean {
    const e:Record<string,boolean>={}
    if(!form.titulo.trim()) e.titulo=true
    if(!form.descripcion.trim()) e.descripcion=true
    if(!esPadre&&!modoEdicion&&form.contextos.length===0) e.contextos=true
    setErrores(e)
    return Object.keys(e).length===0
  }

  async function guardar() {
    if(!validar()) return
    setGuardando(true)
    try {
      const datos = {
        tipo:                form.tipo,
        severidad:           form.severidad,
        titulo:              form.titulo,
        descripcion:         form.descripcion,
        duracionMin:         form.duracionMin?parseInt(form.duracionMin):undefined,
        requiereSeguimiento: form.seguimiento,
        seguimientoResuelto: false,
        contextos:           form.contextos,
        intervenciones:      form.intervenciones,
        areaDesarrollo:      form.areas,
        visibilidad:         form.visibilidad,
        autorNombre:         `${usuario?.nombre} ${usuario?.apellidos}`,
        autorRol:            (usuario?.rol as any)?? 'docente',
        inmutable:           form.severidad>=4,
        camposExtra:         form.camposExtra,
        tags:                form.tags,
      }

      if (modoEdicion) {
        await editarRegistro(modoEdicion, datos)
        setModoEdicion(null)
      } else {
        await crearRegistro(datos)
        if(form.tipo==='sensorial') {
          await crearEstimulo({
            nombre:form.titulo, canal:form.canal,
            impacto:form.impacto, frecuencia:form.frecuencia, recuperacion:form.recuperacion,
            scorePrioridad:calcularScore(form.impacto,form.frecuencia,form.recuperacion),
            reacciones:form.reacciones, estrategias:form.estrategias,
            notas:form.descripcion, autodetectado:false, ocurrencias:1,
          })
        }
      }

      setForm(FORM_VACIO)
      setErrores({})
      setGuardado(true)
      setTab('historial')
      setTimeout(()=>setGuardado(false),3000)
    } catch(e){console.error(e)}
    finally{setGuardando(false)}
  }

  async function handleComentario(registroId:string,texto:string) {
    try {
      await agregarComentario(registroId,{
        autorNombre:`${usuario?.nombre} ${usuario?.apellidos}`,
        autorRol:(usuario?.rol as any)?? 'docente',
        texto, fecha:new Date(),
      })
    } catch(e){console.error(e)}
  }

  const colorPorTipo:Record<string,string>={
    incidente:'#E24B4A',logro:'#639922',observacion:'#378ADD',
    comunicacion:'#7F77DD',sensorial:'#D85A30',custom:'#BA7517',aporte_padre:'#1D9E75',
  }

  const stats={
    total:registrosActivos.length,
    incidentes:registrosActivos.filter(r=>r.tipo==='incidente').length,
    logros:registrosActivos.filter(r=>r.tipo==='logro').length,
    aportesPadre:registrosActivos.filter(r=>r.tipo==='aporte_padre').length,
    seguimiento:registrosActivos.filter(r=>r.requiereSeguimiento&&!r.seguimientoResuelto).length,
  }

  return (
    <div className="flex flex-col gap-4">

      {guardado && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          ✓ Registro {modoEdicion ? 'actualizado' : 'guardado'} correctamente.
        </div>
      )}

      {esPadre && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          <span className="font-medium">Tú también puedes aportar.</span> Agrega notas, eventos sensoriales o logros del hogar.
        </div>
      )}

      <div className="flex gap-0 border-b border-gray-200">
        {[
          { id:'historial', label:`Historial (${registrosActivos.filter(r=>{if(esPadre)return r.visibilidad==='todos'||r.autorRol==='padre';return true}).length})` },
          ...(puedeCrear?[{id:'nuevo',label:modoEdicion?'✏️ Editando':esPadre?'+ Mi aporte':'Nuevo registro'}]:[]),
          {id:'resumen',label:'Resumen del mes'},
        ].map(t=>(
          <button key={t.id} onClick={()=>{if(t.id!=='nuevo'){setModoEdicion(null);setForm(FORM_VACIO)}setTab(t.id as any)}}
            className={`text-sm px-4 py-2 border-b-2 transition-all ${tab===t.id?'border-gray-900 text-gray-900 font-medium':'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── HISTORIAL ── */}
      {tab==='historial'&&(
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setFiltroTipo('todos')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filtroTipo==='todos'?'bg-gray-900 text-white border-gray-900':'text-gray-500 border-gray-200'}`}>
              Todos
            </button>
            {TODOS_TIPOS.map(t=>(
              <button key={t.id} onClick={()=>setFiltroTipo(filtroTipo===t.id?'todos':t.id)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all"
                style={filtroTipo===t.id?{background:t.bg,color:t.tc,borderColor:t.color}:{color:'#6B7280',borderColor:'#E5E7EB'}}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Severidad:</span>
            <button onClick={()=>setFiltroSev(0)}
              className={`text-xs px-3 py-1 rounded-full border ${filtroSev===0?'bg-gray-900 text-white border-gray-900':'text-gray-500 border-gray-200'}`}>
              Todas
            </button>
            {SEVS.map(s=>(
              <button key={s.n} onClick={()=>setFiltroSev(filtroSev===s.n?0:s.n)}
                className="w-7 h-7 rounded-full border text-xs font-semibold transition-all"
                style={filtroSev===s.n?{background:s.bg,color:s.color,borderColor:s.color}:{color:'#9CA3AF',borderColor:'#E5E7EB'}}>
                {s.n}
              </button>
            ))}
          </div>

          {cargando?(
            <div className="text-center py-8 text-sm text-gray-400">Cargando bitácora...</div>
          ):registrosFiltrados.length===0?(
            <Card className="text-center py-10">
              <div className="text-4xl mb-4">📋</div>
              <div className="font-semibold text-gray-900 mb-2">Bitácora vacía</div>
              <div className="text-sm text-gray-400 max-w-sm mx-auto">
                {puedeCrear?'Aún no hay registros. Crea el primero.':'El equipo aún no ha registrado nada.'}
              </div>
            </Card>
          ):(
            registrosFiltrados.map(r=>{
              const isExp=expandido===r.id
              const numComentarios=r.comentarios?.length??0
              const tieneExtra=(r as any).camposExtra?.length>0
              const tieneTags=(r as any).tags?.length>0
              return(
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
                  style={{borderLeft:`3px solid ${colorPorTipo[r.tipo]??'#9CA3AF'}`}}>
                  <div className="p-4 cursor-pointer" onClick={()=>setExpandido(isExp?null:r.id)}>
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TipoBadge tipo={r.tipo as any}/>
                        <SevBadge sev={r.severidad}/>
                        {r.tipo==='sensorial'&&<span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">🗺️ En mapa</span>}
                        {r.tipo==='aporte_padre'&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">👨‍👩‍👧 Del padre</span>}
                        {r.requiereSeguimiento&&!r.seguimientoResuelto&&<span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Seguimiento pendiente</span>}
                        {(r as any).editadoEn&&<span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">✏️ Editado</span>}
                        {numComentarios>0&&<span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">💬 {numComentarios}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {puedeEditar(r)&&(
                          <button onClick={e=>{e.stopPropagation();iniciarEdicion(r)}}
                            className="text-[10px] font-medium text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-full transition-all">
                            ✏️ Editar
                          </button>
                        )}
                        {r.autorNombre===`${usuario?.nombre} ${usuario?.apellidos}`&&(
                          <button onClick={async e=>{e.stopPropagation();if(confirm('¿Eliminar este registro?'))await eliminarRegistro(r.id)}}
                            className="text-[10px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-2 py-1 rounded-full transition-all">
                            Eliminar
                          </button>
                        )}
                        <span className="text-xs text-gray-400">{isExp?'▲':'▼'}</span>
                      </div>
                    </div>
                    <div className="font-medium text-sm text-gray-900 mb-1">{r.titulo}</div>
                    {tieneTags&&(
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(r as any).tags.map((tag:string)=>(
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">{tiempoRelativo(r.fecha)} · {r.autorNombre}</div>
                  </div>

                  {isExp&&(
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">{r.descripcion}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {r.contextos?.length>0&&(
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Contexto</div>
                            <div className="flex flex-wrap gap-1">{r.contextos.map(c=><Tag key={c}>{c}</Tag>)}</div>
                          </div>
                        )}
                        {r.intervenciones?.length>0&&(
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Intervención</div>
                            <div className="flex flex-wrap gap-1">{r.intervenciones.map(i=><Tag key={i}>{i}</Tag>)}</div>
                          </div>
                        )}
                        {r.areaDesarrollo?.length>0&&(
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Áreas</div>
                            <div className="flex flex-wrap gap-1">{r.areaDesarrollo.map(a=><span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{a}</span>)}</div>
                          </div>
                        )}
                        {r.duracionMin&&(
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Duración</div>
                            <span className="text-sm text-gray-700">{r.duracionMin} minutos</span>
                          </div>
                        )}
                      </div>

                      {/* Campos extra */}
                      {tieneExtra&&(
                        <div className="mt-3">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Campos adicionales</div>
                          <div className="flex flex-col gap-2">
                            {(r as any).camposExtra.map((c:{label:string;valor:string},i:number)=>(
                              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                                <div className="text-[10px] font-semibold text-gray-500 mb-0.5">{c.label}</div>
                                <div className="text-sm text-gray-700">{c.valor}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comentarios */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                          Comentarios ({numComentarios})
                        </div>
                        {r.comentarios&&r.comentarios.length>0&&(
                          <div className="flex flex-col gap-2 mb-3">
                            {r.comentarios.map(c=>(
                              <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.autorRol==='padre'?'bg-emerald-100 text-emerald-700':c.autorRol==='terapeuta'?'bg-purple-100 text-purple-700':'bg-amber-100 text-amber-700'}`}>
                                      {c.autorRol==='padre'?'👨‍👩‍👧 ':''}{c.autorNombre}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{tiempoRelativo(c.fecha instanceof Date?c.fecha:new Date(c.fecha))}</span>
                                  </div>
                                  {c.autorNombre===`${usuario?.nombre} ${usuario?.apellidos}`&&(
                                    <button onClick={async e=>{
                                      e.stopPropagation()
                                      const{doc:fDoc,updateDoc}=await import('firebase/firestore')
                                      const{db}=await import('../../services/firebase')
                                      const nuevos=(r.comentarios??[]).filter(x=>x.id!==c.id).map(x=>({...x,fecha:x.fecha instanceof Date?x.fecha.toISOString():x.fecha}))
                                      await updateDoc(fDoc(db,'alumnos','alumno_001','bitacora',r.id),{comentarios:nuevos})
                                    }} className="text-[10px] text-gray-300 hover:text-red-400 transition-colors px-1">✕</button>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700">{c.texto}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <ComentarioInput onGuardar={texto=>handleComentario(r.id,texto)}/>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── NUEVO / EDITAR ── */}
      {tab==='nuevo'&&puedeCrear&&(
        <div className="flex flex-col gap-3">

          {modoEdicion&&(
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
              <span><span className="font-medium">✏️ Modo edición</span> — estás modificando un registro existente</span>
              <button onClick={()=>{setModoEdicion(null);setForm(FORM_VACIO);setTab('historial')}} className="text-xs text-blue-500 hover:text-blue-700 underline">Cancelar</button>
            </div>
          )}

          {esPadre&&!modoEdicion&&(
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="text-sm font-medium text-emerald-800 mb-1">Tu aporte es valioso</div>
              <div className="text-xs text-emerald-700">Comparte lo que observas en casa. Si seleccionas "Ev. sensorial" también se guardará en el mapa sensorial.</div>
            </div>
          )}

          {/* Tipo */}
          {!modoEdicion&&(
            <Card>
              <SectionLabel>{esPadre?'Tipo de aporte *':'Tipo de registro *'}</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t=>(
                  <button key={t.id} onClick={()=>setForm(f=>({...f,tipo:t.id}))}
                    className="py-2 px-1 rounded-lg border text-xs font-medium text-center transition-all"
                    style={form.tipo===t.id?{background:t.bg,borderColor:t.color,color:t.tc,borderWidth:1.5}:{borderColor:'#F3F4F6',color:'#6B7280'}}>
                    {t.label}
                  </button>
                ))}
              </div>
              {esSensorial&&(
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                  🗺️ Este registro también se guardará en el <span className="font-medium">mapa sensorial</span>
                </div>
              )}
            </Card>
          )}

          {/* Detalle */}
          <Card>
            <SectionLabel>Detalle</SectionLabel>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">{esSensorial?'Nombre del estímulo *':'Título *'}</label>
                <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))}
                  placeholder={esSensorial?'Ej: Timbre escolar...':esPadre?'Ej: Le cuesta el ruido del recreo':'Ej: Sobrecarga sensorial en el recreo'}
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#1D9E75] ${errores.titulo?'border-red-400':'border-gray-200'}`}/>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">{esSensorial?'Descripción de la reacción *':esPadre?'Descripción o recomendación *':'Descripción detallada *'}</label>
                <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))}
                  placeholder={esSensorial?'Describe cómo reaccionó...':esPadre?'Describe lo que observas...':'Describe lo que ocurrió...'}
                  rows={3}
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#1D9E75] resize-none ${errores.descripcion?'border-red-400':'border-gray-200'}`}/>
              </div>
              {!esPadre&&!esSensorial&&(
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Duración (min)</label>
                    <input type="number" min={0} value={form.duracionMin} onChange={e=>setForm(f=>({...f,duracionMin:e.target.value}))}
                      placeholder="Ej: 5" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]"/>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="seg" checked={form.seguimiento} onChange={e=>setForm(f=>({...f,seguimiento:e.target.checked}))} className="w-4 h-4"/>
                    <label htmlFor="seg" className="text-sm text-gray-600 cursor-pointer">Requiere seguimiento</label>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Campos del mapa sensorial */}
          {esSensorial&&!modoEdicion&&(
            <>
              <Card>
                <SectionLabel>Canal sensorial *</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.entries(CANALES_CONFIG) as [CanalSensorial,typeof CANALES_CONFIG[CanalSensorial]][]).map(([id,cfg])=>(
                    <button key={id} onClick={()=>setForm(f=>({...f,canal:id}))}
                      className="flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all"
                      style={form.canal===id?{background:cfg.bg,borderColor:cfg.color,borderWidth:1.5}:{borderColor:'#F3F4F6'}}>
                      <span className="text-lg">{cfg.emoji}</span><span className="text-xs font-medium text-gray-700">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionLabel>Niveles de impacto</SectionLabel>
                {[
                  {key:'impacto',label:'Nivel de impacto',min:1,max:10,desc:['Mínimo','Muy leve','Leve','Moderado-bajo','Moderado','Moderado-alto','Alto','Muy alto','Crítico','Máximo']},
                  {key:'frecuencia',label:'Frecuencia',min:1,max:5,desc:['Muy rara','Rara','Ocasional','Frecuente','Muy frecuente']},
                  {key:'recuperacion',label:'Recuperación',min:1,max:5,desc:['Inmediata','Rápida','Moderada','Lenta','Muy lenta']},
                ].map(sl=>{const val=form[sl.key as keyof typeof form] as number;return(
                  <div key={sl.key} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500">{sl.label}</label>
                      <span className="text-sm font-semibold text-gray-900">{val}/{sl.max} — {sl.desc[val-1]}</span>
                    </div>
                    <input type="range" min={sl.min} max={sl.max} value={val}
                      onChange={e=>setForm(f=>({...f,[sl.key]:parseInt(e.target.value)}))}
                      className="w-full accent-[#1D9E75]"/>
                  </div>
                )})}
              </Card>
              <Card>
                <SectionLabel>Reacciones observadas</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {REACCIONES_OPTS.map(r=><button key={r} onClick={()=>setForm(f=>({...f,reacciones:toggleArr(f.reacciones,r)}))} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.reacciones.includes(r)?'bg-red-100 text-red-700 border-red-300':'text-gray-500 border-gray-200'}`}>{r}</button>)}
                </div>
              </Card>
              <Card>
                <SectionLabel>Estrategias de manejo</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {ESTRATEGIAS_OPTS.map(s=><button key={s} onClick={()=>setForm(f=>({...f,estrategias:toggleArr(f.estrategias,s)}))} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.estrategias.includes(s)?'bg-green-100 text-green-700 border-green-300':'text-gray-500 border-gray-200'}`}>{s}</button>)}
                </div>
              </Card>
            </>
          )}

          {/* Severidad */}
          <Card>
            <SectionLabel>{esPadre?'Nivel de importancia *':'Nivel de severidad *'}</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {SEVS.map(s=>(
                <button key={s.n} onClick={()=>setForm(f=>({...f,severidad:s.n}))}
                  className="flex-1 min-w-[60px] py-2.5 px-2 rounded-lg border text-center transition-all"
                  style={form.severidad===s.n?{background:s.bg,borderColor:s.color,borderWidth:1.5}:{borderColor:'#F3F4F6'}}>
                  <div className="text-lg font-bold" style={{color:form.severidad===s.n?s.color:'#9CA3AF'}}>{s.n}</div>
                  <div className="text-[10px] font-medium" style={{color:form.severidad===s.n?s.color:'#9CA3AF'}}>{s.label}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Contexto */}
          <Card style={errores.contextos?{borderColor:'#F87171'}:{}}>
            <SectionLabel>Contexto {esPadre?'(opcional)':modoEdicion?'':'*'}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {CONTEXTOS.map(c=>(
                <button key={c} onClick={()=>setForm(f=>({...f,contextos:toggleArr(f.contextos,c)}))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.contextos.includes(c)?'bg-gray-900 text-white border-gray-900':'text-gray-500 border-gray-200'}`}>
                  {c}
                </button>
              ))}
            </div>
          </Card>

          {!esPadre&&!esSensorial&&(
            <Card>
              <SectionLabel>Intervención realizada</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {INTERVENCIONES.map(i=><button key={i} onClick={()=>setForm(f=>({...f,intervenciones:toggleArr(f.intervenciones,i)}))} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.intervenciones.includes(i)?'bg-[#1D9E75] text-white border-[#1D9E75]':'text-gray-500 border-gray-200'}`}>{i}</button>)}
              </div>
            </Card>
          )}

          {!esSensorial&&(
            <Card>
              <SectionLabel>Áreas de desarrollo {esPadre?'(opcional)':''}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {AREAS.map(a=><button key={a} onClick={()=>setForm(f=>({...f,areas:toggleArr(f.areas,a)}))} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.areas.includes(a)?'bg-purple-100 text-purple-700 border-purple-300':'text-gray-500 border-gray-200'}`}>{a}</button>)}
              </div>
            </Card>
          )}

          {/* ── TAGS PERSONALIZADOS ── */}
          <Card>
            <SectionLabel>Etiquetas personalizadas</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-3">
              {form.tags.map(tag=>(
                <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  #{tag}
                  <button onClick={()=>setForm(f=>({...f,tags:f.tags.filter(t=>t!==tag)}))} className="hover:text-red-500 transition-colors ml-0.5">✕</button>
                </span>
              ))}
              {form.tags.length===0&&<span className="text-xs text-gray-400">Sin etiquetas aún</span>}
            </div>
            <div className="flex gap-2">
              <input value={nuevoTag} onChange={e=>setNuevoTag(e.target.value.replace(/\s/g,''))}
                onKeyDown={e=>{if(e.key==='Enter'&&nuevoTag.trim()){setForm(f=>({...f,tags:[...f.tags,nuevoTag.trim()]}));setNuevoTag('')}}}
                placeholder="Escribe una etiqueta y presiona Enter..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]"/>
              <button onClick={()=>{if(nuevoTag.trim()){setForm(f=>({...f,tags:[...f.tags,nuevoTag.trim()]}));setNuevoTag('')}}}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors">
                + Agregar
              </button>
            </div>
          </Card>

          {/* ── CAMPOS EXTRA ── */}
          <Card>
            <SectionLabel>Campos adicionales personalizados</SectionLabel>
            <div className="flex flex-col gap-2 mb-3">
              {form.camposExtra.map((campo,i)=>(
                <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-gray-500 mb-1">{campo.label}</div>
                    <textarea value={campo.valor}
                      onChange={e=>setForm(f=>({...f,camposExtra:f.camposExtra.map((c,j)=>j===i?{...c,valor:e.target.value}:c)}))}
                      rows={2} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1D9E75] resize-none"/>
                  </div>
                  <button onClick={()=>setForm(f=>({...f,camposExtra:f.camposExtra.filter((_,j)=>j!==i)}))} className="text-gray-300 hover:text-red-400 transition-colors mt-1">✕</button>
                </div>
              ))}
              {form.camposExtra.length===0&&<span className="text-xs text-gray-400">Sin campos adicionales aún</span>}
            </div>
            <div className="flex gap-2">
              <input value={nuevoCampoLabel} onChange={e=>setNuevoCampoLabel(e.target.value)}
                placeholder="Nombre del campo (Ej: Hora exacta, Observador...)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]"/>
              <button onClick={()=>{if(nuevoCampoLabel.trim()){setForm(f=>({...f,camposExtra:[...f.camposExtra,{label:nuevoCampoLabel.trim(),valor:''}]}));setNuevoCampoLabel('')}}}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap">
                + Campo
              </button>
            </div>
          </Card>

          {/* Visibilidad */}
          <Card>
            <SectionLabel>Visibilidad *</SectionLabel>
            <div className="flex flex-col gap-2">
              {(esPadre?VIS_OPTS_PADRE:VIS_OPTS).map(v=>(
                <button key={v.id} onClick={()=>setForm(f=>({...f,visibilidad:v.id}))}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${form.visibilidad===v.id?'bg-gray-50 border-gray-400 font-medium':'border-gray-200'}`}>
                  <span className="text-base">{v.icon}</span>
                  <span className="text-sm text-gray-700">{v.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {Object.keys(errores).length>0&&<p className="text-xs text-red-500 text-right">Completa los campos marcados.</p>}
          <div className="flex justify-end gap-2">
            <BtnGhost onClick={()=>{setForm(FORM_VACIO);setErrores({});if(modoEdicion){setModoEdicion(null);setTab('historial')}}}>
              {modoEdicion?'Cancelar edición':'Limpiar'}
            </BtnGhost>
            <BtnPrimary onClick={guardar} disabled={guardando}>
              {guardando?'Guardando...':modoEdicion?'Guardar cambios':esSensorial?'Guardar en bitácora y mapa':esPadre?'Publicar mi aporte':'Guardar en bitácora'}
            </BtnPrimary>
          </div>
        </div>
      )}

      {/* ── RESUMEN ── */}
      {tab==='resumen'&&(
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {label:'Total registros',   valor:stats.total,        bg:'bg-gray-50',    color:'text-gray-900'},
              {label:'Incidentes',        valor:stats.incidentes,   bg:'bg-red-50',     color:'text-red-700'},
              {label:'Logros',            valor:stats.logros,       bg:'bg-green-50',   color:'text-green-700'},
              {label:'Aportes del padre', valor:stats.aportesPadre, bg:'bg-emerald-50', color:'text-emerald-700'},
            ].map(s=>(
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <div className={`text-2xl font-semibold ${s.color}`}>{s.valor}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <Card>
            <SectionLabel>Distribución por tipo</SectionLabel>
            <div className="flex flex-col gap-3">
              {TODOS_TIPOS.map(t=>{
                const cnt=registrosActivos.filter(r=>r.tipo===t.id).length
                const pct=registrosActivos.length>0?Math.round(cnt/registrosActivos.length*100):0
                return(
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-32 flex-shrink-0">{t.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:t.color}}/>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-5 text-right">{cnt}</span>
                  </div>
                )
              })}
            </div>
          </Card>
          {registrosActivos.filter(r=>r.requiereSeguimiento&&!r.seguimientoResuelto).length>0&&(
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="text-sm font-medium text-yellow-800 mb-3">Pendientes de seguimiento</div>
              {registrosActivos.filter(r=>r.requiereSeguimiento&&!r.seguimientoResuelto).map(r=>(
                <div key={r.id} className="text-sm text-yellow-700 py-1.5 border-b border-yellow-200 last:border-0">
                  {r.titulo} <span className="text-xs opacity-60">— {tiempoRelativo(r.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
