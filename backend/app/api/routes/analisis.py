# app/api/routes/analisis.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Optional
from pydantic import BaseModel
import shutil
import tempfile
import zipfile
import os

from app.schemas.metrica import MetricaCalculada
from app.services.motor_analisis import MotorAnalisisPython
from app.services.motor_ia import MotorIAService
from app.database import get_db, engine
from app.models.calidad import (
    Proyecto,
    Version,
    Analisis,
    MetricaResultado,
    CaracteristicaISO,
    EvaluacionCMMI,
)

router = APIRouter()

CATALOGO_ISO_MVP = [
    (
        "Mantenibilidad",
        "Capacidad del software para ser entendido, corregido y mejorado eficientemente (ISO/IEC 25010).",
    ),
    (
        "Seguridad",
        "Grado de protección de los datos y el código frente a vulnerabilidades y accesos inseguros (ISO/IEC 25010).",
    ),
    (
        "Flexibilidad",
        "Nivel de desacoplamiento, modularidad y facilidad de adaptación a cambios (ISO/IEC 25010).",
    ),
    (
        "Fiabilidad",
        "Capacidad del software para operar con tolerancia a fallos y respaldo de pruebas (ISO/IEC 25010).",
    ),
]


# =====================================================================
# AUTO-MIGRACIÓN SEGURA Y CATÁLOGO OFICIAL ISO/IEC 25010
# =====================================================================
def asegurar_catalogo_iso(db: Session) -> Dict[str, int]:
    """
    Garantiza que las 4 características automatizables de la norma ISO/IEC 25010
    existan en la tabla CARACTERISTICA_ISO y devuelve un diccionario {nombre: id_caracteristica}.
    """
    CaracteristicaISO.__table__.create(bind=engine, checkfirst=True)

    mapa_ids: Dict[str, int] = {}
    for nombre, descripcion in CATALOGO_ISO_MVP:
        caract = (
            db.query(CaracteristicaISO)
            .filter(CaracteristicaISO.nombre_caracteristica.ilike(nombre))
            .first()
        )
        if not caract:
            caract = CaracteristicaISO(
                nombre_caracteristica=nombre,
                descripcion=descripcion,
            )
            db.add(caract)
            db.commit()
            db.refresh(caract)
        elif caract.nombre_caracteristica != nombre:
            caract.nombre_caracteristica = nombre
            db.commit()

        mapa_ids[nombre] = caract.id_caracteristica

    return mapa_ids


def asegurar_esquema_y_migracion(db: Session):
    """
    Garantiza que las tablas PROYECTO, VERSION y CARACTERISTICA_ISO existan,
    amplía las columnas de evidencia técnica y agrupa los análisis antiguos en 'Pruebas Iniciales'.
    """
    Proyecto.__table__.create(bind=engine, checkfirst=True)
    Version.__table__.create(bind=engine, checkfirst=True)
    asegurar_catalogo_iso(db)

    # Ampliar longitud de columnas en metrica_resultado para guardar evidencia técnica detallada
    try:
        db.execute(
            text(
                "ALTER TABLE analisis ADD COLUMN IF NOT EXISTS id_version INTEGER REFERENCES version(id_version);"
            )
        )
        db.execute(
            text(
                "ALTER TABLE metrica_resultado ALTER COLUMN valor_cualitativo TYPE VARCHAR(500);"
            )
        )
        db.execute(
            text(
                "ALTER TABLE metrica_resultado ALTER COLUMN nombre_metrica TYPE VARCHAR(150);"
            )
        )
        db.commit()
    except Exception:
        db.rollback()

    # Buscar análisis huérfanos y agruparlos en 'Pruebas Iniciales'
    analisis_huerfanos = (
        db.query(Analisis)
        .filter(Analisis.id_version == None)
        .order_by(Analisis.id_analisis.asc())
        .all()
    )

    if analisis_huerfanos:
        proyecto_pruebas = (
            db.query(Proyecto)
            .filter(Proyecto.nombre == "Pruebas Iniciales")
            .first()
        )
        if not proyecto_pruebas:
            proyecto_pruebas = Proyecto(
                nombre="Pruebas Iniciales",
                descripcion="Agrupación automática de los análisis iniciales de prueba",
                estado="Activo",
            )
            db.add(proyecto_pruebas)
            db.commit()
            db.refresh(proyecto_pruebas)

        versiones_actuales = (
            db.query(Version)
            .filter(Version.id_proyecto == proyecto_pruebas.id_proyecto)
            .count()
        )

        for idx, anal in enumerate(analisis_huerfanos, start=versiones_actuales + 1):
            nueva_ver = Version(
                id_proyecto=proyecto_pruebas.id_proyecto,
                numero_version=f"Versión {idx}",
                fecha_subida=anal.fecha_analisis,
                artefacto_url=f"analisis_historico_{anal.id_analisis}.zip",
            )
            db.add(nueva_ver)
            db.commit()
            db.refresh(nueva_ver)

            anal.id_version = nueva_ver.id_version

        db.commit()


