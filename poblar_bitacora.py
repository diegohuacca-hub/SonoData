"""
SonoData TEA — Script de población de datos realistas
Agrega 5 registros por cada rol: padre, terapeuta, docente
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import random

# ─── Inicializar Firebase ─────────────────────────────────────────────────────
cred = credentials.Certificate(
    r'C:\xampp\htdocs\SonoData\packages\gateway\serviceAccountKey.json'
)
firebase_admin.initialize_app(cred)
db = firestore.client()

ALUMNO_ID = 'alumno_001'

# ─── Función para fechas relativas ───────────────────────────────────────────
def hace(dias=0, horas=0):
    return datetime.now() - timedelta(days=dias, hours=horas)

# ─── REGISTROS DEL TERAPEUTA (Lucía Ramírez) ─────────────────────────────────
registros_terapeuta = [
    {
        'tipo': 'sensorial',
        'severidad': 4,
        'titulo': 'Reacción intensa al timbre escolar',
        'descripcion': 'Durante la sesión de hoy, Mateo mostró una respuesta de defensa sensorial significativa ante el timbre del recreo. Se cubrió los oídos con ambas manos, se agachó bajo la mesa y comenzó a emitir vocalizaciones repetitivas. La conducta duró aproximadamente 4 minutos. Se aplicó protocolo de rincón de calma con resultado positivo a los 6 minutos del inicio.',
        'contextos': ['Hora de clase'],
        'intervenciones': ['Rincón de calma', 'Apoyo físico suave'],
        'areaDesarrollo': ['Regulación emocional'],
        'visibilidad': 'todos',
        'autorNombre': 'Lucía Ramírez',
        'autorRol': 'terapeuta',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['timbre', 'auditivo', 'urgente'],
        'camposExtra': [
            {'label': 'Duración del episodio', 'valor': '4 minutos'},
            {'label': 'Tiempo de recuperación', 'valor': '6 minutos'},
        ],
        'fecha': hace(1, 2),
    },
    {
        'tipo': 'logro',
        'severidad': 1,
        'titulo': 'Primera participación voluntaria en actividad grupal',
        'descripcion': 'Hito significativo en el proceso terapéutico: Mateo tomó la iniciativa de unirse a un grupo de 3 compañeros durante la actividad de construcción con bloques. Mantuvo la interacción durante 8 minutos sin necesidad de mediación del terapeuta. Utilizó contacto visual espontáneo en 2 ocasiones y verbalizó "¿puedo poner este?" al solicitar turno.',
        'contextos': ['Actividad grupal'],
        'intervenciones': ['Refuerzo positivo'],
        'areaDesarrollo': ['Habilidades sociales', 'Lenguaje y comunicación'],
        'visibilidad': 'todos',
        'autorNombre': 'Lucía Ramírez',
        'autorRol': 'terapeuta',
        'requiereSeguimiento': False,
        'seguimientoResuelto': False,
        'tags': ['logro', 'social', 'hito'],
        'camposExtra': [
            {'label': 'Duración interacción', 'valor': '8 minutos'},
            {'label': 'Número de compañeros', 'valor': '3'},
        ],
        'fecha': hace(2, 4),
    },
    {
        'tipo': 'incidente',
        'severidad': 3,
        'titulo': 'Crisis de transición entre actividades',
        'descripcion': 'Al finalizar la sesión de arte y anunciar el cambio a matemáticas, Mateo presentó conducta de oposición: tiró los materiales de la mesa, se negó a levantarse y comenzó a golpear repetidamente la silla. La conducta se atribuye a la dificultad en flexibilidad cognitiva y tolerancia a la frustración ante cambios no anticipados. Se implementó anticipación verbal con pictograma y agenda visual.',
        'contextos': ['Tránsito entre actividades'],
        'intervenciones': ['Apoyo visual (pictogramas)', 'Redirección de actividad'],
        'areaDesarrollo': ['Regulación emocional', 'Conducta adaptativa'],
        'visibilidad': 'profesional',
        'autorNombre': 'Lucía Ramírez',
        'autorRol': 'terapeuta',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['transicion', 'conducta', 'agenda-visual'],
        'camposExtra': [
            {'label': 'Estrategia aplicada', 'valor': 'Pictograma + aviso 5 minutos antes'},
            {'label': 'Efectividad', 'valor': 'Moderada — requiere refuerzo diario'},
        ],
        'fecha': hace(3, 1),
    },
    {
        'tipo': 'observacion',
        'severidad': 2,
        'titulo': 'Patrón de estereotipia motora en momentos de espera',
        'descripcion': 'Se observa que Mateo presenta movimientos repetitivos de balanceo lateral (rocking) cuando debe esperar turnos o en períodos de espera no estructurada. La conducta aparece con mayor frecuencia entre las 10:00 y 11:00am, posiblemente relacionado con el nivel de activación matutina. No interfiere con el aprendizaje pero puede generar rechazo social con pares.',
        'contextos': ['Actividad grupal', 'Hora de clase'],
        'intervenciones': ['Ninguna necesaria'],
        'areaDesarrollo': ['Habilidades sociales', 'Conducta adaptativa'],
        'visibilidad': 'profesional',
        'autorNombre': 'Lucía Ramírez',
        'autorRol': 'terapeuta',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['estereotipia', 'motor', 'patron'],
        'camposExtra': [
            {'label': 'Horario de mayor frecuencia', 'valor': '10:00 - 11:00 AM'},
            {'label': 'Contexto disparador', 'valor': 'Espera no estructurada'},
        ],
        'fecha': hace(4, 3),
    },
    {
        'tipo': 'comunicacion',
        'severidad': 1,
        'titulo': 'Recomendaciones para rutina de llegada al hogar',
        'descripcion': 'Estimados Carlos y familia: Basándome en las observaciones de esta semana, recomiendo implementar una "zona de descompresión" de 20-30 minutos al llegar Mateo del colegio. Durante este tiempo: evitar demandas verbales, ofrecer snack de preferencia, permitir actividad de libre elección (bloques o dibujo). El colegio es altamente estimulante para su perfil sensorial y necesita ese tiempo de regulación antes de interacciones sociales.',
        'contextos': ['En casa'],
        'intervenciones': ['Ninguna necesaria'],
        'areaDesarrollo': ['Regulación emocional', 'Autonomía'],
        'visibilidad': 'todos',
        'autorNombre': 'Lucía Ramírez',
        'autorRol': 'terapeuta',
        'requiereSeguimiento': False,
        'seguimientoResuelto': False,
        'tags': ['recomendacion', 'hogar', 'rutina'],
        'camposExtra': [
            {'label': 'Para implementar en casa', 'valor': 'Zona de descompresión 20-30 min'},
        ],
        'fecha': hace(5, 6),
    },
]

# ─── REGISTROS DEL DOCENTE (Marco Torres) ────────────────────────────────────
registros_docente = [
    {
        'tipo': 'incidente',
        'severidad': 3,
        'titulo': 'Sobrecarga sensorial en el comedor escolar',
        'descripcion': 'Durante el almuerzo, Mateo comenzó a mostrar signos visibles de sobrecarga: se tapó los oídos, rechazó la bandeja de comida y se paró de la silla intentando alejarse del área. El comedor estaba especialmente ruidoso hoy por un evento de cumpleaños. Se acompañó al alumno al pasillo hasta que se reguló (aprox. 5 minutos) y luego almorzó en el aula con un auxiliar.',
        'contextos': ['Comedor'],
        'intervenciones': ['Rincón de calma', 'Redirección de actividad'],
        'areaDesarrollo': ['Regulación emocional'],
        'visibilidad': 'todos',
        'autorNombre': 'Marco Torres',
        'autorRol': 'docente',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['comedor', 'ruido', 'sobrecarga'],
        'camposExtra': [
            {'label': 'Nivel de ruido del comedor', 'valor': 'Alto — evento de cumpleaños'},
            {'label': 'Solución aplicada', 'valor': 'Almuerzo en aula con auxiliar'},
        ],
        'fecha': hace(1, 5),
    },
    {
        'tipo': 'logro',
        'severidad': 1,
        'titulo': 'Completó tarea de matemáticas de forma independiente',
        'descripcion': 'Por primera vez en el semestre, Mateo completó la hoja de ejercicios de suma con llevadas sin solicitar ayuda del docente ni del auxiliar. Utilizó los dedos como apoyo y verificó sus respuestas dos veces. Al terminar dijo "ya acabé" con tono de satisfacción notable. La tarea fue entregada dentro del tiempo asignado a la clase.',
        'contextos': ['Hora de clase'],
        'intervenciones': ['Refuerzo positivo'],
        'areaDesarrollo': ['Atención y concentración', 'Autonomía'],
        'visibilidad': 'todos',
        'autorNombre': 'Marco Torres',
        'autorRol': 'docente',
        'requiereSeguimiento': False,
        'seguimientoResuelto': False,
        'tags': ['matematicas', 'autonomia', 'logro'],
        'camposExtra': [
            {'label': 'Materia', 'valor': 'Matemáticas — sumas con llevadas'},
            {'label': 'Tiempo empleado', 'valor': 'Dentro del tiempo de clase'},
        ],
        'fecha': hace(2, 2),
    },
    {
        'tipo': 'sensorial',
        'severidad': 3,
        'titulo': 'Rechazo a material de plastilina en clase de arte',
        'descripcion': 'Durante la clase de arte, Mateo se negó completamente a tocar la plastilina. Al intentar que la tomara, retiró la mano con rapidez y expresó "no, pegajoso, no". Permaneció sentado observando a sus compañeros durante toda la actividad. La docente de arte le ofreció como alternativa los crayones, que aceptó sin problema. Posible hipersensibilidad táctil a texturas blandas y pegajosas.',
        'contextos': ['Hora de clase', 'Actividad individual'],
        'intervenciones': ['Redirección de actividad'],
        'areaDesarrollo': ['Conducta adaptativa'],
        'visibilidad': 'todos',
        'autorNombre': 'Marco Torres',
        'autorRol': 'docente',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['tactil', 'plastilina', 'rechazo', 'arte'],
        'camposExtra': [
            {'label': 'Material rechazado', 'valor': 'Plastilina — textura blanda/pegajosa'},
            {'label': 'Alternativa aceptada', 'valor': 'Crayones sin problema'},
        ],
        'fecha': hace(3, 4),
    },
    {
        'tipo': 'observacion',
        'severidad': 2,
        'titulo': 'Dificultad en la fila para entrada al colegio',
        'descripcion': 'Mateo muestra consistentemente dificultad para tolerar la proximidad física de otros alumnos durante la formación en fila. Empuja suavemente a quien está detrás y delante de él, y hace comentarios como "me están aplastando" cuando hay contacto físico involuntario. No parece ser conducta agresiva sino respuesta a incomodidad sensorial. Se ha estado ubicando al final de la fila como medida temporal.',
        'contextos': ['Llegada al colegio'],
        'intervenciones': ['Ninguna necesaria'],
        'areaDesarrollo': ['Habilidades sociales', 'Regulación emocional'],
        'visibilidad': 'todos',
        'autorNombre': 'Marco Torres',
        'autorRol': 'docente',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['fila', 'proximidad', 'tactil', 'entrada'],
        'camposExtra': [
            {'label': 'Solución temporal', 'valor': 'Ubicar al final de la fila'},
            {'label': 'Frecuencia', 'valor': 'Diaria — todas las mañanas'},
        ],
        'fecha': hace(4, 1),
    },
    {
        'tipo': 'comunicacion',
        'severidad': 1,
        'titulo': 'Coordinación con terapeuta — ajuste de horario de sesión',
        'descripcion': 'Lucía, quería comentarte que las sesiones de los lunes a primera hora están coincidiendo con el período de mayor dificultad de Mateo para regularse. Los lunes llega visiblemente activado y el aula está más ruidosa. ¿Sería posible mover la sesión a después del recreo (10:30am)? En ese horario suele estar más tranquilo y receptivo. Avísame qué piensas.',
        'contextos': ['Hora de clase'],
        'intervenciones': ['Ninguna necesaria'],
        'areaDesarrollo': [],
        'visibilidad': 'profesional',
        'autorNombre': 'Marco Torres',
        'autorRol': 'docente',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['coordinacion', 'horario', 'lunes'],
        'camposExtra': [
            {'label': 'Horario propuesto', 'valor': '10:30 AM — después del recreo'},
        ],
        'fecha': hace(5, 2),
    },
]

# ─── REGISTROS DEL PADRE (Carlos Mendoza) ────────────────────────────────────
registros_padre = [
    {
        'tipo': 'aporte_padre',
        'severidad': 2,
        'titulo': 'Le cuesta mucho dormirse los domingos por la noche',
        'descripcion': 'Quería compartir que los domingos Mateo tiene mucha dificultad para conciliar el sueño. Se levanta varias veces, pide agua, dice que escucha ruidos. Creemos que es la anticipación al lunes y al colegio. Hemos probado música suave y funciona un poco. ¿Tienen alguna recomendación para la rutina de la noche del domingo?',
        'contextos': ['En casa'],
        'intervenciones': [],
        'areaDesarrollo': ['Regulación emocional', 'Autonomía'],
        'visibilidad': 'todos',
        'autorNombre': 'Carlos Mendoza',
        'autorRol': 'padre',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['sueño', 'domingo', 'noche', 'ansiedad'],
        'camposExtra': [
            {'label': 'Estrategia que ayuda', 'valor': 'Música suave — funciona parcialmente'},
            {'label': 'Hora de inicio del problema', 'valor': 'Desde las 8:30 PM'},
        ],
        'fecha': hace(1, 8),
    },
    {
        'tipo': 'logro',
        'severidad': 1,
        'titulo': 'Se cepilló los dientes solo por primera vez sin llorar',
        'descripcion': 'Pequeño pero gran logro para nosotros: esta mañana Mateo se cepilló los dientes completamente solo y sin protestar. Normalmente el cepillo le molesta mucho (dice que le duele aunque no haya pasta). Usamos el cepillo suave que nos recomendaron y pusimos la canción de sus bloques de fondo. ¡Lo hizo en 2 minutos sin ayuda!',
        'contextos': ['En casa'],
        'intervenciones': [],
        'areaDesarrollo': ['Autonomía', 'Conducta adaptativa'],
        'visibilidad': 'todos',
        'autorNombre': 'Carlos Mendoza',
        'autorRol': 'padre',
        'requiereSeguimiento': False,
        'seguimientoResuelto': False,
        'tags': ['higiene', 'autonomia', 'logro', 'cepillado'],
        'camposExtra': [
            {'label': 'Estrategia utilizada', 'valor': 'Cepillo suave + canción favorita de fondo'},
            {'label': 'Tiempo', 'valor': '2 minutos sin ayuda'},
        ],
        'fecha': hace(2, 6),
    },
    {
        'tipo': 'sensorial',
        'severidad': 3,
        'titulo': 'Reacción muy fuerte al olor de la pintura de la pared nueva',
        'descripcion': 'Esta semana pintamos el cuarto de Mateo y la reacción fue peor de lo esperada. No quiso entrar al cuarto por dos días, aunque ya no olía para nosotros. Dijo varias veces "huele feo, me duele la cabeza". Tuvo que dormir en nuestra cama esos días. ¿Es normal esta sensibilidad olfativa? ¿Cuánto puede durar?',
        'contextos': ['En casa'],
        'intervenciones': [],
        'areaDesarrollo': ['Regulación emocional'],
        'visibilidad': 'todos',
        'autorNombre': 'Carlos Mendoza',
        'autorRol': 'padre',
        'requiereSeguimiento': True,
        'seguimientoResuelto': False,
        'tags': ['olfato', 'pintura', 'olor', 'hipersensibilidad'],
        'camposExtra': [
            {'label': 'Duración del rechazo', 'valor': '2 días sin entrar al cuarto'},
            {'label': 'Síntoma reportado', 'valor': 'Dolor de cabeza por el olor'},
        ],
        'fecha': hace(3, 3),
    },
    {
        'tipo': 'observacion',
        'severidad': 2,
        'titulo': 'Come mejor cuando hay silencio en la mesa',
        'descripcion': 'Hemos notado que Mateo come mucho mejor (más cantidad, más variedad) cuando la hora del almuerzo es tranquila, sin televisión y sin muchas conversaciones al mismo tiempo. Los días que hay visitas en casa o que ponemos la tele, casi no come. Creo que el ruido le quita el apetito. ¿Esto tiene relación con lo sensorial?',
        'contextos': ['En casa'],
        'intervenciones': [],
        'areaDesarrollo': ['Conducta adaptativa', 'Autonomía'],
        'visibilidad': 'todos',
        'autorNombre': 'Carlos Mendoza',
        'autorRol': 'padre',
        'requiereSeguimiento': False,
        'seguimientoResuelto': False,
        'tags': ['alimentacion', 'silencio', 'ruido', 'patron'],
        'camposExtra': [
            {'label': 'Condición óptima para comer', 'valor': 'Sin TV, sin conversaciones simultáneas'},
            {'label': 'Variación observada', 'valor': 'Come más cantidad y variedad en silencio'},
        ],
        'fecha': hace(4, 5),
    },
    {
        'tipo': 'aporte_padre',
        'severidad': 1,
        'titulo': 'Le encantan los bloques de construcción — los usa para calmarse',
        'descripcion': 'Quería compartir algo positivo: Mateo ha desarrollado por sí solo una estrategia de autorregulación. Cuando llega del colegio estresado, va directo a sus bloques LEGO y construye por unos 20-30 minutos. Sale de esa actividad completamente diferente — tranquilo, hablador, dispuesto a comer y hacer tareas. ¿Podría incorporarse algo similar en el colegio?',
        'contextos': ['En casa'],
        'intervenciones': [],
        'areaDesarrollo': ['Regulación emocional', 'Autonomía'],
        'visibilidad': 'todos',
        'autorNombre': 'Carlos Mendoza',
        'autorRol': 'padre',
        'requiereSeguimiento': False,
        'seguimientoResuelto': False,
        'tags': ['lego', 'autorregulacion', 'estrategia', 'positivo'],
        'camposExtra': [
            {'label': 'Actividad reguladora', 'valor': 'Bloques LEGO — 20 a 30 minutos'},
            {'label': 'Efecto observado', 'valor': 'Tranquilo, hablador y receptivo después'},
        ],
        'fecha': hace(6, 1),
    },
]

# ─── Función para insertar registros ─────────────────────────────────────────
def insertar_registros(registros, rol_label):
    print(f'\n📝 Insertando registros del {rol_label}...')
    ref = db.collection('alumnos').document(ALUMNO_ID).collection('bitacora')

    for i, r in enumerate(registros):
        try:
            # Limpiar campos undefined
            datos = {k: v for k, v in r.items() if v is not None}
            datos['fecha'] = r['fecha']
            datos['comentarios'] = []
            datos['inmutable'] = r['severidad'] >= 4

            doc_ref = ref.add(datos)
            print(f'  ✓ [{i+1}/5] {r["titulo"][:50]}...')

            # Generar alerta si severidad >= 4
            if r['severidad'] >= 4:
                alerta_ref = db.collection('alumnos').document(ALUMNO_ID).collection('alertas_sensor')
                alerta_ref.add({
                    'tipo': 'bitacora_manual',
                    'severidad': r['severidad'],
                    'titulo': f'{r["tipo"].capitalize()}: {r["titulo"]}',
                    'descripcion': r['descripcion'][:120] + ('...' if len(r['descripcion']) > 120 else ''),
                    'timestamp': r['fecha'],
                    'resuelta': False,
                    'fuente': 'bitacora',
                    'autorNombre': r['autorNombre'],
                    'autorRol': r['autorRol'],
                })
                print(f'    ⚠ Alerta generada (sev {r["severidad"]})')

        except Exception as e:
            print(f'  ✗ Error en registro {i+1}: {e}')

# ─── Ejecutar ─────────────────────────────────────────────────────────────────
print('=' * 60)
print('  SonoData TEA — Población de datos de prueba')
print('  Alumno: Mateo Mendoza (alumno_001)')
print('=' * 60)

insertar_registros(registros_terapeuta, 'Terapeuta (Lucía Ramírez)')
insertar_registros(registros_docente,   'Docente (Marco Torres)')
insertar_registros(registros_padre,     'Padre (Carlos Mendoza)')

print('\n' + '=' * 60)
print('  ✅ ¡Listo! Se insertaron 15 registros en total.')
print('  5 por cada rol: terapeuta, docente y padre.')
print('  Abre la app y verifica la bitácora.')
print('=' * 60)
