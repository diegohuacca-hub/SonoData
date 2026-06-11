"""
SonoData TEA — Script de población del mapa sensorial
Estímulos coherentes con los registros de la bitácora de Mateo Mendoza
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta

try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(
        r'C:\xampp\htdocs\SonoData\packages\gateway\serviceAccountKey.json'
    )
    firebase_admin.initialize_app(cred)

db = firestore.client()
ALUMNO_ID = 'alumno_001'

estimulos = [
    # ── AUDITIVOS ─────────────────────────────────────────────────────────────
    {
        'nombre': 'Timbre escolar',
        'canal': 'auditivo',
        'impacto': 9, 'frecuencia': 5, 'recuperacion': 4,
        'scorePrioridad': 7.7,
        'reacciones': ['Se cubre los oídos','Llanto','Se agacha o esconde','Vocaliza repetidamente'],
        'estrategias': ['Anticipar verbalmente antes del timbre','Auriculares de cancelación de ruido','Ubicar lejos de la fuente','Rincón de calma preparado'],
        'notas': 'Terapeuta registró episodio en sesión. Duración: 4 min. Recuperación: 6 min con rincón de calma.',
        'autodetectado': False, 'ocurrencias': 4,
        'creadoEn': datetime.now() - timedelta(days=1, hours=2),
    },
    {
        'nombre': 'Ruido del comedor escolar',
        'canal': 'auditivo',
        'impacto': 8, 'frecuencia': 5, 'recuperacion': 3,
        'scorePrioridad': 6.8,
        'reacciones': ['Se tapa los oídos','Rechaza la comida','Intenta alejarse','Agitación visible'],
        'estrategias': ['Almorzar en el aula en días ruidosos','Ubicar en extremo menos ruidoso','Anticipar eventos especiales'],
        'notas': 'Docente registró sobrecarga en evento de cumpleaños. Solución: almuerzo en aula con auxiliar.',
        'autodetectado': False, 'ocurrencias': 3,
        'creadoEn': datetime.now() - timedelta(days=1, hours=5),
    },
    {
        'nombre': 'Aspiradora',
        'canal': 'auditivo',
        'impacto': 7, 'frecuencia': 2, 'recuperacion': 3,
        'scorePrioridad': 5.45,
        'reacciones': ['Sale corriendo del área','Llanto','Busca refugio en su cuarto'],
        'estrategias': ['Avisar con anticipación','Usar cuando Mateo no está','Auriculares mientras se aspira'],
        'notas': 'Identificado en evaluación inicial. Frecuencia baja porque se puede controlar en el hogar.',
        'autodetectado': False, 'ocurrencias': 2,
        'creadoEn': datetime.now() - timedelta(days=7),
    },
    {
        'nombre': 'Conversaciones simultáneas en casa',
        'canal': 'auditivo',
        'impacto': 5, 'frecuencia': 4, 'recuperacion': 2,
        'scorePrioridad': 4.3,
        'reacciones': ['Deja de comer','Se aísla','Disminuye comunicación verbal'],
        'estrategias': ['Evitar televisión durante comidas','Reducir conversaciones simultáneas','Hora de comida estructurada'],
        'notas': 'Padre observó que come mejor con silencio en la mesa. Sin TV ni conversaciones múltiples.',
        'autodetectado': False, 'ocurrencias': 2,
        'creadoEn': datetime.now() - timedelta(days=4, hours=5),
    },
    {
        'nombre': 'Música suave instrumental',
        'canal': 'auditivo',
        'impacto': 1, 'frecuencia': 4, 'recuperacion': 1,
        'scorePrioridad': 1.0,
        'reacciones': ['Se relaja visiblemente','Facilita el sueño','Reduce ansiedad anticipatoria'],
        'estrategias': ['Usar en rutina nocturna los domingos','Reproducir en transiciones','Incluir en protocolo de calma'],
        'notas': 'Padre reportó que ayuda con dificultad para dormir los domingos. Regulador positivo.',
        'autodetectado': False, 'ocurrencias': 3,
        'creadoEn': datetime.now() - timedelta(days=1, hours=8),
    },
    # ── TÁCTILES ──────────────────────────────────────────────────────────────
    {
        'nombre': 'Plastilina y masas blandas',
        'canal': 'tactil',
        'impacto': 7, 'frecuencia': 3, 'recuperacion': 2,
        'scorePrioridad': 5.45,
        'reacciones': ['Retira la mano con rapidez','Verbaliza "no, pegajoso"','Rechazo total a la actividad'],
        'estrategias': ['Ofrecer crayones o lápices como alternativa','No forzar el contacto','Exposición gradual con guantes'],
        'notas': 'Docente registró rechazo en clase de arte. Alternativa aceptada: crayones sin problema.',
        'autodetectado': False, 'ocurrencias': 3,
        'creadoEn': datetime.now() - timedelta(days=3, hours=4),
    },
    {
        'nombre': 'Proximidad física no anticipada en fila',
        'canal': 'tactil',
        'impacto': 6, 'frecuencia': 5, 'recuperacion': 2,
        'scorePrioridad': 5.05,
        'reacciones': ['Empuja suavemente a quienes están cerca','Verbaliza "me están aplastando"','Intenta crear espacio'],
        'estrategias': ['Ubicar al final de la fila','Crear espacio extra marcado en el suelo','Anticipar situaciones de aglomeración'],
        'notas': 'Docente observó conducta diaria en llegada al colegio. No es agresión sino respuesta sensorial.',
        'autodetectado': False, 'ocurrencias': 5,
        'creadoEn': datetime.now() - timedelta(days=4, hours=1),
    },
    {
        'nombre': 'Etiquetas y costuras de ropa',
        'canal': 'tactil',
        'impacto': 5, 'frecuencia': 4, 'recuperacion': 1,
        'scorePrioridad': 4.1,
        'reacciones': ['Se rasca repetidamente','Se queja de que "pica"','Intenta quitarse la ropa'],
        'estrategias': ['Cortar etiquetas de toda la ropa','Preferir ropa sin costuras internas','Telas de algodón suave'],
        'notas': 'Identificado con la familia. Padre reporta preferencia por ropa sin etiquetas.',
        'autodetectado': False, 'ocurrencias': 3,
        'creadoEn': datetime.now() - timedelta(days=10),
    },
    # ── OLFATIVO ──────────────────────────────────────────────────────────────
    {
        'nombre': 'Olor a pintura y productos químicos',
        'canal': 'olfativo',
        'impacto': 8, 'frecuencia': 1, 'recuperacion': 5,
        'scorePrioridad': 5.8,
        'reacciones': ['Rechazo total al espacio','Verbaliza "huele feo, me duele la cabeza"','No ingresa al área por días'],
        'estrategias': ['Pintar cuando Mateo no está','Ventilar mínimo 48 horas','Usar pinturas de baja emisión','No forzar el ingreso'],
        'notas': 'Padre reportó episodio al pintar el cuarto. No entró por 2 días. Recuperación muy lenta.',
        'autodetectado': False, 'ocurrencias': 1,
        'creadoEn': datetime.now() - timedelta(days=3, hours=3),
    },
    # ── VISUAL ────────────────────────────────────────────────────────────────
    {
        'nombre': 'Luz fluorescente parpadeante',
        'canal': 'visual',
        'impacto': 6, 'frecuencia': 3, 'recuperacion': 2,
        'scorePrioridad': 4.8,
        'reacciones': ['Se frota los ojos','Evita mirar hacia la fuente','Disminuye concentración'],
        'estrategias': ['Preferir luz natural o LED cálida','Reemplazar fluorescentes del aula','Ubicar lejos de luces parpadeantes'],
        'notas': 'Observado en evaluaciones iniciales. El aula tiene fluorescentes que ocasionalmente parpadean.',
        'autodetectado': False, 'ocurrencias': 2,
        'creadoEn': datetime.now() - timedelta(days=8),
    },
    # ── PROPIOCEPTIVO ─────────────────────────────────────────────────────────
    {
        'nombre': 'Bloques LEGO y construcción',
        'canal': 'propioceptivo',
        'impacto': 1, 'frecuencia': 5, 'recuperacion': 1,
        'scorePrioridad': 1.0,
        'reacciones': ['Se regula y tranquiliza','Aumenta comunicación verbal','Concentración sostenida'],
        'estrategias': ['Usar post-colegio como descompresión','Implementar rincón de bloques en el aula','Ofrecer como actividad de calma'],
        'notas': 'Padre identificó como autorregulador espontáneo. 20-30 min de LEGO al llegar del colegio lo regula completamente.',
        'autodetectado': False, 'ocurrencias': 5,
        'creadoEn': datetime.now() - timedelta(days=6, hours=1),
    },
]

def insertar_estimulos():
    print('=' * 60)
    print('  SonoData TEA — Población del mapa sensorial')
    print('  Alumno: Mateo Mendoza (alumno_001)')
    print('=' * 60)
    print(f'\n Insertando {len(estimulos)} estímulos...\n')

    ref = db.collection('alumnos').document(ALUMNO_ID).collection('mapa_sensorial')

    CANAL_LABEL = {
        'auditivo': '🔊 Auditivo', 'tactil': '👋 Táctil',
        'olfativo': '👃 Olfativo', 'visual': '👁  Visual',
        'propioceptivo': '💪 Propioceptivo',
    }

    for i, e in enumerate(estimulos):
        try:
            datos = {k: v for k, v in e.items() if v is not None}
            ref.add(datos)
            canal = CANAL_LABEL.get(e['canal'], e['canal'])
            imp = e['impacto']
            nivel = 'CRITICO' if imp >= 9 else 'ALTO' if imp >= 7 else 'MODERADO' if imp >= 5 else 'POSITIVO'
            print(f'  OK [{i+1}/{len(estimulos)}] {canal} | {nivel} ({imp}/10) — {e["nombre"]}')
        except Exception as ex:
            print(f'  ERROR en estimulo {i+1}: {ex}')

    print('\n' + '=' * 60)
    print(f'  Listo! Se insertaron {len(estimulos)} estimulos.')
    print('  Criticos (evitar):  Timbre, Comedor, Pintura')
    print('  Positivos (usar):   Bloques LEGO, Musica suave')
    print('=' * 60)

insertar_estimulos()
