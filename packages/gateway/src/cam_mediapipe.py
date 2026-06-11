"""
SonoData TEA — Módulo de detección facial v3
Usa hsemotion-onnx (AffectNet) — mucho más preciso que FER+
Sin conflictos con tensorflow/YAMNet
"""

import cv2
import time
import threading
import logging
import os
import urllib.request
import numpy as np

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger(__name__)

DIR = os.path.dirname(__file__)

# ─── DNN Face Detector ────────────────────────────────────────────────────────
FACE_PROTO_PATH = os.path.join(DIR, 'deploy.prototxt')
FACE_MODEL_PATH = os.path.join(DIR, 'res10_300x300_ssd_iter_140000.caffemodel')
FACE_PROTO_URL  = 'https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt'
FACE_MODEL_URL  = 'https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel'

# ─── Emociones ────────────────────────────────────────────────────────────────
# HSEmotion devuelve: Anger, Contempt, Disgust, Fear, Happiness, Neutral, Sadness, Surprise
MAPA_TEA = {
    'Anger':    'enojo',
    'Contempt': 'desprecio',
    'Disgust':  'disgusto',
    'Fear':     'miedo',
    'Happiness':'felicidad',
    'Neutral':  'neutral',
    'Sadness':  'tristeza',
    'Surprise': 'sorpresa',
}

EMOCIONES_EMOJI = {
    'enojo':     '😠',
    'desprecio': '😒',
    'disgusto':  '🤢',
    'miedo':     '😨',
    'felicidad': '😊',
    'neutral':   '😐',
    'tristeza':  '😢',
    'sorpresa':  '😮',
    'neutral':   '😶',
}


def descargar_si_falta(url, path, nombre):
    if os.path.exists(path):
        return True
    logger.info(f'[Cámara] Descargando {nombre}...')
    try:
        urllib.request.urlretrieve(url, path)
        logger.info(f'[Cámara] {nombre} descargado ✓')
        return True
    except Exception as e:
        logger.error(f'[Cámara] Error: {e}')
        return False


