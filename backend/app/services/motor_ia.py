# app/services/motor_ia.py
import os
import json
import time
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Recargamos las variables del archivo .env
load_dotenv(override=True)

CATALOGO_PRACTICAS_CMMI = {
    "reqm": {
        "area": "Gestión de Requisitos (REQM)",
        "recomendacion": "documentar, revisar y aprobar formalmente los requisitos antes de codificar (ej. historias de usuario o criterios de aceptación)",
    },
    "pp": {
        "area": "Planificación del Proyecto (PP)",
        "recomendacion": "definir roles claros, estimar el esfuerzo de las tareas y establecer un cronograma de entregas en tableros como Trello o Jira",
    },
    "pmc": {
        "area": "Monitorización y Control del Proyecto (PMC)",
        "recomendacion": "realizar seguimientos periódicos (dailies o retrospectivas) para detectar bloqueos y ajustar desviaciones a tiempo",
    },
    "cm": {
        "area": "Gestión de la Configuración (CM)",
        "recomendacion": "implementar un flujo de ramas estructurado en Git (feature branches / pull requests) para proteger la rama principal",
    },
    "ver": {
        "area": "Verificación y Validación (VER/VAL)",
        "recomendacion": "ejecutar pruebas automatizadas y revisiones de código entre pares (Code Reviews) antes de fusionar cambios",
    },
}