def _construir_punto_grafica_iso(etiqueta_version: str, resultados_ver: list) -> dict:
    """
    Construye el objeto de datos para Recharts garantizando siempre las 4 llaves
    ('Mantenibilidad', 'Seguridad', 'Flexibilidad', 'Fiabilidad') en escala de 0 a 100.
    Si es un análisis antiguo con LOC y Complejidad crudos, los normaliza automáticamente.
    """
    punto = {"version": etiqueta_version}
    valores_directos = {}
    loc_antiguo = None
    cc_antiguo = None

    for metrica, caracteristica in resultados_ver:
        nombre_caract = getattr(caracteristica, "nombre_caracteristica", "")
        nombre_met = str(getattr(metrica, "nombre_metrica", "")).lower()
        valor = float(getattr(metrica, "valor_cuantitativo", 0.0))

        if "líneas" in nombre_met or "loc" in nombre_met:
            loc_antiguo = valor
        elif "complejidad" in nombre_met:
            cc_antiguo = valor
        elif nombre_caract in {"Mantenibilidad", "Seguridad", "Flexibilidad", "Fiabilidad"}:
            valores_directos[nombre_caract] = round(min(100.0, max(0.0, valor)), 2)

    if len(valores_directos) >= 4:
        punto.update(valores_directos)
        return punto

    # Normalización de respaldo para análisis antiguos (previos a las 4 características)
    cc_base = cc_antiguo if cc_antiguo is not None else 2.5
    loc_base = loc_antiguo if loc_antiguo is not None else 150.0

    mant_norm = valores_directos.get(
        "Mantenibilidad",
        round(min(100.0, max(40.0, 95.0 - max(0.0, cc_base - 1.5) * 6.0)), 2),
    )
    seg_norm = valores_directos.get("Seguridad", round(min(100.0, max(50.0, mant_norm - 5.0)), 2))
    flex_norm = valores_directos.get(
        "Flexibilidad",
        round(min(100.0, max(45.0, 92.0 - min(30.0, loc_base / 40.0))), 2),
    )
    fiab_norm = valores_directos.get("Fiabilidad", round(min(100.0, max(40.0, mant_norm - 12.0)), 2))

    punto["Mantenibilidad"] = mant_norm
    punto["Seguridad"] = seg_norm
    punto["Flexibilidad"] = flex_norm
    punto["Fiabilidad"] = fiab_norm
    return punto


# =====================================================================
# ESQUEMAS PYDANTIC PARA PROYECTOS Y CMMI
# =====================================================================
class ProyectoCreateRequest(BaseModel):
    nombre: str
    descripcion: Optional[str] = "Proyecto académico evaluado en SoftQuality"


class ProyectoUpdateRequest(BaseModel):
    nombre: str


class ChecklistCMMIRequest(BaseModel):
    respuestas_checklist: Dict[str, bool]


