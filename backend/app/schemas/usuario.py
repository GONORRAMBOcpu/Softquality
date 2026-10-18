"""
Schemas (DTOs) para los casos de uso: Registrarse e Iniciar sesión.
Regla 2 del prompt maestro: módulos se comunican por contratos de datos claros (JSON/DTOs),
nunca exponiendo el modelo de SQLAlchemy directamente hacia el frontend.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UsuarioRegistroRequest(BaseModel):
    """Lo que envía el frontend al formulario de Registrarse."""
    nombre: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("nombre")
    @classmethod
    def limpiar_nombre(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres.")
        return v

    @field_validator("password")
    @classmethod
    def maximo_72_bytes(cls, v: str) -> str:
        # bcrypt solo procesa los primeros 72 BYTES (los acentos/emojis ocupan más de 1)
        if len(v.encode("utf-8")) > 72:
            raise ValueError("La contraseña es demasiado larga (máximo 72 bytes).")
        return v


class UsuarioLoginRequest(BaseModel):
    """Lo que envía el frontend al formulario de Iniciar sesión."""
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UsuarioOut(BaseModel):
    """Lo que el backend devuelve. Nunca incluye password_hash."""
    id: uuid.UUID
    nombre: str
    email: EmailStr
    rol: str
    creado_en: datetime

    class Config:
        from_attributes = True  # permite construir desde el modelo ORM


class TokenOut(BaseModel):
    """Respuesta de un login exitoso."""
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
