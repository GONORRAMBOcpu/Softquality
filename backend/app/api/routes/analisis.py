# app/api/routes/analisis.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import shutil
import tempfile
import zipfile
import os

from app.schemas.metrica import MetricaCalculada
from app.services.motor_analisis import MotorAnalisisPython
from app.database import get_db
from app.models.calidad import Analisis, MetricaResultado, CaracteristicaISO
from app.services.motor_ia import MotorIAService
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/ejecutar")
async def ejecutar_analisis_zip(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)  # Inyectamos la conexión a la BD
):
    """
    Recibe un archivo .zip, lo extrae, ejecuta análisis y guarda en PostgreSQL.
    """
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .zip")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = os.path.join(temp_dir, file.filename)
        
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        extract_dir = os.path.join(temp_dir, "codigo_extraido")
        os.makedirs(extract_dir)
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="El archivo zip está corrupto")

        # 1. Ejecutar el análisis matemático
        motor = MotorAnalisisPython(extract_dir)
        resultados = motor.analizar_proyecto()
        
        if not resultados:
            raise HTTPException(status_code=400, detail="No se encontró código Python válido para analizar")

        # 2. PERSISTENCIA EN BASE DE DATOS
        # Crear un registro general del Análisis
        nuevo_analisis = Analisis(estado="Completado")
        db.add(nuevo_analisis)
        db.commit()
        db.refresh(nuevo_analisis) # Refrescamos para obtener el id_analisis autogenerado

        # Guardar cada métrica generada vinculada al análisis y a la característica ISO
        for res in resultados:
            metrica_db = MetricaResultado(
                id_analisis=nuevo_analisis.id_analisis,
                id_caracteristica=1, # 1 corresponde a Mantenibilidad en nuestro catálogo
                nombre_metrica=res.nombre_metrica,
                valor_cuantitativo=res.valor,
                valor_cualitativo=res.unidad
            )
            db.add(metrica_db)
            
        db.commit() # Guardamos todas las métricas en bloque

        return {
        "id_analisis": nuevo_analisis.id_analisis,
        "metricas": resultados
    }
@router.post("/{id_analisis}/generar-recomendaciones")
async def interpretar_con_ia(id_analisis: int, db: Session = Depends(get_db)):
    """
    Busca las métricas de un análisis en la BD, se las envía a Gemini 
    y guarda las recomendaciones generadas.
    """
    # 1. Buscar el análisis en la Base de Datos
    analisis_db = db.query(Analisis).filter(Analisis.id_analisis == id_analisis).first()
    if not analisis_db:
        raise HTTPException(status_code=404, detail="El análisis indicado no existe")

    # 2. Buscar las métricas que pertenecen a ese análisis
    metricas_db = db.query(MetricaResultado).filter(MetricaResultado.id_analisis == id_analisis).all()
    if not metricas_db:
        raise HTTPException(status_code=400, detail="Este análisis no tiene métricas calculadas")

    # 3. Formatear los datos para Gemini
    datos_para_ia = []
    for m in metricas_db:
        datos_para_ia.append({
            "metrica": m.nombre_metrica,
            "valor": m.valor_cuantitativo,
            "unidad": m.valor_cualitativo
        })

    # 4. Llamar al Motor de IA
    motor_ia = MotorIAService()
    recomendaciones_json = motor_ia.generar_recomendaciones(datos_para_ia)

    # 5. Guardar en la columna JSONB de PostgreSQL
    analisis_db.recomendaciones_ia = recomendaciones_json
    analisis_db.estado = "Interpretado por IA"
    db.commit()

    return {
        "mensaje": "Interpretación completada con éxito",
        "recomendaciones": recomendaciones_json
    }


@router.get("/{id_analisis}/resultados")
def obtener_resultados_dashboard(id_analisis: int, db: Session = Depends(get_db)):
    """
    Devuelve los resultados de un análisis específico formateados 
    para que el Dashboard de React (Recharts) los pueda graficar.
    """
    # 1. Buscamos el registro del análisis en la base de datos
    analisis = db.query(Analisis).filter(Analisis.id_analisis == id_analisis).first()
    
    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado en la base de datos.")

    # 2. Buscamos las métricas asociadas a este análisis uniendo la tabla de características ISO
    resultados_db = (
        db.query(MetricaResultado, CaracteristicaISO)
        .join(CaracteristicaISO, MetricaResultado.id_caracteristica == CaracteristicaISO.id_caracteristica)
        .filter(MetricaResultado.id_analisis == id_analisis)
        .all()
    )

    # 3. Formateamos los datos cuantitativos exactamente como los espera la gráfica (Recharts)
    # Por ahora enviamos el análisis actual. Más adelante podemos ampliar esta consulta
    # para traer todas las versiones del proyecto (v1.0, v2.0) y ver la evolución.
    metricas_formateadas = {"version": f"Análisis {id_analisis}"}
    
    for metrica, caracteristica in resultados_db:
        # Esto creará llaves como: "Mantenibilidad": 85, "Seguridad": 90, etc.
        metricas_formateadas[caracteristica.nombre_caracteristica] = metrica.valor_cuantitativo

    # 4. Retornamos el paquete completo al frontend
    return {
        "recomendaciones_ia": analisis.recomendaciones_ia,
        "metricas_historicas": [metricas_formateadas]
    }