class MotorIAService:
    def __init__(self):
        raw_key = os.getenv("GEMINI_API_KEY", "")
        self.api_key = raw_key.strip().strip('"').strip("'")

        if not self.api_key:
            raise ValueError("La API Key de Gemini no está configurada en el archivo .env")

        self.client = genai.Client(api_key=self.api_key)
        # Esquema de reintentos para proteger la cuota gratuita ante picos 503
        self.plan_intentos = [
            ("gemini-3.6-flash", 2),
            ("gemini-3.8-flash", 2),
            ("gemini-3.6-flash", 0),
        ]

    def _formatear_resumen_cmmi(self, evaluacion_cmmi: Optional[dict]) -> dict:
        if not evaluacion_cmmi or not isinstance(evaluacion_cmmi, dict):
            return {"tiene_cmmi": False}

        respuestas = evaluacion_cmmi.get("respuestas_checklist") or {}
        nivel = evaluacion_cmmi.get("nivel_madurez_referencial", "Calculado en diagnóstico")

        cumplidas = []
        pendientes = []

        for codigo, info in CATALOGO_PRACTICAS_CMMI.items():
            if codigo in respuestas:
                if respuestas[codigo] is True:
                    cumplidas.append(info["area"])
                else:
                    pendientes.append(f"{info['area']}: se sugiere {info['recomendacion']}")

        return {
            "tiene_cmmi": True,
            "nivel": nivel,
            "cumplidas": cumplidas,
            "pendientes": pendientes,
        }

    def _interpretar_localmente_por_respaldo(
        self, metricas_db: list, evaluacion_cmmi: Optional[dict] = None
    ) -> dict:
        """
        Respaldo amigable y determinístico: explica exactamente por qué se obtuvo cada puntaje
        (incluyendo archivo, línea y archivos faltantes) cuando la API gratuita está ocupada.
        """
        explicaciones = []
        todas_en_100 = True

        if isinstance(metricas_db, list) and len(metricas_db) > 0:
            for item in metricas_db:
                if isinstance(item, dict):
                    nombre = (
                        item.get("nombre_metrica")
                        or item.get("caracteristica")
                        or "Característica"
                    )
                    valor = (
                        item.get("valor")
                        if "valor" in item
                        else item.get("valor_cuantitativo", 0)
                    )
                    evidencia = (
                        item.get("unidad")
                        or item.get("descripcion")
                        or item.get("evidencia")
                        or ""
                    )

                    try:
                        if float(valor) < 100.0:
                            todas_en_100 = False
                    except Exception:
                        pass

                    if evidencia:
                        explicaciones.append(f"• {nombre} ({valor}/100): {evidencia}")
                    else:
                        explicaciones.append(f"• {nombre}: {valor}/100")

        if todas_en_100 and explicaciones:
            cierre_iso = (
                "🎉 ¡Felicitaciones! Has corregido todas las observaciones y tu proyecto alcanzó el 100/100 "
                "en las 4 características de calidad ISO/IEC 25010."
            )
        else:
            cierre_iso = (
                "💡 ¿Cómo subir al 100% en tu próxima versión?: Corrige exactamente los archivos y líneas "
                "indicados arriba (y agrega 'requirements.txt' o 'coverage.xml' si aparecen como faltantes) "
                "y vuelve a subir el archivo .zip."
            )

        analisis_iso = (
            "Resumen amigable del porqué de tu puntuación:\n"
            + "\n".join(explicaciones)
            + f"\n\n{cierre_iso}"
        )

        resumen_cmmi = self._formatear_resumen_cmmi(evaluacion_cmmi)
        if resumen_cmmi["tiene_cmmi"]:
            if resumen_cmmi["pendientes"]:
                detalle_pendientes = "; ".join(resumen_cmmi["pendientes"])
                analisis_cmmi = (
                    f"Nivel alcanzado: {resumen_cmmi['nivel']}. "
                    f"Para mejorar el proceso del equipo, enfócate en las áreas donde respondiste 'No': {detalle_pendientes}."
                )
            else:
                analisis_cmmi = (
                    f"Nivel alcanzado: {resumen_cmmi['nivel']}. "
                    "¡Excelente! El equipo cumple con las 5 áreas de proceso evaluadas (REQM, PP, PMC, CM y VER/VAL)."
                )
        else:
            analisis_cmmi = None

        mensaje_general = f"{analisis_iso}\n\n{analisis_cmmi}" if analisis_cmmi else analisis_iso

        return {
            "analisis_iso": analisis_iso,
            "analisis_cmmi": analisis_cmmi,
            "mensaje_general": mensaje_general,
        }

    def generar_recomendaciones(
        self, metricas_db: list, evaluacion_cmmi: Optional[dict] = None
    ) -> dict:
        resumen_cmmi = self._formatear_resumen_cmmi(evaluacion_cmmi)

        if resumen_cmmi["tiene_cmmi"]:
            bloque_cmmi = f"""
            El equipo completó la autoevaluación CMMI obteniendo: "{resumen_cmmi['nivel']}".
            - Áreas cumplidas (Sí): {json.dumps(resumen_cmmi['cumplidas'], ensure_ascii=False)}
            - Áreas NO cumplidas (No) y acciones sugeridas: {json.dumps(resumen_cmmi['pendientes'], ensure_ascii=False)}
            """
            instruccion_cmmi = "Redacta en 'analisis_cmmi' recomendaciones amigables para las áreas CMMI donde el equipo respondió 'No'."
        else:
            bloque_cmmi = "El equipo aún no ha respondido el cuestionario de procesos CMMI."
            instruccion_cmmi = "Coloca null en 'analisis_cmmi' porque aún no hay evaluación CMMI registrada."

        prompt = f"""
        Eres un tutor amigable de calidad de software en la plataforma académica SoftQuality (ISO/IEC 25010 y CMMI).
        
        1. Resultados exactos calculados por nuestro analizador de código:
        {json.dumps(metricas_db, ensure_ascii=False)}

        2. Evaluación de procesos del equipo (CMMI):
        {bloque_cmmi}

        INSTRUCCIONES OBLIGATORIAS PARA 'analisis_iso':
        - Explica en palabras sencillas y muy amigables para el estudiante el PORQUÉ obtuvo esa puntuación en cada una de las 4 características (Mantenibilidad, Seguridad, Flexibilidad y Fiabilidad).
        - Si una característica tiene menos de 100 puntos, DEBES mencionar explícitamente cuántos puntos perdió, el NOMBRE DEL ARCHIVO y el NÚMERO DE LÍNEA EXACTO que viene en la evidencia (por ejemplo: "En Seguridad sacaste 80/100 porque en 'pagos.py' (línea 8) dejaste una API Key pública (-10 pts) y te faltó incluir el archivo 'requirements.txt' (-10 pts)").
        - Si falta 'coverage.xml' o 'requirements.txt', explícalo claramente indicando cuántos puntos restó.
        - Al final de 'analisis_iso', dile al usuario que si corrige esas líneas exactas y agrega los archivos faltantes en la siguiente versión, su puntuación subirá automáticamente al 100%. Si ya tiene 100/100 en todas, felicítalo.
        - NO inventes ni recalcules notas numéricas.
        - {instruccion_cmmi}

        Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
        {{
            "analisis_iso": "Explicación amigable característica por característica justificando el puntaje con archivo, línea exacta y cómo llegar al 100%.",
            "analisis_cmmi": "Recomendaciones amigables del proceso CMMI (o null si no aplica).",
            "mensaje_general": "Resumen integrado de ambos análisis."
        }}
        """

        total_intentos = len(self.plan_intentos)

        for idx, (modelo_actual, segundos_espera) in enumerate(self.plan_intentos, start=1):
            try:
                response = self.client.models.generate_content(
                    model=modelo_actual,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True
                        ),
                    ),
                )

                texto_limpio = response.text.strip()
                if texto_limpio.startswith("```"):
                    texto_limpio = texto_limpio.strip("`").removeprefix("json").strip()

                print(
                    f"✅ Justificación detallada generada con '{modelo_actual}' (intento {idx}/{total_intentos})"
                )
                return json.loads(texto_limpio)

            except Exception as e:
                if segundos_espera > 0:
                    print(
                        f"⏳ '{modelo_actual}' ocupado. Esperando {segundos_espera}s antes del intento {idx + 1}/{total_intentos}..."
                    )
                    time.sleep(segundos_espera)
                    continue

                print(
                    f"⚠️ API gratuita ocupada tras {total_intentos} intentos. Usando explicación amigable local con archivo y línea exacta."
                )
                return self._interpretar_localmente_por_respaldo(
                    metricas_db, evaluacion_cmmi
                )