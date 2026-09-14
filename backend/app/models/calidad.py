# app/models/calidad.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import datetime
from app.database import Base

class CaracteristicaISO(Base):
    __tablename__ = "caracteristica_iso"
    
    id_caracteristica = Column(Integer, primary_key=True, index=True)
    nombre_caracteristica = Column(String(100), unique=True, nullable=False)
    descripcion = Column(String(255))
    
    # Relación bidireccional
    metricas = relationship("MetricaResultado", back_populates="caracteristica")

class Analisis(Base):
    __tablename__ = "analisis"
    
    id_analisis = Column(Integer, primary_key=True, index=True)
    # Nota: Aquí iría el ForeignKey a VERSION, pero lo omitimos temporalmente
    # hasta que Camilo termine el modelo de Proyecto y Versión.
    fecha_analisis = Column(DateTime, default=datetime.datetime.utcnow)
    estado = Column(String(20), default="Completado")
    recomendaciones_ia = Column(JSONB, nullable=True) # Aquí guardará Gemini en el futuro
    
    # Relación bidireccional
    metricas = relationship("MetricaResultado", back_populates="analisis")

class MetricaResultado(Base):
    __tablename__ = "metrica_resultado"
    
    id_resultado_metrica = Column(Integer, primary_key=True, index=True)
    id_analisis = Column(Integer, ForeignKey("analisis.id_analisis"), nullable=False)
    id_caracteristica = Column(Integer, ForeignKey("caracteristica_iso.id_caracteristica"), nullable=False)
    
    nombre_metrica = Column(String(100), nullable=False)
    valor_cuantitativo = Column(Float, nullable=False)
    valor_cualitativo = Column(String(100), nullable=True)
    
    # Relaciones para navegar los objetos en Python
    analisis = relationship("Analisis", back_populates="metricas")
    caracteristica = relationship("CaracteristicaISO", back_populates="metricas")