"""
Utilidades de seguridad compartidas.
Auth: JWT / OAuth2 con FastAPI security (sección 5 del prompt maestro).
Este archivo solo cubre lo necesario para Registrarse; el manejo de tokens JWT
se añade en el caso de uso Iniciar sesión (siguiente en la lista).
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return pwd_context.verify(password_plano, password_hash)
