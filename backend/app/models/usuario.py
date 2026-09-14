"""
Modelo de datos: Usuario
Caso de uso relacionado (diagrama, sección 3): Registrarse.
Nomenclatura: entidad de negocio en español (regla 4 del prompt maestro).
"""
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class RolUsuario(str, enum.Enum):
    usuario = "usuario"
    administrador = "administrador"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False, default=RolUsuario.usuario)
    creado_en = Column(DateTime, default=datetime.utcnow)
