import { useState, useEffect } from 'react'
import { Card, SectionLabel, BtnPrimary, BtnGhost } from '../ui/Common'
import { useAuthStore } from '../../store/auth.store'
import { collection, query, orderBy, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'

interface Informe {
  id: string
  tipo: 'diario' | 'semanal'
  fechaGenerado: Date
  periodo: string
  contenido: string
  datos: {
    totalRegistros: number
    incidentes: number
    logros: number
    estimulos: number
    alertas: number
  }
  generadoPor: string
}

const ALUMNO_ID    = 'alumno_001'
const nombreAlumno = 'Mateo Mendoza'

async function obtenerDatosInforme(dias: number) {
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)
  const bitacoraSnap = await getDocs(query(collection(db,'alumnos',ALUMNO_ID,'bitacora'),orderBy('fecha','desc')))
  const registros = bitacoraSnap.docs
    .map(d=>({id:d.id,...d.data(),fecha:(d.data().fecha as Timestamp)?.toDate()}))
    .filter((r:any)=>r.fecha>=desde&&!r.eliminado)
  const sensorialSnap = await getDocs(collection(db,'alumnos',ALUMNO_ID,'mapa_sensorial'))
  const estimulos = sensorialSnap.docs.map(d=>({id:d.id,...d.data()}))
  const alertasSnap = await getDocs(query(collection(db,'alumnos',ALUMNO_ID,'alertas_sensor'),orderBy('timestamp','desc')))
  const alertas = alertasSnap.docs
    .map(d=>({id:d.id,...d.data(),timestamp:(d.data().timestamp as Timestamp)?.toDate()}))
    .filter((a:any)=>a.timestamp>=desde)
  return { registros, estimulos, alertas }
}

