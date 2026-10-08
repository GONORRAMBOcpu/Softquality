# app/services/motor_ia.py
import os
import json
import time
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Recargamos las variables del archivo .env (sin pisar las inyectadas por Docker)
load_dotenv(override=False)

# Catálogo de Áreas de Proceso CMMI evaluadas en el formulario académico
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
        # Esquema de reintentos con espera progresiva para superar errores 503 UNAVAILABLE
        self.plan_intentos = [
            ("gemini-3.6-flash", 2),
            ("gemini-3.6-flash", 4),
            ("gemini-3.8-flash", 0),
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
        resumen_partes = []
        recomendaciones_focalizadas = []

        if isinstance(metricas_db, list):
            for item in metricas_db:
                if isinstance(item, dict):
                    nombre = (
                        item.get("caracteristica_iso")
                        or item.get("nombre_metrica")
                        or item.get("caracteristica")
                        or "Métrica ISO 25010"
                    )
                    valor = item.get("puntaje_0_a_100")
                    if valor is None:
                        valor = item.get("valor") if "valor" in item else item.get("valor_cuantitativo", 0)
                    evidencia = item.get("evidencia_tecnica") or item.get("unidad") or ""

                    if evidencia:
                        resumen_partes.append(f"{nombre}: {valor}/100 ({evidencia})")
                    else:
                        resumen_partes.append(f"{nombre}: {valor}/100")

                    if isinstance(valor, (int, float)) and valor < 80:
                        if "mantenibilidad" in str(nombre).lower():
                            recomendaciones_focalizadas.append(
                                "reducir la complejidad ciclomática dividiendo funciones extensas en bloques más pequeños"
                            )
                        elif "seguridad" in str(nombre).lower():
                            recomendaciones_focalizadas.append(
                                "fijar versiones exactas (==) en requirements.txt y evitar patrones riesgosos o secretos en código"
                            )
                        elif "flexibilidad" in str(nombre).lower():
                            recomendaciones_focalizadas.append(
                                "disminuir el acoplamiento de importaciones entre módulos y simplificar parámetros de funciones"
                            )
                        elif "fiabilidad" in str(nombre).lower():
                            recomendaciones_focalizadas.append(
                                "incluir el reporte coverage.xml con pruebas unitarias y ampliar el manejo de excepciones try/except"
                            )

        detalle_medido = " | ".join(resumen_partes) if resumen_partes else "Métricas procesadas"
        if recomendaciones_focalizadas:
            sugerencia_iso = "Para elevar los puntajes hacia 100/100 se recomienda: " + "; ".join(recomendaciones_focalizadas) + "."
        else:
            sugerencia_iso = "Las 4 características evaluadas presentan un nivel sobresaliente (≥ 80/100); se sugiere mantener las pruebas continuas y la modularidad actual."

        analisis_iso = f"Diagnóstico técnico ISO/IEC 25010 (escala 0 a 100): {detalle_medido}. {sugerencia_iso}"

        resumen_cmmi = self._formatear_resumen_cmmi(evaluacion_cmmi)
        if resumen_cmmi["tiene_cmmi"]:
            if resumen_cmmi["pendientes"]:
                detalle_pendientes = "; ".join(resumen_cmmi["pendientes"])
                analisis_cmmi = (
                    f"Nivel alcanzado: {resumen_cmmi['nivel']}. "
                    f"Para elevar la madurez del proceso del equipo, se deben fortalecer las áreas donde se respondió 'No': {detalle_pendientes}."
                )
            else:
                analisis_cmmi = (
                    f"Nivel alcanzado: {resumen_cmmi['nivel']}. "
                    "El equipo cumple con las 5 áreas de proceso evaluadas (REQM, PP, PMC, CM y VER/VAL). "
                    "Se recomienda mantener la trazabilidad documental y la automatización continua en próximas versiones."
                )
        else:
            analisis_cmmi = None

        mensaje_general = f"{analisis_iso} {analisis_cmmi}" if analisis_cmmi else analisis_iso

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
            El equipo completó la autoevaluación de madurez de procesos CMMI obteniendo: "{resumen_cmmi['nivel']}".
            - Áreas de proceso cumplidas (Sí): {json.dumps(resumen_cmmi['cumplidas'], ensure_ascii=False)}
            - Áreas de proceso NO cumplidas (No) y acciones sugeridas: {json.dumps(resumen_cmmi['pendientes'], ensure_ascii=False)}
            """
            instruccion_cmmi = "Redacta en 'analisis_cmmi' recomendaciones prácticas y claras enfocadas específicamente en las áreas de proceso CMMI donde el equipo respondió 'No'."
        else:
            bloque_cmmi = "El equipo aún no ha respondido el cuestionario de procesos CMMI."
            instruccion_cmmi = "Coloca null en 'analisis_cmmi' porque aún no hay evaluación CMMI registrada."

        prompt = f"""
        Eres un auditor académico experto en calidad de software bajo la norma ISO/IEC 25010 y el modelo CMMI en la plataforma SoftQuality.
        
        1. Puntajes normalizados (escala 0 a 100) y evidencia técnica calculados de forma determinística por el motor estático para las 4 características de la norma ISO/IEC 25010 (Mantenibilidad, Seguridad, Flexibilidad y Fiabilidad):
        {json.dumps(metricas_db, ensure_ascii=False)}

        2. Evaluación de procesos del equipo (CMMI):
        {bloque_cmmi}

        REGLAS ESTRICTAS DE NEGOCIO:
        - No inventes ni recalcules métricas numéricas. Interpreta únicamente los puntajes (0 a 100) y la evidencia técnica recibida para Mantenibilidad, Seguridad, Flexibilidad y Fiabilidad.
        - No otorgues certificaciones oficiales; es un diagnóstico académico de mejora continua.
        - Separa claramente la evaluación técnica del producto (ISO/IEC 25010) de la evaluación de procesos (CMMI).
        - {instruccion_cmmi}

        Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
        {{
            "analisis_iso": "Párrafo claro interpretando los 4 puntajes (0 a 100) y hallazgos técnicos de Mantenibilidad, Seguridad, Flexibilidad y Fiabilidad según ISO/IEC 25010.",
            "analisis_cmmi": "Párrafo claro con las recomendaciones de mejora de procesos según el checklist CMMI (o null si no aplica).",
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
                        temperature=0.3,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                    ),
                )

                texto_limpio = response.text.strip()
                if texto_limpio.startswith("```"):
                    texto_limpio = texto_limpio.strip("`").removeprefix("json").strip()

                print(
                    f"✅ Recomendaciones separadas (ISO 25010 4 características + CMMI) generadas con '{modelo_actual}' (intento {idx}/{total_intentos})"
                )
                return json.loads(texto_limpio)

            except Exception:
                if segundos_espera > 0:
                    print(
                        f"⏳ '{modelo_actual}' ocupado (503). Esperando {segundos_espera}s antes del intento {idx + 1}/{total_intentos}..."
                    )
                    time.sleep(segundos_espera)
                    continue

                print(
                    f"⚠️ Servidores de Google con alta demanda tras {total_intentos} intentos. Usando motor de auditoría local."
                )
                return self._interpretar_localmente_por_respaldo(metricas_db, evaluacion_cmmi)