# =====================================================================
# ENDPOINTS DE GESTIÓN DE PROYECTOS (NIVEL 1 Y NIVEL 2)
# =====================================================================
@router.get("/proyectos")
def listar_proyectos_con_versiones(db: Session = Depends(get_db)):
    """
    Devuelve todos los proyectos con sus versiones anidadas, métricas ISO 25010
    y nivel CMMI para las vistas 'Subir Proyecto' y 'Mirar Proyectos'.
    """
    asegurar_esquema_y_migracion(db)

    proyectos_db = db.query(Proyecto).order_by(Proyecto.id_proyecto.desc()).all()
    respuesta = []

    for proy in proyectos_db:
        versiones_db = (
            db.query(Version)
            .filter(Version.id_proyecto == proy.id_proyecto)
            .order_by(Version.id_version.asc())
            .all()
        )

        lista_versiones = []
        for ver in versiones_db:
            anal = (
                db.query(Analisis)
                .filter(Analisis.id_version == ver.id_version)
                .first()
            )
            if not anal:
                continue

            eval_cmmi = (
                db.query(EvaluacionCMMI)
                .filter(EvaluacionCMMI.id_analisis == anal.id_analisis)
                .first()
            )
            metricas = (
                db.query(MetricaResultado)
                .filter(MetricaResultado.id_analisis == anal.id_analisis)
                .all()
            )
            resumen_metricas = [
                f"{getattr(m, 'nombre_metrica', 'Métrica')}: {getattr(m, 'valor_cuantitativo', getattr(m, 'valor', 0))}/100"
                if getattr(m, "nombre_metrica", "") in {"Mantenibilidad", "Seguridad", "Flexibilidad", "Fiabilidad"}
                else f"{getattr(m, 'nombre_metrica', 'Métrica')}: {getattr(m, 'valor_cuantitativo', getattr(m, 'valor', 0))}"
                for m in metricas
            ]

            fecha_str = (
                anal.fecha_analisis.strftime("%Y-%m-%d %H:%M")
                if getattr(anal, "fecha_analisis", None)
                else "Registro guardado"
            )

            lista_versiones.append({
                "id_version": ver.id_version,
                "numero_version": ver.numero_version,
                "id_analisis": anal.id_analisis,
                "etiqueta_completa": f"{ver.numero_version} de {proy.nombre}",
                "fecha": fecha_str,
                "estado": getattr(anal, "estado", "Completado") or "Completado",
                "nivel_cmmi": eval_cmmi.nivel_madurez_referencial if eval_cmmi else "Pendiente de evaluación",
                "resumen_metricas": " | ".join(resumen_metricas) if resumen_metricas else "Sin métricas",
                "tiene_ia": bool(anal.recomendaciones_ia),
            })

        lista_versiones_ordenadas = list(reversed(lista_versiones))

        fecha_creacion_str = (
            proy.fecha_creacion.strftime("%Y-%m-%d")
            if getattr(proy, "fecha_creacion", None)
            else "Activo"
        )

        respuesta.append({
            "id_proyecto": proy.id_proyecto,
            "nombre": proy.nombre,
            "descripcion": proy.descripcion,
            "estado": proy.estado,
            "fecha_creacion": fecha_creacion_str,
            "total_versiones": len(lista_versiones_ordenadas),
            "proxima_version": f"Versión {len(lista_versiones_ordenadas) + 1}",
            "versiones": lista_versiones_ordenadas,
        })

    return respuesta


@router.post("/proyectos")
def crear_nuevo_proyecto(datos: ProyectoCreateRequest, db: Session = Depends(get_db)):
    asegurar_esquema_y_migracion(db)

    nombre_limpio = datos.nombre.strip()
    if not nombre_limpio:
        raise HTTPException(status_code=400, detail="El nombre del proyecto no puede estar vacío.")

    existente = (
        db.query(Proyecto)
        .filter(Proyecto.nombre.ilike(nombre_limpio))
        .first()
    )
    if existente:
        raise HTTPException(status_code=400, detail=f"Ya existe un proyecto llamado '{existente.nombre}'.")

    nuevo_proy = Proyecto(
        nombre=nombre_limpio,
        descripcion=datos.descripcion or "Proyecto académico evaluado en SoftQuality",
        estado="Activo",
    )
    db.add(nuevo_proy)
    db.commit()
    db.refresh(nuevo_proy)

    return {
        "mensaje": f"Proyecto '{nuevo_proy.nombre}' creado exitosamente.",
        "id_proyecto": nuevo_proy.id_proyecto,
        "nombre": nuevo_proy.nombre,
    }


