# app/services/motor_analisis.py
import os
import re
import ast
import xml.etree.ElementTree as ET
from typing import List, Optional, Tuple
from radon.raw import analyze
from radon.complexity import cc_visit
from radon.metrics import mi_visit
from app.schemas.metrica import MetricaCalculada

DIRECTORIOS_IGNORADOS = {
    "__MACOSX",
    ".git",
    ".venv",
    "venv",
    "env",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
}


class MotorAnalisisPython:
    def __init__(self, directorio_proyecto: str):
        self.directorio_proyecto = directorio_proyecto

    def _obtener_archivos_python(self) -> List[str]:
        """Recorre el directorio omitiendo carpetas de entorno y extrae los archivos .py"""
        archivos_py = []
        for raiz, dirs, archivos in os.walk(self.directorio_proyecto):
            dirs[:] = [d for d in dirs if d not in DIRECTORIOS_IGNORADOS and not d.startswith(".")]
            for archivo in archivos:
                if archivo.endswith(".py") and not archivo.startswith("._"):
                    archivos_py.append(os.path.join(raiz, archivo))
        return archivos_py

    def _buscar_archivo_especifico(self, nombre_objetivo: str) -> Optional[str]:
        """Busca un archivo como requirements.txt o coverage.xml en cualquier subcarpeta del .zip"""
        nombre_lower = nombre_objetivo.lower()
        for raiz, dirs, archivos in os.walk(self.directorio_proyecto):
            dirs[:] = [d for d in dirs if d not in DIRECTORIOS_IGNORADOS and not d.startswith(".")]
            for archivo in archivos:
                if archivo.lower() == nombre_lower and not archivo.startswith("._"):
                    return os.path.join(raiz, archivo)
        return None

    def _evaluar_requirements(self, ruta_req: Optional[str]) -> Tuple[float, str]:
        """
        Evalúa la seguridad y trazabilidad de las dependencias en requirements.txt.
        Retorna (penalizacion, resumen_evidencia).
        """
        if not ruta_req or not os.path.exists(ruta_req):
            return 10.0, "sin requirements.txt (-10 pts)"

        try:
            with open(ruta_req, "r", encoding="utf-8", errors="ignore") as f:
                lineas = [
                    lin.strip()
                    for lin in f.readlines()
                    if lin.strip() and not lin.strip().startswith("#")
                ]

            if not lineas:
                return 5.0, "requirements.txt vacío (-5 pts)"

            fijadas = sum(1 for lin in lineas if "==" in lin or "~=" in lin or ">=" in lin)
            sin_fijar = len(lineas) - fijadas
            penalizacion = min(15.0, sin_fijar * 3.0)
            return penalizacion, f"requirements.txt ({fijadas}/{len(lineas)} versiones fijadas)"
        except Exception:
            return 5.0, "requirements.txt no legible"

    def _leer_cobertura_xml(self, ruta_cov: Optional[str]) -> Optional[float]:
        """
        Extrae el porcentaje de cobertura (0 a 100) desde coverage.xml si existe en el .zip.
        """
        if not ruta_cov or not os.path.exists(ruta_cov):
            return None

        try:
            tree = ET.parse(ruta_cov)
            root = tree.getroot()
            line_rate = root.attrib.get("line-rate")
            if line_rate is not None:
                return round(max(0.0, min(100.0, float(line_rate) * 100.0)), 2)

            lines_valid = float(root.attrib.get("lines-valid", 0))
            lines_covered = float(root.attrib.get("lines-covered", 0))
            if lines_valid > 0:
                return round(max(0.0, min(100.0, (lines_covered / lines_valid) * 100.0)), 2)
        except Exception:
            return None

        return None

    def analizar_proyecto(self) -> List[MetricaCalculada]:
        archivos = self._obtener_archivos_python()
        if not archivos:
            return []

        # Contadores para Mantenibilidad
        total_loc = 0
        total_complejidad = 0
        bloques_analizados = 0
        valores_mi = []
        archivos_validos = 0
        errores_sintaxis = 0

        # Contadores para Seguridad
        hallazgos_eval_exec = 0
        hallazgos_secretos = 0
        hallazgos_sql = 0
        hallazgos_shell = 0

        # Contadores para Flexibilidad
        total_imports = 0
        total_clases = 0
        max_herencia = 0
        funciones_exceso_params = 0
        max_params_funcion = 0

        # Contadores para Fiabilidad
        total_funciones = 0
        total_try_except = 0
        total_except_genericos = 0
        total_tests_o_asserts = 0

        patron_secreto = re.compile(
            r"(password|passwd|pwd|secret|api_key|token|private_key)", re.IGNORECASE
        )
        patron_sql = re.compile(
            r"(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM)",
            re.IGNORECASE,
        )

        for ruta in archivos:
            try:
                with open(ruta, "r", encoding="utf-8", errors="ignore") as f:
                    codigo = f.read()

                if not codigo.strip():
                    continue

                # 1. Métricas Radon (LOC, Complejidad Ciclomática e Índice de Mantenibilidad)
                raw_metrics = analyze(codigo)
                total_loc += raw_metrics.loc

                bloques_cc = cc_visit(codigo)
                for bloque in bloques_cc:
                    total_complejidad += bloque.complexity
                    bloques_analizados += 1

                try:
                    mi_score = mi_visit(codigo, multi=True)
                    valores_mi.append(float(mi_score))
                except Exception:
                    pass

                # 2. Análisis del Árbol de Sintaxis Abstracta (AST)
                arbol = ast.parse(codigo)
                archivos_validos += 1

                for nodo in ast.walk(arbol):
                    # --- FLEXIBILIDAD: Acoplamiento por importaciones ---
                    if isinstance(nodo, (ast.Import, ast.ImportFrom)):
                        total_imports += 1

                    # --- FLEXIBILIDAD: Clases y profundidad de herencia ---
                    elif isinstance(nodo, ast.ClassDef):
                        total_clases += 1
                        num_bases = len(nodo.bases)
                        if num_bases > max_herencia:
                            max_herencia = num_bases

                    # --- FLEXIBILIDAD Y FIABILIDAD: Funciones y pruebas ---
                    elif isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        total_funciones += 1
                        num_args = len(nodo.args.args)
                        if num_args > max_params_funcion:
                            max_params_funcion = num_args
                        if num_args > 5:
                            funciones_exceso_params += 1
                        if nodo.name.lower().startswith("test_"):
                            total_tests_o_asserts += 1

                    # --- FIABILIDAD: Bloques try/except y asserts ---
                    elif isinstance(nodo, ast.Try):
                        total_try_except += 1
                        for handler in nodo.handlers:
                            if handler.type is None:
                                total_except_genericos += 1

                    elif isinstance(nodo, ast.Assert):
                        total_tests_o_asserts += 1

                    # --- SEGURIDAD: Llamadas peligrosas (eval, exec, shell=True, os.system) ---
                    elif isinstance(nodo, ast.Call):
                        nombre_func = ""
                        if isinstance(nodo.func, ast.Name):
                            nombre_func = nodo.func.id
                        elif isinstance(nodo.func, ast.Attribute):
                            nombre_func = nodo.func.attr

                        if nombre_func in {"eval", "exec", "compile"}:
                            hallazgos_eval_exec += 1
                        elif nombre_func == "system":
                            hallazgos_shell += 1
                        elif nombre_func in {"Popen", "run", "call", "check_output"}:
                            for kw in nodo.keywords:
                                if (
                                    kw.arg == "shell"
                                    and isinstance(kw.value, ast.Constant)
                                    and kw.value.value is True
                                ):
                                    hallazgos_shell += 1

                    # --- SEGURIDAD: Contraseñas o llaves quemadas en asignaciones ---
                    elif isinstance(nodo, ast.Assign):
                        if isinstance(nodo.value, ast.Constant) and isinstance(nodo.value.value, str):
                            valor_str = nodo.value.value.strip()
                            if len(valor_str) >= 4 and not valor_str.startswith(("$", "{", "http")):
                                for target in nodo.targets:
                                    if isinstance(target, ast.Name) and patron_secreto.search(target.id):
                                        hallazgos_secretos += 1

                    # --- SEGURIDAD: Consultas SQL concatenadas o en f-strings ---
                    elif isinstance(nodo, ast.JoinedStr):
                        texto_fstring = "".join(
                            c.value for c in nodo.values if isinstance(c, ast.Constant) and isinstance(c.value, str)
                        )
                        if patron_sql.search(texto_fstring):
                            hallazgos_sql += 1

            except SyntaxError:
                errores_sintaxis += 1
                print(f"Error de sintaxis detectado. Archivo penalizado: {ruta}")
            except Exception as e:
                print(f"Error procesando {ruta}: {str(e)}")

        total_archivos = max(1, archivos_validos + errores_sintaxis)

        # =====================================================================
        # 1. CÁLCULO NORMALIZADO: MANTENIBILIDAD (0 a 100)
        # =====================================================================
        promedio_cc = (total_complejidad / bloques_analizados) if bloques_analizados > 0 else 1.0
        promedio_mi = (sum(valores_mi) / len(valores_mi)) if valores_mi else 75.0

        # Puntaje por complejidad ciclomática (óptimo <= 5, penaliza progresivamente si sube)
        puntaje_cc = max(0.0, 100.0 - max(0.0, promedio_cc - 2.0) * 7.5)
        puntaje_mantenibilidad = round(
            min(100.0, max(0.0, (promedio_mi * 0.60) + (puntaje_cc * 0.40))), 2
        )
        evidencia_mantenibilidad = (
            f"LOC: {total_loc} en {total_archivos} archivo(s) | "
            f"Complejidad prom: {promedio_cc:.2f} | Índice MI: {promedio_mi:.1f}/100"
        )

        # =====================================================================
        # 2. CÁLCULO NORMALIZADO: SEGURIDAD (0 a 100)
        # =====================================================================
        ruta_req = self._buscar_archivo_especifico("requirements.txt")
        penalizacion_req, detalle_req = self._evaluar_requirements(ruta_req)

        total_vulnerabilidades_codigo = (
            hallazgos_eval_exec + hallazgos_secretos + hallazgos_sql + hallazgos_shell
        )
        penalizacion_codigo = (
            (hallazgos_eval_exec * 15.0)
            + (hallazgos_shell * 15.0)
            + (hallazgos_sql * 12.0)
            + (hallazgos_secretos * 10.0)
            + (total_except_genericos * 3.0)
        )
        puntaje_seguridad = round(
            min(100.0, max(0.0, 100.0 - penalizacion_codigo - penalizacion_req)), 2
        )
        evidencia_seguridad = (
            f"Alertas SAST en código: {total_vulnerabilidades_codigo} "
            f"(eval/exec: {hallazgos_eval_exec}, secretos: {hallazgos_secretos}, SQLi: {hallazgos_sql}, shell: {hallazgos_shell}) | "
            f"{detalle_req}"
        )

        # =====================================================================
        # 3. CÁLCULO NORMALIZADO: FLEXIBILIDAD (0 a 100)
        # =====================================================================
        promedio_imports = total_imports / total_archivos
        penalizacion_acoplamiento = max(0.0, (promedio_imports - 6.0) * 4.5)
        penalizacion_herencia = max(0.0, (max_herencia - 2) * 8.0)
        penalizacion_params = min(25.0, funciones_exceso_params * 5.0)

        puntaje_flexibilidad = round(
            min(
                100.0,
                max(
                    0.0,
                    100.0
                    - penalizacion_acoplamiento
                    - penalizacion_herencia
                    - penalizacion_params,
                ),
            ),
            2,
        )
        evidencia_flexibilidad = (
            f"Acoplamiento: {promedio_imports:.1f} imports/archivo | "
            f"Clases: {total_clases} (herencia máx: {max_herencia}) | "
            f"Funciones >5 params: {funciones_exceso_params}"
        )

        # =====================================================================
        # 4. CÁLCULO NORMALIZADO: FIABILIDAD (0 a 100)
        # =====================================================================
        ruta_cov = self._buscar_archivo_especifico("coverage.xml")
        cobertura_xml = self._leer_cobertura_xml(ruta_cov)

        ratio_excepciones = (
            min(1.0, total_try_except / max(1.0, total_funciones * 0.35))
            if total_funciones > 0
            else (1.0 if total_try_except > 0 else 0.3)
        )
        puntaje_defensivo = ratio_excepciones * 100.0
        penalizacion_sintaxis = errores_sintaxis * 20.0

        if cobertura_xml is not None:
            puntaje_fiabilidad = round(
                min(
                    100.0,
                    max(
                        0.0,
                        (cobertura_xml * 0.70)
                        + (puntaje_defensivo * 0.30)
                        - penalizacion_sintaxis,
                    ),
                ),
                2,
            )
            evidencia_fiabilidad = (
                f"Cobertura coverage.xml: {cobertura_xml:.1f}% | "
                f"Bloques try/except: {total_try_except} | Pruebas/asserts: {total_tests_o_asserts}"
            )
        else:
            bono_tests_codigo = min(25.0, total_tests_o_asserts * 5.0)
            base_sin_xml = 45.0 + (ratio_excepciones * 25.0) + bono_tests_codigo
            puntaje_fiabilidad = round(
                min(85.0, max(0.0, base_sin_xml - penalizacion_sintaxis)), 2
            )
            evidencia_fiabilidad = (
                f"Sin coverage.xml (evaluado por AST) | "
                f"Bloques try/except: {total_try_except} en {total_funciones} funciones | "
                f"Pruebas/asserts en código: {total_tests_o_asserts}"
            )

        return [
            MetricaCalculada(
                nombre_metrica="Mantenibilidad",
                valor=puntaje_mantenibilidad,
                unidad=evidencia_mantenibilidad,
                caracteristica_iso_sugerida="Mantenibilidad",
                descripcion=evidencia_mantenibilidad,
            ),
            MetricaCalculada(
                nombre_metrica="Seguridad",
                valor=puntaje_seguridad,
                unidad=evidencia_seguridad,
                caracteristica_iso_sugerida="Seguridad",
                descripcion=evidencia_seguridad,
            ),
            MetricaCalculada(
                nombre_metrica="Flexibilidad",
                valor=puntaje_flexibilidad,
                unidad=evidencia_flexibilidad,
                caracteristica_iso_sugerida="Flexibilidad",
                descripcion=evidencia_flexibilidad,
            ),
            MetricaCalculada(
                nombre_metrica="Fiabilidad",
                valor=puntaje_fiabilidad,
                unidad=evidencia_fiabilidad,
                caracteristica_iso_sugerida="Fiabilidad",
                descripcion=evidencia_fiabilidad,
            ),
        ]