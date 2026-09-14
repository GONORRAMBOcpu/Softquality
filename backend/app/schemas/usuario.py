"""
Schemas (DTOs) para el caso de uso: Registrarse.
Regla 2 del prompt maestro: módulos se comunican por contratos de datos claros (JSON/DTOs),
nunca exponiendo el modelo de SQLAlchemy directamente hacia el frontend.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UsuarioRegistroRequest(BaseModel):
    """Lo que envía el frontend al formulario de Registrarse."""
    nombre: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)


class UsuarioOut(BaseModel):
    """Lo que el backend devuelve. Nunca incluye password_hash."""
    id: uuid.UUID
    nombre: str
    email: EmailStr
    rol: str
    creado_en: datetime

    class Config:
        from_attributes = True  # permite construir desde el modelo ORM
