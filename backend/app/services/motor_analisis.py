# app/services/motor_analisis.py
import os
from radon.raw import analyze
from radon.complexity import cc_visit
from typing import List
from app.schemas.metrica import MetricaCalculada

class MotorAnalisisPython:
    def __init__(self, directorio_proyecto: str):
        self.directorio_proyecto = directorio_proyecto

    def _obtener_archivos_python(self) -> List[str]:
        """Recorre el directorio y extrae las rutas de todos los archivos .py"""
        archivos_py = []
        for raiz, _, archivos in os.walk(self.directorio_proyecto):
            for archivo in archivos:
                if archivo.endswith(".py"):
                    archivos_py.append(os.path.join(raiz, archivo))
        return archivos_py

    def analizar_proyecto(self) -> List[MetricaCalculada]:
        archivos = self._obtener_archivos_python()
        
        if not archivos:
            return []

        total_loc = 0
        total_complejidad = 0
        bloques_analizados = 0

        for ruta in archivos:
            try:
                with open(ruta, 'r', encoding='utf-8') as f:
                    codigo = f.read()
                
                # 1. Análisis de tamaño (Líneas de código)
                raw_metrics = analyze(codigo)
                total_loc += raw_metrics.loc

                # 2. Análisis de complejidad ciclomática
                bloques_cc = cc_visit(codigo)
                for bloque in bloques_cc:
                    total_complejidad += bloque.complexity
                    bloques_analizados += 1

            except SyntaxError:
                print(f"Error de sintaxis detectado. Archivo omitido: {ruta}")
            except Exception as e:
                print(f"Error procesando {ruta}: {str(e)}")

        metricas = []
        
        # Métrica de Tamaño
        metricas.append(MetricaCalculada(
            nombre_metrica="Líneas de Código Totales (LOC)",
            valor=float(total_loc),
            unidad="líneas",
            caracteristica_iso_sugerida="Mantenibilidad (Analizabilidad)"
        ))

        # Métrica de Complejidad
        promedio_cc = (total_complejidad / bloques_analizados) if bloques_analizados > 0 else 0
        metricas.append(MetricaCalculada(
            nombre_metrica="Complejidad Ciclomática Promedio",
            valor=round(promedio_cc, 2),
            unidad="puntos/bloque",
            caracteristica_iso_sugerida="Mantenibilidad (Modificabilidad)"
        ))

        return metricas