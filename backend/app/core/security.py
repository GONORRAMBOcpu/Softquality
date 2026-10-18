"""
Seguridad: hash de contraseñas (bcrypt) + JWT + dependencia `get_current_user`.
Auth: JWT / OAuth2 con FastAPI security (sección 5 del prompt maestro).
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
from app.database import get_db
from app.models.usuario import Usuario

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Permite el botón "Authorize" de /docs (Swagger) usando el endpoint /api/auth/token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Hash de relleno: se verifica cuando el correo no existe, para que el login
# tarde lo mismo exista o no el usuario (evita enumerar correos por tiempo de respuesta).
HASH_FALSO = pwd_context.hash("contraseña-de-relleno")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return pwd_context.verify(password_plano, password_hash)


def crear_token_acceso(usuario: Usuario) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario.id),
        "rol": usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
        "iat": ahora,
        "exp": ahora + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    """Dependencia para proteger rutas: devuelve el Usuario del token o responde 401."""
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada. Inicia sesión de nuevo.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id_usuario = uuid.UUID(payload.get("sub", ""))
    except (JWTError, ValueError):
        raise credenciales_invalidas

    usuario = db.query(Usuario).filter(Usuario.id == id_usuario).first()
    if usuario is None:
        raise credenciales_invalidas
    return usuario
