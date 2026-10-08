# app/models/calidad.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import datetime
from app.database import Base


class Proyecto(Base):
    __tablename__ = "proyecto"

    id_proyecto = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, nullable=True)  # Opcional para convivir con el módulo de Autenticación
    nombre = Column(String(150), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True, default="Proyecto académico evaluado en SoftQuality")
    estado = Column(String(30), default="Activo")
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)

    # Relación 1:N con Version
    versiones = relationship("Version", back_populates="proyecto", cascade="all, delete-orphan")


class Version(Base):
    __tablename__ = "version"

    id_version = Column(Integer, primary_key=True, index=True)
    id_proyecto = Column(Integer, ForeignKey("proyecto.id_proyecto"), nullable=False)
    numero_version = Column(String(50), nullable=False)  # Ej: "Versión 1", "Versión 2"...
    fecha_subida = Column(DateTime, default=datetime.datetime.utcnow)
    artefacto_url = Column(String(255), nullable=True)

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="versiones")
    analisis = relationship("Analisis", back_populates="version_rel", uselist=False)


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
    id_version = Column(Integer, ForeignKey("version.id_version"), nullable=True)
    fecha_analisis = Column(DateTime, default=datetime.datetime.utcnow)
    estado = Column(String(20), default="Completado")
    recomendaciones_ia = Column(JSONB, nullable=True)

    # Relaciones bidireccionales
    version_rel = relationship("Version", back_populates="analisis")
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


class EvaluacionCMMI(Base):
    __tablename__ = "evaluacion_cmmi"

    id_evaluacion_cmmi = Column(Integer, primary_key=True, index=True)
    id_analisis = Column(Integer, ForeignKey("analisis.id_analisis"), unique=True, nullable=False)
    respuestas_checklist = Column(JSONB, nullable=False)
    nivel_madurez_referencial = Column(String, nullable=False)