@router.put("/proyectos/{id_proyecto}")
def editar_nombre_proyecto(
    id_proyecto: int,
    datos: ProyectoUpdateRequest,
    db: Session = Depends(get_db),
):
    asegurar_esquema_y_migracion(db)

    proy = db.query(Proyecto).filter(Proyecto.id_proyecto == id_proyecto).first()
    if not proy:
        raise HTTPException(status_code=404, detail="El proyecto especificado no existe.")

    nuevo_nombre = datos.nombre.strip()
    if not nuevo_nombre:
        raise HTTPException(status_code=400, detail="El nuevo nombre no puede estar vacío.")

    duplicado = (
        db.query(Proyecto)
        .filter(Proyecto.nombre.ilike(nuevo_nombre), Proyecto.id_proyecto != id_proyecto)
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=400, detail=f"Ya existe otro proyecto con el nombre '{nuevo_nombre}'.")

    proy.nombre = nuevo_nombre
    db.commit()
    db.refresh(proy)

    return {
        "mensaje": f"Nombre del proyecto actualizado a '{proy.nombre}'.",
        "id_proyecto": proy.id_proyecto,
        "nombre": proy.nombre,
    }


@router.delete("/proyectos/{id_proyecto}")
def eliminar_proyecto_completo(id_proyecto: int, db: Session = Depends(get_db)):
    asegurar_esquema_y_migracion(db)

    proy = db.query(Proyecto).filter(Proyecto.id_proyecto == id_proyecto).first()
    if not proy:
        raise HTTPException(status_code=404, detail="El proyecto no existe.")

    nombre_eliminado = proy.nombre
    versiones = db.query(Version).filter(Version.id_proyecto == id_proyecto).all()
    ids_analisis_eliminados = []

    for ver in versiones:
        analisis_list = db.query(Analisis).filter(Analisis.id_version == ver.id_version).all()
        for anal in analisis_list:
            ids_analisis_eliminados.append(anal.id_analisis)
            db.query(MetricaResultado).filter(MetricaResultado.id_analisis == anal.id_analisis).delete()
            db.query(EvaluacionCMMI).filter(EvaluacionCMMI.id_analisis == anal.id_analisis).delete()
            db.delete(anal)
        db.delete(ver)

    db.delete(proy)
    db.commit()

    return {
        "mensaje": f"El proyecto '{nombre_eliminado}' y todas sus versiones fueron eliminados correctamente.",
        "id_proyecto_eliminado": id_proyecto,
        "ids_analisis_eliminados": ids_analisis_eliminados,
    }


