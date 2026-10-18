"""
Configuración central leída desde variables de entorno (.env).
Si falta SECRET_KEY la app NO arranca: es preferible a firmar tokens con una clave débil.
"""
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "Falta SECRET_KEY en backend/.env (mínimo 32 caracteres). Genera una con:\n"
        '  python -c "import secrets; print(secrets.token_urlsafe(64))"'
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Orígenes permitidos por CORS, separados por coma.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