async function generarInformeIA(datos: any, tipo: 'diario'|'semanal'): Promise<string> {
  const { registros, estimulos, alertas } = datos
  const periodo = tipo==='diario'?'las últimas 24 horas':'la última semana'
  const prompt = `Eres un asistente especializado en TEA. Genera un informe clínico para ${periodo} del alumno ${nombreAlumno}.
DATOS:
- Bitácora (${registros.length} registros): ${JSON.stringify(registros.map((r:any)=>({tipo:r.tipo,titulo:r.titulo,severidad:r.severidad,descripcion:r.descripcion?.slice(0,80),autor:r.autorNombre})))}
- Mapa sensorial (${estimulos.length} estímulos): ${JSON.stringify(estimulos.map((e:any)=>({nombre:e.nombre,canal:e.canal,impacto:e.impacto,estrategias:e.estrategias})))}
- Alertas (${alertas.length}): ${JSON.stringify(alertas.map((a:any)=>({titulo:a.titulo,severidad:a.severidad})))}
Genera el informe con estas secciones en Markdown:
## Resumen ejecutivo
## Análisis de incidentes
## Perfil sensorial actual
## Logros destacados
## Recomendaciones
Lenguaje clínico pero comprensible. Conciso pero completo.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true',
    },
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:2000, messages:[{role:'user',content:prompt}] }),
  })
  const data = await response.json()
  return data.content?.[0]?.text ?? 'Error al generar el informe.'
}

function descargarPDF(informe: Informe) {
  const { datos } = informe
  const ratio = datos.totalRegistros>0 ? datos.incidentes/datos.totalRegistros : 0
  const estadoEmoji = ratio>0.4?'⚠️':ratio>0.2?'🟡':'✅'
  const estadoLabel = ratio>0.4?'Requiere atención':ratio>0.2?'Seguimiento activo':'Evolución positiva'

  const resumenMatch = informe.contenido.match(/## Resumen ejecutivo[\s\S]*?(?=##|$)/i)
  const resumenTexto = resumenMatch
    ? resumenMatch[0].replace(/^##[^\n]*/,'').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,' ').trim().slice(0,1200)
    : 'Período analizado con datos de la bitácora clínica, mapa sensorial y alertas del sistema.'

  const incidentesHTML = datos.incidentes===0
    ? '<div style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px">Sin incidentes en este período ✅</div>'
    : `<div class="ab red"><div class="at">🔴 ${datos.incidentes} incidente${datos.incidentes>1?'s':''} registrado${datos.incidentes>1?'s':''}</div><div class="ad">Ver detalle completo en la bitácora clínica del sistema.</div></div>`

  const logrosHTML = datos.logros===0
    ? '<div style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px">Sin logros registrados en este período</div>'
    : `<div class="ab green"><div class="at">🏆 ${datos.logros} logro${datos.logros>1?'s':''} registrado${datos.logros>1?'s':''}</div><div class="ad">El alumno demostró avances concretos durante el período.</div></div>`

  const canales = [
    {e:'🔊',n:'Auditivo',v:7.2,c:'#EF4444'},
    {e:'👋',n:'Táctil',v:6.0,c:'#F59E0B'},
    {e:'👃',n:'Olfativo',v:8.0,c:'#EF4444'},
    {e:'👁️',n:'Visual',v:6.0,c:'#F59E0B'},
    {e:'💪',n:'Propioceptivo',v:1.0,c:'#22C55E'},
    {e:'🌀',n:'Vestibular',v:0,c:'#9CA3AF'},
    {e:'👅',n:'Gustativo',v:0,c:'#9CA3AF'},
  ]
  const ch = (c:typeof canales[0]) => `<div class="cr"><div class="ce">${c.e}</div><div class="cn">${c.n}</div><div class="cb"><div class="pb"><div class="pf" style="width:${c.v*10}%;background:${c.c}"></div></div></div><div class="cs" style="color:${c.c}">${c.v>0?`${c.v}/10`:'—'}</div></div>`
  const mid = Math.ceil(canales.length/2)
  const cIzq = canales.slice(0,mid).map(ch).join('')
  const cDer = canales.slice(mid).map(ch).join('')

  const dots = (n:number,col:string) => {
  const filled = '●'.repeat(n)
  const empty  = '○'.repeat(10-n)
  return `<span style="color:${col};font-size:11px;letter-spacing:1px">${filled}</span><span style="color:#E5E7EB;font-size:11px;letter-spacing:1px">${empty}</span>`
  }

  const etabla = `
    <tr><td><strong>Timbre escolar</strong></td><td>🔊 Auditivo</td><td><div class="id">${dots(9,'#EF4444')}</div></td><td><span class="badge br">Crítico</span></td><td>Auriculares + anticipación verbal</td></tr>
    <tr><td><strong>Ruido comedor</strong></td><td>🔊 Auditivo</td><td><div class="id">${dots(8,'#F59E0B')}</div></td><td><span class="badge bo">Alto</span></td><td>Almorzar en aula en días ruidosos</td></tr>
    <tr><td><strong>Olor a pintura</strong></td><td>👃 Olfativo</td><td><div class="id">${dots(8,'#F59E0B')}</div></td><td><span class="badge bo">Alto</span></td><td>Ventilar 48h antes del reingreso</td></tr>
    <tr><td><strong>Plastilina</strong></td><td>👋 Táctil</td><td><div class="id">${dots(7,'#F59E0B')}</div></td><td><span class="badge bo">Alto</span></td><td>Ofrecer crayones como alternativa</td></tr>
    <tr><td><strong>Bloques LEGO</strong></td><td>💪 Propioceptivo</td><td><div class="id">${dots(1,'#22C55E')}</div></td><td><span class="badge bg">Positivo ✅</span></td><td>Usar como regulador post-colegio</td></tr>`

  const rh = ['Zona de descompresión 20-30 min al llegar','Bloques LEGO como regulador post-colegio','Música suave en rutina nocturna los domingos','Comidas en silencio sin televisión','Cepillo dental suave + canción favorita'].map(r=>`<div class="ri"><span class="rb">•</span><span>${r}</span></div>`).join('')
  const ra = ['Auriculares de cancelación para timbre y comedor','Anticipar cambios con 5 min de aviso + pictograma','Ubicar al final de la fila en llegada al colegio','Rincón de calma disponible y señalizado','Alternativas táctiles (crayones vs plastilina)'].map(r=>`<div class="ri"><span class="rb">•</span><span>${r}</span></div>`).join('')
  const alSec = datos.alertas>0?`<div class="card" style="margin-bottom:16px;border-left:3px solid #EF4444"><div class="ct">🔔 Alertas pendientes (${datos.alertas})</div><div class="ab orange"><div class="at">⚠️ Requieren atención del equipo</div><div class="ad">Revisar el panel de alertas para marcarlas como resueltas.</div></div></div>`:''

  const css = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#F8FAFC;color:#1F2937;font-size:13px}.page{max-width:900px;margin:0 auto;padding:24px}.hdr{background:linear-gradient(135deg,#1D9E75,#085041);color:white;border-radius:16px;padding:24px 28px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}.hdr h1{font-size:22px;font-weight:700;margin-bottom:4px}.hdr p{font-size:12px;opacity:.85}.bh{background:rgba(255,255,255,.2);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;display:inline-block}.pc{background:white;border-radius:12px;padding:16px 20px;margin-bottom:16px;border:1px solid #E5E7EB;display:flex;gap:20px;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,.06)}.av{width:56px;height:56px;background:linear-gradient(135deg,#D1FAE5,#6EE7B7);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}.pn{font-size:18px;font-weight:700;color:#085041}.pm{display:flex;gap:12px;margin-top:6px;flex-wrap:wrap}.pm span{font-size:11px;color:#6B7280;background:#F3F4F6;padding:2px 10px;border-radius:20px}.sg{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}.sc{background:white;border-radius:12px;padding:14px 10px;text-align:center;border:1px solid #E5E7EB;box-shadow:0 1px 4px rgba(0,0,0,.06)}.sn{font-size:28px;font-weight:700;line-height:1}.sl{font-size:10px;color:#9CA3AF;margin-top:4px}.tc{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.card{background:white;border-radius:12px;padding:16px 18px;border:1px solid #E5E7EB;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:16px}.ct{font-size:13px;font-weight:700;color:#1F2937;margin-bottom:12px}.sh{background:linear-gradient(90deg,#F0FDF4,#ECFDF5);border-left:3px solid #1D9E75;padding:8px 14px;border-radius:0 8px 8px 0;margin-bottom:12px}.sh h2{font-size:13px;font-weight:700;color:#065F46}table{width:100%;border-collapse:collapse}th{background:#F9FAFB;font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;padding:7px 10px;text-align:left;border-bottom:1px solid #E5E7EB}td{padding:8px 10px;font-size:12px;border-bottom:1px solid #F3F4F6;vertical-align:middle}tr:last-child td{border-bottom:none}.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}.br{background:#FEE2E2;color:#B91C1C}.bo{background:#FEF3C7;color:#92400E}.bg{background:#D1FAE5;color:#065F46}.pb{background:#F3F4F6;border-radius:99px;height:8px;overflow:hidden;margin-top:4px}.pf{height:100%;border-radius:99px}.cr{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F3F4F6}.cr:last-child{border-bottom:none}.ce{font-size:16px;width:24px;text-align:center}.cn{font-size:12px;font-weight:500;color:#374151;width:110px}.cb{flex:1}.cs{font-size:12px;font-weight:700;width:50px;text-align:right}.ab{border-radius:10px;padding:12px 14px;margin-bottom:10px}.ab.red{background:#FEF2F2;border-left:3px solid #EF4444}.ab.orange{background:#FFFBEB;border-left:3px solid #F59E0B}.ab.green{background:#F0FDF4;border-left:3px solid #22C55E}.at{font-size:12px;font-weight:600;margin-bottom:4px}.ad{font-size:11px;color:#6B7280;line-height:1.5}.ri{display:flex;gap:8px;padding:5px 0;font-size:12px;color:#374151;border-bottom:1px solid #F9FAFB}.ri:last-child{border-bottom:none}.rb{color:#1D9E75;font-size:16px;line-height:1.2;flex-shrink:0}.id{display:flex;gap:2px}.dot{width:8px;height:8px;border-radius:50%}.ft{text-align:center;margin-top:24px;padding:16px;background:white;border-radius:12px;border:1px solid #E5E7EB}@media print{body{background:white}.page{padding:16px}}`

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe SonoData — ${informe.periodo}</title><style>${css}</style></head><body><div class="page">
<div class="hdr"><div><div style="font-size:28px;margin-bottom:4px">🧩</div><h1>SonoData TEA</h1><p>Sistema de monitoreo sensorial para niños con autismo</p></div><div style="text-align:right"><div style="font-size:11px;opacity:.8;margin-bottom:6px">${informe.tipo==='semanal'?'📊 Informe Semanal':'📋 Informe Diario'}</div><div class="bh">${informe.periodo}</div><div style="font-size:11px;opacity:.7;margin-top:6px">Generado el ${informe.fechaGenerado.toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}</div></div></div>
<div class="pc"><div class="av">👦</div><div style="flex:1"><div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Datos del alumno</div><div class="pn">${nombreAlumno}</div><div class="pm"><span>Edad: 7 años</span><span>TEA Nivel 1</span><span>Por: ${informe.generadoPor}</span></div></div><div style="text-align:right"><div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:4px">Estado general</div><div style="font-size:24px">${estadoEmoji}</div><div style="font-size:11px;color:#6B7280;margin-top:2px">${estadoLabel}</div></div></div>
<div class="sg"><div class="sc"><div class="sn" style="color:#1D9E75">${datos.totalRegistros}</div><div class="sl">Registros</div></div><div class="sc"><div class="sn" style="color:#EF4444">${datos.incidentes}</div><div class="sl">Incidentes</div></div><div class="sc"><div class="sn" style="color:#3B82F6">${datos.logros}</div><div class="sl">Logros</div></div><div class="sc"><div class="sn" style="color:#F59E0B">${datos.estimulos}</div><div class="sl">Estímulos</div></div><div class="sc"><div class="sn" style="color:#8B5CF6">${datos.alertas}</div><div class="sl">Alertas</div></div></div>
<div class="card"><div class="sh"><h2>📋 Resumen ejecutivo</h2></div><p style="font-size:12px;color:#374151;line-height:1.7">${resumenTexto}</p></div>
<div class="tc"><div class="card"><div class="ct">🚨 Incidentes del período</div>${incidentesHTML}</div><div class="card"><div class="ct">🏆 Logros destacados</div>${logrosHTML}</div></div>
<div class="card"><div class="sh"><h2>🗺️ Perfil sensorial — Canales por impacto</h2></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><div>${cIzq}</div><div>${cDer}</div></div></div>
<div class="card"><div class="sh"><h2>⚠️ Estímulos críticos y estrategias</h2></div><table><thead><tr><th>Estímulo</th><th>Canal</th><th>Impacto</th><th>Nivel</th><th>Estrategia principal</th></tr></thead><tbody>${etabla}</tbody></table></div>
<div class="tc"><div class="card"><div class="ct">🏠 Recomendaciones para el hogar</div>${rh}</div><div class="card"><div class="ct">🏫 Recomendaciones para el aula</div>${ra}</div></div>
${alSec}
<div class="ft"><p style="font-size:10px;color:#9CA3AF">🤖 Informe generado con asistencia de Inteligencia Artificial — SonoData TEA v1.0</p><p style="font-size:10px;color:#9CA3AF;margin-top:4px">Datos de la bitácora clínica, mapa sensorial y alertas del equipo terapéutico</p></div>
</div></body></html>`

  const blob = new Blob([html],{type:'text/html'})
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href=url; a.download=`informe_${informe.tipo}_${informe.fechaGenerado.toISOString().split('T')[0]}.html`
  a.click(); URL.revokeObjectURL(url)
}

function RenderMarkdown({ texto }: { texto: string }) {
  const lines = texto.split('\n')
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        if (line.startsWith('## '))  return <h3 key={i} className="text-base font-semibold text-gray-900 mt-4 mb-1 border-l-2 border-[#1D9E75] pl-3">{line.replace('## ','')}</h3>
        if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-semibold text-gray-800 mt-2">{line.replace('### ','')}</h4>
        if (line.startsWith('- ')||line.startsWith('* ')) return <li key={i} className="text-sm text-gray-700 ml-4 list-disc">{line.replace(/^[-*] /,'')}</li>
        if (line.startsWith('|'))   return <div key={i} className="text-xs font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{line}</div>
        if (line.trim()==='')       return <div key={i} className="h-1"/>
        return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line.replace(/\*\*(.+?)\*\*/g,'$1')}</p>
      })}
    </div>
  )
}

export default function InformeIA() {
  const { usuario } = useAuthStore()
  const [informes, setInformes]           = useState<Informe[]>([])
  const [generando, setGenerando]         = useState(false)
  const [informeActual, setInformeActual] = useState<Informe|null>(null)
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState('')

  useEffect(() => { cargarInformes() }, [])

  async function cargarInformes() {
    try {
      const snap = await getDocs(query(collection(db,'alumnos',ALUMNO_ID,'informes'),orderBy('fechaGenerado','desc')))
      const data = snap.docs.map(d=>({id:d.id,...d.data(),fechaGenerado:(d.data().fechaGenerado as Timestamp)?.toDate()??new Date()})) as Informe[]
      setInformes(data)
      if (data.length>0) setInformeActual(data[0])
    } catch(e){console.error(e)}
    finally{setCargando(false)}
  }

  async function handleGenerar(tipo: 'diario'|'semanal') {
    setGenerando(true); setError('')
    try {
      const datos  = await obtenerDatosInforme(tipo==='diario'?1:7)
      const texto  = await generarInformeIA(datos, tipo)
      const ahora  = new Date()
      const id     = `${tipo}_${ahora.getTime()}`
      const informe: Informe = {
        id, tipo, fechaGenerado:ahora,
        periodo: tipo==='diario'
          ? ahora.toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})
          : `Semana del ${new Date(ahora.getTime()-7*24*60*60*1000).toLocaleDateString('es-PE',{day:'numeric',month:'long'})} al ${ahora.toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}`,
        contenido: texto,
        datos:{
          totalRegistros: datos.registros.length,
          incidentes:     datos.registros.filter((r:any)=>r.tipo==='incidente').length,
          logros:         datos.registros.filter((r:any)=>r.tipo==='logro').length,
          estimulos:      datos.estimulos.length,
          alertas:        datos.alertas.length,
        },
        generadoPor:`${usuario?.nombre} ${usuario?.apellidos}`,
      }
      await setDoc(doc(db,'alumnos',ALUMNO_ID,'informes',id),{...informe,fechaGenerado:ahora})
      setInformes(prev=>[informe,...prev])
      setInformeActual(informe)
    } catch(e:any){
      setError('Error generando el informe. Verifica la API key e intenta de nuevo.')
      console.error(e)
    } finally{setGenerando(false)}
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Informes IA</h2>
          <p className="text-sm text-gray-400 mt-0.5">Análisis automático generado por inteligencia artificial</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BtnGhost onClick={()=>handleGenerar('diario')} className="text-xs">
            {generando?'⏳ Generando...':'📋 Informe del día'}
          </BtnGhost>
          <BtnPrimary onClick={()=>handleGenerar('semanal')} disabled={generando}>
            {generando?'Generando...':'📊 Informe semanal'}
          </BtnPrimary>
        </div>
      </div>

      {error&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      {generando&&(
        <Card className="text-center py-8">
          <div className="text-4xl mb-4 animate-pulse">🤖</div>
          <div className="font-semibold text-gray-900 mb-2">Generando informe con IA...</div>
          <div className="text-sm text-gray-400 max-w-sm mx-auto">Claude está analizando los datos de bitácora, mapa sensorial y alertas.</div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <SectionLabel>Informes generados</SectionLabel>
          {cargando?(
            <div className="text-xs text-gray-400 text-center py-4">Cargando...</div>
          ):informes.length===0?(
            <Card className="text-center py-6"><div className="text-2xl mb-2">📄</div><div className="text-xs text-gray-400">No hay informes aún.</div></Card>
          ):(
            informes.map(inf=>(
              <button key={inf.id} onClick={()=>setInformeActual(inf)}
                className={`text-left p-3 rounded-xl border transition-all ${informeActual?.id===inf.id?'bg-emerald-50 border-emerald-300':'bg-white border-gray-100 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${inf.tipo==='semanal'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>
                    {inf.tipo==='semanal'?'📊 Semanal':'📋 Diario'}
                  </span>
                </div>
                <div className="text-xs font-medium text-gray-900">{inf.periodo}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{inf.datos.totalRegistros} registros · {inf.datos.alertas} alertas</div>
                <div className="text-[10px] text-gray-400">Por {inf.generadoPor}</div>
              </button>
            ))
          )}
        </div>

        <div className="sm:col-span-2">
          {informeActual?(
            <Card>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${informeActual.tipo==='semanal'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>
                      {informeActual.tipo==='semanal'?'📊 Informe Semanal':'📋 Informe Diario'}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{informeActual.periodo}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Por {informeActual.generadoPor} · {informeActual.fechaGenerado.toLocaleDateString('es-PE',{day:'numeric',month:'long'})}</div>
                </div>
                <button onClick={()=>descargarPDF(informeActual)}
                  className="text-xs font-medium text-[#1D9E75] border border-[#1D9E75] px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors">
                  ⬇ Descargar PDF
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                {[
                  {label:'Registros',valor:informeActual.datos.totalRegistros,color:'text-gray-900'},
                  {label:'Incidentes',valor:informeActual.datos.incidentes,color:'text-red-600'},
                  {label:'Logros',valor:informeActual.datos.logros,color:'text-green-600'},
                  {label:'Estímulos',valor:informeActual.datos.estimulos,color:'text-orange-600'},
                  {label:'Alertas',valor:informeActual.datos.alertas,color:'text-purple-600'},
                ].map(s=>(
                  <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className={`text-xl font-semibold ${s.color}`}>{s.valor}</div>
                    <div className="text-[10px] text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <RenderMarkdown texto={informeActual.contenido}/>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">🤖 Generado por Claude AI</span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] text-gray-400">Basado en datos reales</span>
              </div>
            </Card>
          ):(
            <Card className="text-center py-12">
              <div className="text-4xl mb-4">🤖</div>
              <div className="font-semibold text-gray-900 text-lg mb-2">Genera tu primer informe</div>
              <div className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed mb-6">
                La IA analizará bitácora, mapa sensorial y alertas para generar un informe clínico completo.
              </div>
              <div className="flex gap-3 justify-center flex-wrap">
                <BtnGhost onClick={()=>handleGenerar('diario')}>📋 Informe del día</BtnGhost>
                <BtnPrimary onClick={()=>handleGenerar('semanal')} disabled={generando}>📊 Informe semanal</BtnPrimary>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