class CamaraFER:
    def __init__(self, camara_index: int = 0, callback=None):
        self.camara_index     = camara_index
        self.callback         = callback
        self.emocion_actual   = 'neutral'
        self.confianza_actual = 0.0
        self.activo           = False
        self._thread          = None
        self._cap             = None
        self._face_net        = None
        self._face_cascade    = None
        self._fer             = None   # HSEmotionRecognizer
        self._usar_dnn        = False
        self._usar_hsemo      = False
        self._historial: list[tuple[str, float]] = []
        self._MAX_HIST = 5

    def _inicializar(self):
        # 1. DNN Face Detector
        p1 = descargar_si_falta(FACE_PROTO_URL, FACE_PROTO_PATH, 'deploy.prototxt')
        p2 = descargar_si_falta(FACE_MODEL_URL, FACE_MODEL_PATH, 'res10_300x300_ssd.caffemodel')
        if p1 and p2:
            try:
                self._face_net  = cv2.dnn.readNetFromCaffe(FACE_PROTO_PATH, FACE_MODEL_PATH)
                self._usar_dnn  = True
                logger.info('[Cámara] DNN Face Detector cargado ✓')
            except Exception as e:
                logger.warning(f'[Cámara] DNN Face falló: {e}')

        if not self._usar_dnn:
            self._face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            logger.warning('[Cámara] Usando Haar Cascade como fallback')

        # 2. HSEmotion (AffectNet)
        try:
            from hsemotion_onnx.facial_emotions import HSEmotionRecognizer
            self._fer        = HSEmotionRecognizer(model_name='enet_b0_8_best_afew')
            self._usar_hsemo = True
            logger.info('[Cámara] HSEmotion AffectNet cargado ✓')
        except Exception as e:
            logger.error(f'[Cámara] HSEmotion falló: {e}')

        modo_face = 'DNN' if self._usar_dnn else 'Haar'
        modo_emo  = 'HSEmotion/AffectNet' if self._usar_hsemo else 'Sin modelo'
        logger.info(f'[Cámara] Modo: {modo_face} + {modo_emo} + Suavizado x{self._MAX_HIST}')

    def _detectar_rostros(self, frame):
        if self._usar_dnn:
            h, w  = frame.shape[:2]
            blob  = cv2.dnn.blobFromImage(cv2.resize(frame,(300,300)), 1.0, (300,300), (104.,177.,123.))
            self._face_net.setInput(blob)
            dets  = self._face_net.forward()
            caras = []
            for i in range(dets.shape[2]):
                conf = dets[0,0,i,2]
                if conf > 0.45:
                    x1 = max(0, int(dets[0,0,i,3]*w))
                    y1 = max(0, int(dets[0,0,i,4]*h))
                    x2 = min(w, int(dets[0,0,i,5]*w))
                    y2 = min(h, int(dets[0,0,i,6]*h))
                    if x2>x1 and y2>y1:
                        caras.append((x1,y1,x2-x1,y2-y1))
            return caras
        else:
            gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self._face_cascade.detectMultiScale(gray, 1.03, 2, minSize=(20,20))
            return list(faces) if len(faces)>0 else []

    def _suavizar(self, emocion: str, confianza: float) -> str:
        self._historial.append((emocion, confianza))
        if len(self._historial) > self._MAX_HIST:
            self._historial.pop(0)
        pesos  = list(range(1, len(self._historial)+1))
        scores: dict[str,float] = {}
        for peso, (em, conf) in zip(pesos, self._historial):
            scores[em] = scores.get(em, 0) + peso * conf
        return max(scores, key=scores.__getitem__)

    def _loop(self):
        self._inicializar()
        if not self._usar_hsemo:
            logger.error('[Cámara] Sin modelo de emociones — deteniendo')
            return

        self._cap = cv2.VideoCapture(self.camara_index)
        if not self._cap.isOpened():
            logger.error(f'[Cámara] No se pudo abrir dispositivo {self.camara_index}')
            return
        logger.info(f'[Cámara] Dispositivo {self.camara_index} abierto')

        ultimo   = 0
        INTERVALO = 0.8

        while self.activo:
            ret, frame = self._cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            ahora = time.time()
            if ahora - ultimo >= INTERVALO:
                ultimo = ahora
                try:
                    caras = self._detectar_rostros(frame)
                    if not caras:
                        continue

                    x, y, w, h = max(caras, key=lambda c: c[2]*c[3])

                    # Extraer ROI y pasar a HSEmotion
                    roi = frame[y:y+h, x:x+w]
                    roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)

                    emocion_raw, scores = self._fer.predict_emotions(roi_rgb, logits=False)

                    # scores es array de probabilidades
                    confianza = float(np.max(scores))

                    # Debug — ver distribución
                    emociones_hsemo = ['Anger','Contempt','Disgust','Fear','Happiness','Neutral','Sadness','Surprise']
                    for em, sc in zip(emociones_hsemo, scores):
                        if sc > 0.08:
                            print(f'    {em}: {sc:.0%}')

                    if confianza < 0.05:
                        continue

                    emocion_suav = self._suavizar(emocion_raw, confianza)
                    emocion_tea  = MAPA_TEA.get(emocion_suav, 'tranquilo')

                    self.emocion_actual   = emocion_tea
                    self.confianza_actual = confianza

                    emoji = EMOCIONES_EMOJI.get(emocion_tea, '😶')
                    logger.info(f'[Cámara HSEmo] {emoji} {emocion_tea} ({emocion_raw}→{emocion_suav}) | {confianza:.0%}')

                    if self.callback:
                        self.callback(emocion_tea, confianza)

                except Exception as e:
                    logger.debug(f'[Cámara] Error: {e}')

            time.sleep(0.03)

        if self._cap:
            self._cap.release()
        logger.info('[Cámara] Detenida')

    def iniciar(self):
        if self.activo: return
        self.activo  = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def detener(self):
        self.activo = False
        if self._thread:
            self._thread.join(timeout=3)

    def obtener_estado(self) -> dict:
        return {'emocion': self.emocion_actual, 'confianza': self.confianza_actual}


# ─── Test ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print('=' * 55)
    print('  SonoData TEA — Cámara v3 HSEmotion/AffectNet')
    print('=' * 55)
    print()

    def mi_callback(emocion, confianza):
        emoji = EMOCIONES_EMOJI.get(emocion, '😶')
        print(f'  → {emoji} {emocion} ({confianza:.0%})')

    cam = CamaraFER(camara_index=1, callback=mi_callback)
    cam.iniciar()

    print('Detectando 40 segundos — prueba expresiones:')
    print('  😊 Sonrisa grande   → juguetón')
    print('  😢 Cara triste      → frustrado')
    print('  😠 Cara de enojo    → frustrado')
    print('  😱 Cara de susto    → ansioso')
    print('  😐 Cara neutral     → tranquilo')
    print()

    for i in range(120):
        time.sleep(1)
        e = cam.emocion_actual
        print(f'  [{i+1:2d}s] {EMOCIONES_EMOJI.get(e,"😶")} {e} ({cam.confianza_actual:.0%})')

    cam.detener()
    print('\nTest finalizado.')
