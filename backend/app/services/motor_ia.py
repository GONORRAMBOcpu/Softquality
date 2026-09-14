# app/services/motor_ia.py
import os
import json
from google import genai
from google.genai import types

class MotorIAService:
    def __init__(self):
        # 1. Cargamos la API Key desde el .env
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("La API Key de Gemini no está configurada en el archivo .env")
        
        # 2. Inicializamos el NUEVO cliente oficial
        self.client = genai.Client(api_key=self.api_key)
        
        # 3. Nomenclatura del modelo estable y gratuito
        self.model_name = 'gemini-3.6-flash'

    def generar_recomendaciones(self, datos_metricas: list) -> dict:
        """
        Recibe los resultados estáticos de PostgreSQL y le pide a la IA que los interprete.
        """
        prompt = f"""
        Eres un motor experto en calidad de software analizando un proyecto bajo el estándar ISO/IEC 25010.
        REGLA ESTRICTA: Tu función es INTERPRETAR los resultados calculados, no inventar métricas nuevas.
        
        Aquí están los resultados matemáticos del código fuente:
        {json.dumps(datos_metricas, indent=2)}
        
        Genera un informe con recomendaciones de mejora continua.
        Debes responder con un objeto JSON con esta estructura exacta:
        {{
            "resumen_calidad": "Breve interpretación de los números en un párrafo",
            "puntos_fuertes": ["punto 1", "punto 2"],
            "recomendaciones_mejora": ["sugerencia técnica 1", "sugerencia técnica 2"]
        }}
        """
        
        try:
            # 4. Generación de contenido forzando el formato JSON estructural
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2  # Mantiene las respuestas enfocadas y analíticas
                )
            )
            
            # Convertimos la respuesta cruda directamente a un diccionario de Python
            return json.loads(response.text.strip())
            
        except Exception as e:
            print(f"Error procesando la IA con google-genai: {e}")
            return {"error": "No se pudo interpretar el análisis con IA"}