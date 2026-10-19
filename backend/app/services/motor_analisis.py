# app/services/motor_analisis.py
import os
import re
import ast
import xml.etree.ElementTree as ET
from typing import List, Optional, Tuple
from radon.raw import analyze
from radon.complexity import cc_visit
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
            dirs[:] = [
                d for d in dirs if d not in DIRECTORIOS_IGNORADOS and not d.startswith(".")
            ]
            for archivo in archivos:
                if archivo.endswith(".py") and not archivo.startswith("._"):
                    archivos_py.append(os.path.join(raiz, archivo))
        return sorted(archivos_py)

    def _buscar_archivo_especifico(self, nombre_objetivo: str) -> Optional[str]:
        """Busca un archivo como requirements.txt o coverage.xml en cualquier subcarpeta del .zip"""
        nombre_lower = nombre_objetivo.lower()
        for raiz, dirs, archivos in os.walk(self.directorio_proyecto):
            dirs[:] = [
                d for d in dirs if d not in DIRECTORIOS_IGNORADOS and not d.startswith(".")
            ]
            for archivo in archivos:
                if archivo.lower() == nombre_lower and not archivo.startswith("._"):
                    return os.path.join(raiz, archivo)
        return None

    def _nombre_relativo(self, ruta_completa: str) -> str:
        """Devuelve el nombre limpio del archivo dentro del .zip para mostrarlo al usuario"""
        try:
            rel = os.path.relpath(ruta_completa, self.directorio_proyecto)
            return rel.replace("\\", "/")
        except Exception:
            return os.path.basename(ruta_completa)

    def _evaluar_requirements(self, ruta_req: Optional[str]) -> Tuple[float, List[str]]:
        """
        Evalúa requirements.txt e indica línea por línea si alguna librería no tiene versión fija.
        """
        motivos = []
        if not ruta_req or not os.path.exists(ruta_req):
            motivos.append(
                "[-10 pts] Falta el archivo 'requirements.txt' que solicita el programa para verificar las librerías del proyecto"
            )
            return 10.0, motivos

        try:
            with open(ruta_req, "r", encoding="utf-8", errors="ignore") as f:
                lineas_crudas = f.readlines()

            lineas_validas = 0
            penalizacion = 0.0
            nombre_req = self._nombre_relativo(ruta_req)

            for num_linea, lin in enumerate(lineas_crudas, start=1):
                limpia = lin.strip()
                if not limpia or limpia.startswith("#"):
                    continue
                lineas_validas += 1
                if not any(op in limpia for op in ("==", ">=", "~=", "<=")):
                    penalizacion += 5.0
                    motivos.append(
                        f"[-5 pts] En '{nombre_req}' (línea {num_linea}): la librería '{limpia}' no tiene versión fija (usa '{limpia}==1.0.0')"
                    )

            if lineas_validas == 0:
                motivos.append(
                    f"[-5 pts] El archivo '{nombre_req}' está vacío (agrega las librerías usadas con su versión, ej. fastapi==0.115.0)"
                )
                return 5.0, motivos

            penalizacion = min(15.0, penalizacion)
            return penalizacion, motivos
        except Exception:
            motivos.append("[-5 pts] No se pudo leer el archivo 'requirements.txt'")
            return 5.0, motivos

    def _leer_cobertura_xml(self, ruta_cov: Optional[str]) -> Optional[float]:
        """Extrae el porcentaje de cobertura (0 a 100) desde coverage.xml si existe en el .zip."""
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

        # Listas de justificaciones detalladas (Archivo + Línea + Explicación amigable)
        motivos_mantenibilidad: List[str] = []
        motivos_seguridad: List[str] = []
        motivos_flexibilidad: List[str] = []
        motivos_fiabilidad: List[str] = []

        penalizacion_mantenibilidad = 0.0
        penalizacion_seguridad = 0.0
        penalizacion_flexibilidad = 0.0
        penalizacion_fiabilidad = 0.0

        total_loc = 0
        total_complejidad = 0
        bloques_analizados = 0
        archivos_validos = 0

        total_imports = 0
        total_clases = 0
        total_funciones = 0
        total_try_except = 0
        primera_funcion_ubicacion = None

        # Patrones para detectar secretos/API keys públicas e inyecciones SQL
        patron_nombre_secreto = re.compile(
            r"(password|passwd|pwd|secret|api_key|apikey|token|private_key|clave|credencial|access_key)",
            re.IGNORECASE,
        )
        patron_valor_apikey = re.compile(
            r"^(AIza[0-9A-Za-z\-_]{8,}|sk-[0-9A-Za-z]{8,}|ghp_[0-9A-Za-z]{8,})"
        )
        patron_sql = re.compile(
            r"(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM)",
            re.IGNORECASE,
        )

        for ruta in archivos:
            nombre_archivo = self._nombre_relativo(ruta)
            try:
                with open(ruta, "r", encoding="utf-8", errors="ignore") as f:
                    codigo = f.read()

                if not codigo.strip():
                    continue

                # 1. Revisión de Mantenibilidad con Radon (LOC y Complejidad por función)
                raw_metrics = analyze(codigo)
                total_loc += raw_metrics.loc

                if raw_metrics.loc > 300:
                    penalizacion_mantenibilidad += 10.0
                    motivos_mantenibilidad.append(
                        f"[-10 pts] En '{nombre_archivo}': el archivo es demasiado extenso ({raw_metrics.loc} líneas, máximo recomendado: 300). Sepáralo en varios módulos"
                    )

                bloques_cc = cc_visit(codigo)
                for bloque in bloques_cc:
                    total_complejidad += bloque.complexity
                    bloques_analizados += 1
                    if bloque.complexity > 10:
                        penalizacion_mantenibilidad += 15.0
                        motivos_mantenibilidad.append(
                            f"[-15 pts] En '{nombre_archivo}' (línea {bloque.lineno}): la función '{bloque.name}' es muy compleja (complejidad {bloque.complexity}, máximo recomendado: 5). Divídela en funciones más pequeñas"
                        )
                    elif bloque.complexity > 5:
                        penalizacion_mantenibilidad += 10.0
                        motivos_mantenibilidad.append(
                            f"[-10 pts] En '{nombre_archivo}' (línea {bloque.lineno}): la función '{bloque.name}' supera la complejidad recomendada (tiene {bloque.complexity}, máximo ideal: 5). Simplifica sus condicionales (if/for)"
                        )

                # 2. Análisis del Árbol Sintáctico (AST) con líneas exactas
                arbol = ast.parse(codigo)
                archivos_validos += 1

                imports_en_archivo = 0
                clases_en_archivo = 0

                for nodo in ast.walk(arbol):
                    # --- FLEXIBILIDAD: Conteo de importaciones por archivo ---
                    if isinstance(nodo, (ast.Import, ast.ImportFrom)):
                        imports_en_archivo += 1
                        total_imports += 1

                    # --- FLEXIBILIDAD: Clases y herencia ---
                    elif isinstance(nodo, ast.ClassDef):
                        total_clases += 1
                        clases_en_archivo += 1
                        num_bases = len(nodo.bases)
                        if num_bases > 2:
                            pts_her = (num_bases - 2) * 10.0
                            penalizacion_flexibilidad += pts_her
                            motivos_flexibilidad.append(
                                f"[-{pts_her:g} pts] En '{nombre_archivo}' (línea {nodo.lineno}): la clase '{nodo.name}' hereda de {num_bases} clases a la vez (máximo recomendado: 2)"
                            )

                    # --- FLEXIBILIDAD, MANTENIBILIDAD Y FIABILIDAD: Funciones ---
                    elif isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        total_funciones += 1
                        if primera_funcion_ubicacion is None:
                            primera_funcion_ubicacion = (
                                f"'{nombre_archivo}' (línea {nodo.lineno}, función '{nodo.name}')"
                            )

                        # Revisar exceso de parámetros (> 5)
                        num_args = len(nodo.args.args)
                        if num_args > 5:
                            penalizacion_flexibilidad += 10.0
                            motivos_flexibilidad.append(
                                f"[-10 pts] En '{nombre_archivo}' (línea {nodo.lineno}): mala organización en la función '{nodo.name}', recibe {num_args} parámetros (máximo recomendado: 5). Agrupa los datos en un objeto o diccionario"
                            )

                        # Revisar si la función es demasiado larga (> 50 líneas)
                        fin_linea = getattr(nodo, "end_lineno", nodo.lineno)
                        lineas_func = fin_linea - nodo.lineno + 1
                        if lineas_func > 50:
                            penalizacion_mantenibilidad += 10.0
                            motivos_mantenibilidad.append(
                                f"[-10 pts] En '{nombre_archivo}' (línea {nodo.lineno}): la función '{nodo.name}' es demasiado larga ({lineas_func} líneas, máximo recomendado: 50)"
                            )

                    # --- FIABILIDAD Y SEGURIDAD: Bloques try/except ---
                    elif isinstance(nodo, ast.Try):
                        total_try_except += 1
                        for handler in nodo.handlers:
                            if handler.type is None:
                                linea_h = getattr(handler, "lineno", nodo.lineno)
                                penalizacion_seguridad += 5.0
                                motivos_seguridad.append(
                                    f"[-5 pts] En '{nombre_archivo}' (línea {linea_h}): bloque 'except:' genérico que oculta errores. Cámbialo por 'except Exception as e:'"
                                )

                    # --- SEGURIDAD: Llamadas peligrosas (eval, exec, os.system, shell=True) ---
                    elif isinstance(nodo, ast.Call):
                        nombre_func = ""
                        if isinstance(nodo.func, ast.Name):
                            nombre_func = nodo.func.id
                        elif isinstance(nodo.func, ast.Attribute):
                            nombre_func = nodo.func.attr

                        if nombre_func in {"eval", "exec", "compile"}:
                            penalizacion_seguridad += 15.0
                            motivos_seguridad.append(
                                f"[-15 pts] En '{nombre_archivo}' (línea {nodo.lineno}): uso de la función insegura '{nombre_func}()'. Elimínala para evitar ejecución de código malicioso"
                            )
                        elif nombre_func == "system":
                            penalizacion_seguridad += 15.0
                            motivos_seguridad.append(
                                f"[-15 pts] En '{nombre_archivo}' (línea {nodo.lineno}): ejecución insegura de comando del sistema con 'os.system()'"
                            )
                        elif nombre_func in {"Popen", "run", "call", "check_output"}:
                            for kw in nodo.keywords:
                                if (
                                    kw.arg == "shell"
                                    and isinstance(kw.value, ast.Constant)
                                    and kw.value.value is True
                                ):
                                    penalizacion_seguridad += 15.0
                                    motivos_seguridad.append(
                                        f"[-15 pts] En '{nombre_archivo}' (línea {nodo.lineno}): llamado a '{nombre_func}' con 'shell=True' (vulnerable a inyección de comandos)"
                                    )

                    # --- SEGURIDAD: API Keys o contraseñas públicas en el código ---
                    elif isinstance(nodo, (ast.Assign, ast.AnnAssign)):
                        valor_nodo = nodo.value
                        if isinstance(valor_nodo, ast.Constant) and isinstance(
                            valor_nodo.value, str
                        ):
                            valor_str = valor_nodo.value.strip()
                            if len(valor_str) >= 4 and not valor_str.startswith(
                                ("$", "{", "http")
                            ):
                                targets = (
                                    nodo.targets
                                    if isinstance(nodo, ast.Assign)
                                    else [nodo.target]
                                )
                                for target in targets:
                                    if isinstance(target, ast.Name):
                                        es_nombre_secreto = bool(
                                            patron_nombre_secreto.search(target.id)
                                        )
                                        es_valor_apikey = bool(
                                            patron_valor_apikey.search(valor_str)
                                        )
                                        if es_nombre_secreto or es_valor_apikey:
                                            penalizacion_seguridad += 10.0
                                            motivos_seguridad.append(
                                                f"[-10 pts] En '{nombre_archivo}' (línea {nodo.lineno}): la API Key o credencial en la variable '{target.id}' es pública (está escrita directamente en el código). Muévela a una variable de entorno con os.getenv()"
                                            )

                    # --- SEGURIDAD: Consultas SQL concatenadas en f-strings ---
                    elif isinstance(nodo, ast.JoinedStr):
                        texto_fstring = "".join(
                            c.value
                            for c in nodo.values
                            if isinstance(c, ast.Constant) and isinstance(c.value, str)
                        )
                        if patron_sql.search(texto_fstring):
                            penalizacion_seguridad += 15.0
                            motivos_seguridad.append(
                                f"[-15 pts] En '{nombre_archivo}' (línea {nodo.lineno}): consulta SQL armada con variables incrustadas (riesgo de Inyección SQL). Usa parámetros seguros"
                            )

                # Evaluar exceso de importaciones o clases amontonadas en este archivo
                if imports_en_archivo > 6:
                    pts_imp = round((imports_en_archivo - 6) * 5.0, 2)
                    penalizacion_flexibilidad += pts_imp
                    motivos_flexibilidad.append(
                        f"[-{pts_imp:g} pts] En '{nombre_archivo}': mala organización por exceso de acoplamiento ({imports_en_archivo} importaciones en un mismo archivo, máximo recomendado: 6)"
                    )

                if clases_en_archivo > 3:
                    pts_cls = (clases_en_archivo - 3) * 10.0
                    penalizacion_flexibilidad += pts_cls
                    motivos_flexibilidad.append(
                        f"[-{pts_cls:g} pts] En '{nombre_archivo}': mala organización modular al concentrar {clases_en_archivo} clases en el mismo archivo (máximo recomendado: 3)"
                    )

            except SyntaxError as e:
                linea_err = getattr(e, "lineno", "desconocida")
                penalizacion_fiabilidad += 25.0
                motivos_fiabilidad.append(
                    f"[-25 pts] En '{nombre_archivo}' (línea {linea_err}): hay un error de sintaxis de Python que impide ejecutar el archivo"
                )
            except Exception as e:
                print(f"Error procesando {ruta}: {str(e)}")

        total_archivos = max(1, len(archivos))
        promedio_cc = (
            (total_complejidad / bloques_analizados) if bloques_analizados > 0 else 1.0
        )
        promedio_imports = total_imports / total_archivos

        # =====================================================================
        # 1. MANTENIBILIDAD (0 a 100)
        # =====================================================================
        puntaje_mantenibilidad = round(
            min(100.0, max(0.0, 100.0 - penalizacion_mantenibilidad)), 2
        )
        if not motivos_mantenibilidad:
            evidencia_mantenibilidad = (
                f"✅ 100/100 (Sin errores): {total_archivos} archivo(s) ({total_loc} líneas) con excelente organización "
                f"y baja complejidad ciclomática (promedio {promedio_cc:.2f} ≤ 5)."
            )
        else:
            evidencia_mantenibilidad = (
                f"Obtuvo {puntaje_mantenibilidad}/100 porque: "
                + " | ".join(motivos_mantenibilidad)
            )

        # =====================================================================
        # 2. SEGURIDAD (0 a 100)
        # =====================================================================
        ruta_req = self._buscar_archivo_especifico("requirements.txt")
        penalizacion_req, motivos_req = self._evaluar_requirements(ruta_req)
        penalizacion_seguridad += penalizacion_req
        motivos_seguridad.extend(motivos_req)

        puntaje_seguridad = round(
            min(100.0, max(0.0, 100.0 - penalizacion_seguridad)), 2
        )
        if not motivos_seguridad:
            evidencia_seguridad = (
                "✅ 100/100 (Sin errores): No hay API Keys públicas ni funciones inseguras en el código "
                "y el archivo requirements.txt tiene todas sus versiones fijadas."
            )
        else:
            evidencia_seguridad = (
                f"Obtuvo {puntaje_seguridad}/100 porque: " + " | ".join(motivos_seguridad)
            )

        # =====================================================================
        # 3. FLEXIBILIDAD (0 a 100)
        # =====================================================================
        puntaje_flexibilidad = round(
            min(100.0, max(0.0, 100.0 - penalizacion_flexibilidad)), 2
        )
        if not motivos_flexibilidad:
            evidencia_flexibilidad = (
                f"✅ 100/100 (Sin errores): Organización modular limpia, bajo acoplamiento "
                f"({promedio_imports:.1f} imports/archivo) y funciones con parámetros bien estructurados (≤ 5)."
            )
        else:
            evidencia_flexibilidad = (
                f"Obtuvo {puntaje_flexibilidad}/100 porque: "
                + " | ".join(motivos_flexibilidad)
            )

        # =====================================================================
        # 4. FIABILIDAD (0 a 100)
        # =====================================================================
        ruta_cov = self._buscar_archivo_especifico("coverage.xml")
        cobertura_xml = self._leer_cobertura_xml(ruta_cov)

        if ruta_cov is None:
            penalizacion_fiabilidad += 20.0
            motivos_fiabilidad.append(
                "[-20 pts] Falta el archivo 'coverage.xml' que solicita el programa para comprobar las pruebas unitarias"
            )
        elif cobertura_xml is None:
            penalizacion_fiabilidad += 15.0
            motivos_fiabilidad.append(
                "[-15 pts] El archivo 'coverage.xml' no tiene un formato válido o le falta el atributo 'line-rate'"
            )
        elif cobertura_xml < 80.0:
            pts_cov = round((80.0 - cobertura_xml) * 0.5, 2)
            penalizacion_fiabilidad += pts_cov
            motivos_fiabilidad.append(
                f"[-{pts_cov:g} pts] En 'coverage.xml': la cobertura de pruebas es de {cobertura_xml:.1f}% (se requiere al menos 80% para alcanzar el 100%)"
            )

        if total_funciones > 0 and total_try_except == 0:
            penalizacion_fiabilidad += 10.0
            ubicacion_ej = primera_funcion_ubicacion or "los archivos .py"
            motivos_fiabilidad.append(
                f"[-10 pts] En {ubicacion_ej}: el código no tiene bloques 'try/except' para evitar caídas ante errores inesperados"
            )

        puntaje_fiabilidad = round(
            min(100.0, max(0.0, 100.0 - penalizacion_fiabilidad)), 2
        )
        if not motivos_fiabilidad:
            evidencia_fiabilidad = (
                f"✅ 100/100 (Sin errores): Incluye el reporte 'coverage.xml' con cobertura óptima ({cobertura_xml:.1f}%) "
                f"y {total_try_except} bloque(s) 'try/except' para el manejo seguro de errores."
            )
        else:
            evidencia_fiabilidad = (
                f"Obtuvo {puntaje_fiabilidad}/100 porque: " + " | ".join(motivos_fiabilidad)
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