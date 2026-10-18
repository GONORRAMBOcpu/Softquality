"""
Entrypoint de SoftQuality API.
- /api/auth/*      público (registrarse, login) y /me protegido.
- /api/analisis/*  protegido: exige un JWT válido (Authorization: Bearer <token>).
- /health          público.
"""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analisis, auth
from app.core.config import CORS_ORIGINS
from app.core.security import get_current_user
from app.database import Base, engine
from app.models import calidad, usuario  # Importamos los modelos para que SQLAlchemy los detecte

# En desarrollo: crea las tablas si no existen. En producción se usa Alembic.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SoftQuality API",
    description="Plataforma para evaluar calidad de software bajo ISO/IEC 25010 y CMMI.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # configurable con CORS_ORIGINS en .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(
    analisis.router,
    prefix="/api/analisis",
    tags=["Análisis"],
    dependencies=[Depends(get_current_user)],  # todo /api/analisis/* exige sesión
)


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}