# =====================================================================
# INGESTA DE ZIP Y CÁLCULO DE LAS 4 CARACTERÍSTICAS ISO/IEC 25010
# =====================================================================
@router.post("/ejecutar")
async def ejecutar_analisis_zip(
    file: UploadFile = File(...),
    id_proyecto: Optional[int] = Form(None),
    nombre_proyecto: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Recibe el archivo .zip y el proyecto seleccionado, calcula las 4 características
    ISO/IEC 25010 normalizadas de 0 a 100 y las persiste vinculadas a CARACTERISTICA_ISO.
    """
    asegurar_esquema_y_migracion(db)
    mapa_caracteristicas = asegurar_catalogo_iso(db)

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .zip")

    # 1. Resolver el Proyecto destino
    proyecto_destino = None
    if id_proyecto is not None:
        proyecto_destino = db.query(Proyecto).filter(Proyecto.id_proyecto == id_proyecto).first()

    if not proyecto_destino and nombre_proyecto:
        nombre_limpio = nombre_proyecto.strip()
        proyecto_destino = db.query(Proyecto).filter(Proyecto.nombre.ilike(nombre_limpio)).first()
        if not proyecto_destino:
            proyecto_destino = Proyecto(nombre=nombre_limpio, estado="Activo")
            db.add(proyecto_destino)
            db.commit()
            db.refresh(proyecto_destino)

    if not proyecto_destino:
        proyecto_destino = db.query(Proyecto).filter(Proyecto.nombre == "Pruebas Iniciales").first()
        if not proyecto_destino:
            proyecto_destino = Proyecto(nombre="Pruebas Iniciales", estado="Activo")
            db.add(proyecto_destino)
            db.commit()
            db.refresh(proyecto_destino)

    # 2. Extraer y analizar el archivo .zip
    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = os.path.join(temp_dir, file.filename)

        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extract_dir = os.path.join(temp_dir, "codigo_extraido")
        os.makedirs(extract_dir)

        try:
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(extract_dir)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="El archivo zip está corrupto")

        motor = MotorAnalisisPython(extract_dir)
        resultados = motor.analizar_proyecto()

        if not resultados:
            raise HTTPException(status_code=400, detail="No se encontró código Python válido para analizar")

        # 3. Calcular automáticamente el número de versión consecutivo
        versiones_existentes = (
            db.query(Version)
            .filter(Version.id_proyecto == proyecto_destino.id_proyecto)
            .order_by(Version.id_version.asc())
            .all()
        )
        max_num = 0
        for v in versiones_existentes:
            partes = [int(s) for s in str(v.numero_version).split() if s.isdigit()]
            if partes and partes[0] > max_num:
                max_num = partes[0]

        siguiente_numero = max(len(versiones_existentes), max_num) + 1
        etiqueta_version = f"Versión {siguiente_numero}"

        nueva_version = Version(
            id_proyecto=proyecto_destino.id_proyecto,
            numero_version=etiqueta_version,
            artefacto_url=file.filename,
        )
        db.add(nueva_version)
        db.commit()
        db.refresh(nueva_version)

        # 4. Crear el registro de Análisis vinculado a la nueva Versión
        nuevo_analisis = Analisis(
            id_version=nueva_version.id_version,
            estado="Completado",
        )
        db.add(nuevo_analisis)
        db.commit()
        db.refresh(nuevo_analisis)

        # 5. Guardar cada una de las 4 métricas vinculada a su CaracteristicaISO exacta
        id_mantenibilidad_default = mapa_caracteristicas.get("Mantenibilidad", 1)

        for res in resultados:
            id_caract = mapa_caracteristicas.get(
                res.caracteristica_iso_sugerida,
                mapa_caracteristicas.get(res.nombre_metrica, id_mantenibilidad_default),
            )
            evidencia_limpia = (res.descripcion or res.unidad or "Puntaje normalizado 0-100")[:490]

            metrica_db = MetricaResultado(
                id_analisis=nuevo_analisis.id_analisis,
                id_caracteristica=id_caract,
                nombre_metrica=res.nombre_metrica,
                valor_cuantitativo=res.valor,
                valor_cualitativo=evidencia_limpia,
            )
            db.add(metrica_db)

        db.commit()

        return {
            "id_analisis": nuevo_analisis.id_analisis,
            "id_proyecto": proyecto_destino.id_proyecto,
            "nombre_proyecto": proyecto_destino.nombre,
            "numero_version": nueva_version.numero_version,
            "etiqueta_completa": f"{nueva_version.numero_version} de {proyecto_destino.nombre}",
            "metricas": resultados,
        }


# =====================================================================
# GENERACIÓN DE RECOMENDACIONES IA Y RESULTADOS PARA EL DASHBOARD
# =====================================================================
@router.post("/{id_analisis}/generar-recomendaciones")
async def interpretar_con_ia(id_analisis: int, db: Session = Depends(get_db)):
    """
    Busca las 4 métricas ISO/IEC 25010 y su evidencia técnica en la BD,
    se las envía a Gemini y guarda las recomendaciones generadas.
    """
    asegurar_esquema_y_migracion(db)

    analisis_db = db.query(Analisis).filter(Analisis.id_analisis == id_analisis).first()
    if not analisis_db:
        raise HTTPException(status_code=404, detail="El análisis indicado no existe")

    resultados_db = (
        db.query(MetricaResultado, CaracteristicaISO)
        .outerjoin(
            CaracteristicaISO,
            MetricaResultado.id_caracteristica == CaracteristicaISO.id_caracteristica,
        )
        .filter(MetricaResultado.id_analisis == id_analisis)
        .all()
    )
    if not resultados_db:
        raise HTTPException(status_code=400, detail="Este análisis no tiene métricas calculadas")

    datos_para_ia = []
    for m, c in resultados_db:
        nombre_caract = getattr(c, "nombre_caracteristica", m.nombre_metrica) if c else m.nombre_metrica
        datos_para_ia.append({
            "caracteristica_iso": nombre_caract,
            "nombre_metrica": m.nombre_metrica,
            "puntaje_0_a_100": m.valor_cuantitativo,
            "valor": m.valor_cuantitativo,
            "evidencia_tecnica": m.valor_cualitativo,
            "unidad": m.valor_cualitativo,
        })

    eval_cmmi = (
        db.query(EvaluacionCMMI)
        .filter(EvaluacionCMMI.id_analisis == id_analisis)
        .first()
    )

    motor_ia = MotorIAService()
    try:
        if eval_cmmi:
            recomendaciones_json = motor_ia.generar_recomendaciones(
                metricas_db=datos_para_ia,
                evaluacion_cmmi={
                    "nivel_madurez_referencial": eval_cmmi.nivel_madurez_referencial,
                    "respuestas_checklist": eval_cmmi.respuestas_checklist,
                },
            )
        else:
            recomendaciones_json = motor_ia.generar_recomendaciones(datos_para_ia)
    except TypeError:
        recomendaciones_json = motor_ia.generar_recomendaciones(datos_para_ia)

    analisis_db.recomendaciones_ia = recomendaciones_json
    analisis_db.estado = "Interpretado por IA"
    db.commit()

    return {
        "mensaje": "Interpretación completada con éxito",
        "recomendaciones": recomendaciones_json,
    }


@router.get("/{id_analisis}/resultados")
def obtener_resultados_dashboard(id_analisis: int, db: Session = Depends(get_db)):
    """
    Devuelve los resultados de un análisis específico, el nombre de su Proyecto y Versión
    y la evolución histórica con las 4 llaves ISO 25010 (0 a 100) listas para Recharts.
    """
    asegurar_esquema_y_migracion(db)

    analisis = db.query(Analisis).filter(Analisis.id_analisis == id_analisis).first()
    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado en la base de datos.")

    version_actual = None
    proyecto_actual = None
    if analisis.id_version:
        version_actual = db.query(Version).filter(Version.id_version == analisis.id_version).first()
        if version_actual:
            proyecto_actual = db.query(Proyecto).filter(Proyecto.id_proyecto == version_actual.id_proyecto).first()

    nombre_proyecto = proyecto_actual.nombre if proyecto_actual else "Pruebas Iniciales"
    numero_version = version_actual.numero_version if version_actual else f"Versión {id_analisis}"
    etiqueta_vista = f"{numero_version} de {nombre_proyecto}"

    metricas_historicas = []

    if proyecto_actual:
        versiones_proyecto = (
            db.query(Version)
            .filter(Version.id_proyecto == proyecto_actual.id_proyecto)
            .order_by(Version.id_version.asc())
            .all()
        )
        for ver in versiones_proyecto:
            anal_ver = db.query(Analisis).filter(Analisis.id_version == ver.id_version).first()
            if not anal_ver:
                continue

            resultados_ver = (
                db.query(MetricaResultado, CaracteristicaISO)
                .outerjoin(
                    CaracteristicaISO,
                    MetricaResultado.id_caracteristica == CaracteristicaISO.id_caracteristica,
                )
                .filter(MetricaResultado.id_analisis == anal_ver.id_analisis)
                .all()
            )
            punto_grafica = _construir_punto_grafica_iso(ver.numero_version, resultados_ver)
            metricas_historicas.append(punto_grafica)
    else:
        resultados_db = (
            db.query(MetricaResultado, CaracteristicaISO)
            .outerjoin(
                CaracteristicaISO,
                MetricaResultado.id_caracteristica == CaracteristicaISO.id_caracteristica,
            )
            .filter(MetricaResultado.id_analisis == id_analisis)
            .all()
        )
        punto_grafica = _construir_punto_grafica_iso(numero_version, resultados_db)
        metricas_historicas.append(punto_grafica)

    evaluacion_cmmi = (
        db.query(EvaluacionCMMI)
        .filter(EvaluacionCMMI.id_analisis == id_analisis)
        .first()
    )

    return {
        "id_analisis": analisis.id_analisis,
        "id_proyecto": proyecto_actual.id_proyecto if proyecto_actual else None,
        "nombre_proyecto": nombre_proyecto,
        "numero_version": numero_version,
        "etiqueta_vista": etiqueta_vista,
        "recomendaciones_ia": analisis.recomendaciones_ia,
        "metricas_historicas": metricas_historicas,
        "nivel_cmmi": evaluacion_cmmi.nivel_madurez_referencial if evaluacion_cmmi else "Pendiente de evaluación",
    }


@router.post("/{id_analisis}/cmmi")
def guardar_evaluacion_cmmi(
    id_analisis: int,
    datos: ChecklistCMMIRequest,
    db: Session = Depends(get_db),
):
    """
    Recibe el checklist CMMI desde React, calcula el nivel de madurez referencial,
    lo guarda en EVALUACION_CMMI y actualiza las recomendaciones de IA (ISO 25010 + CMMI).
    """
    asegurar_esquema_y_migracion(db)

    analisis = db.query(Analisis).filter(Analisis.id_analisis == id_analisis).first()
    if not analisis:
        raise HTTPException(status_code=404, detail="El análisis especificado no existe.")

    respuestas = datos.respuestas_checklist
    total_afirmativas = sum(1 for valor in respuestas.values() if valor is True)

    if total_afirmativas <= 1:
        nivel_calculado = "Nivel 1 - Inicial (Proceso impredecible y reactivo)"
    elif total_afirmativas <= 3:
        nivel_calculado = "Nivel 2 - Gestionado (Proyecto planificado y controlado)"
    else:
        nivel_calculado = "Nivel 3 - Definido (Proceso estandarizado y proactivo)"

    evaluacion_existente = (
        db.query(EvaluacionCMMI)
        .filter(EvaluacionCMMI.id_analisis == id_analisis)
        .first()
    )

    if evaluacion_existente:
        evaluacion_existente.respuestas_checklist = respuestas
        evaluacion_existente.nivel_madurez_referencial = nivel_calculado
    else:
        nueva_evaluacion = EvaluacionCMMI(
            id_analisis=id_analisis,
            respuestas_checklist=respuestas,
            nivel_madurez_referencial=nivel_calculado,
        )
        db.add(nueva_evaluacion)

    resultados_db = (
        db.query(MetricaResultado, CaracteristicaISO)
        .outerjoin(
            CaracteristicaISO,
            MetricaResultado.id_caracteristica == CaracteristicaISO.id_caracteristica,
        )
        .filter(MetricaResultado.id_analisis == id_analisis)
        .all()
    )

    metricas_lista = []
    for metrica, caracteristica in resultados_db:
        nombre_caract = (
            getattr(caracteristica, "nombre_caracteristica", "Calidad ISO 25010")
            if caracteristica
            else "Calidad ISO 25010"
        )
        nombre_met = getattr(metrica, "nombre_metrica", None) or nombre_caract
        valor_num = getattr(metrica, "valor_cuantitativo", None)
        if valor_num is None:
            valor_num = getattr(metrica, "valor", 0)

        metricas_lista.append({
            "caracteristica_iso": nombre_caract,
            "nombre_metrica": nombre_met,
            "puntaje_0_a_100": valor_num,
            "valor": valor_num,
            "evidencia_tecnica": getattr(metrica, "valor_cualitativo", ""),
        })

    datos_cmmi = {
        "nivel_madurez_referencial": nivel_calculado,
        "respuestas_checklist": respuestas,
    }

    motor_ia = MotorIAService()
    nuevas_recomendaciones = motor_ia.generar_recomendaciones(
        metricas_db=metricas_lista,
        evaluacion_cmmi=datos_cmmi,
    )

    analisis.recomendaciones_ia = nuevas_recomendaciones
    db.commit()
    db.refresh(analisis)

    return {
        "mensaje": "Evaluación CMMI registrada y análisis cualitativo actualizado exitosamente.",
        "id_analisis": id_analisis,
        "practicas_cumplidas": f"{total_afirmativas}/5",
        "nivel_madurez_referencial": nivel_calculado,
        "recomendaciones_ia": analisis.recomendaciones_ia,
    }


@router.get("/historial")
def listar_historial_analisis(db: Session = Depends(get_db)):
    asegurar_esquema_y_migracion(db)

    lista_analisis = db.query(Analisis).order_by(Analisis.id_analisis.desc()).all()
    historial = []

    for item in lista_analisis:
        ver = db.query(Version).filter(Version.id_version == item.id_version).first() if item.id_version else None
        proy = db.query(Proyecto).filter(Proyecto.id_proyecto == ver.id_proyecto).first() if ver else None

        nombre_proy = proy.nombre if proy else "Pruebas Iniciales"
        num_ver = ver.numero_version if ver else f"Versión #{item.id_analisis}"

        eval_cmmi = (
            db.query(EvaluacionCMMI)
            .filter(EvaluacionCMMI.id_analisis == item.id_analisis)
            .first()
        )
        metricas = (
            db.query(MetricaResultado)
            .filter(MetricaResultado.id_analisis == item.id_analisis)
            .all()
        )
        resumen_metricas = [
            f"{getattr(m, 'nombre_metrica', 'Métrica')}: {getattr(m, 'valor_cuantitativo', getattr(m, 'valor', 0))}/100"
            if getattr(m, "nombre_metrica", "") in {"Mantenibilidad", "Seguridad", "Flexibilidad", "Fiabilidad"}
            else f"{getattr(m, 'nombre_metrica', 'Métrica')}: {getattr(m, 'valor_cuantitativo', getattr(m, 'valor', 0))}"
            for m in metricas
        ]

        fecha_str = (
            item.fecha_analisis.strftime("%Y-%m-%d %H:%M")
            if getattr(item, "fecha_analisis", None)
            else "Registro guardado"
        )

        historial.append({
            "id_analisis": item.id_analisis,
            "id_proyecto": proy.id_proyecto if proy else None,
            "nombre_proyecto": nombre_proy,
            "numero_version": num_ver,
            "version": f"{num_ver} de {nombre_proy}",
            "fecha": fecha_str,
            "estado": getattr(item, "estado", "Completado") or "Completado",
            "nivel_cmmi": eval_cmmi.nivel_madurez_referencial if eval_cmmi else "Pendiente de evaluación",
            "resumen_metricas": " | ".join(resumen_metricas) if resumen_metricas else "Sin métricas",
            "tiene_ia": bool(item.recomendaciones_ia),
        })

    return historial


@router.delete("/{id_analisis}")
def eliminar_analisis(id_analisis: int, db: Session = Depends(get_db)):
    asegurar_esquema_y_migracion(db)

    analisis = db.query(Analisis).filter(Analisis.id_analisis == id_analisis).first()
    if not analisis:
        raise HTTPException(status_code=404, detail="El análisis no existe.")

    id_version_asociada = analisis.id_version

    db.query(MetricaResultado).filter(MetricaResultado.id_analisis == id_analisis).delete()
    db.query(EvaluacionCMMI).filter(EvaluacionCMMI.id_analisis == id_analisis).delete()

    db.delete(analisis)
    db.commit()

    if id_version_asociada:
        version_obj = db.query(Version).filter(Version.id_version == id_version_asociada).first()
        if version_obj:
            db.delete(version_obj)
            db.commit()

    return {
        "mensaje": f"La versión / Análisis #{id_analisis} fue eliminada correctamente.",
        "id_eliminado": id_analisis,
    }