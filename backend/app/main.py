"""
Entrypoint de SoftQuality API.
Por ahora solo registra el router de autenticación (caso de uso: Registrarse).
Los routers de Subir Proyecto, Verificar proyecto, etc. se agregan como módulos
independientes (regla 2 del prompt maestro), cada uno en su propio archivo.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import analisis
from app.database import Base, engine
from app.models import calidad, usuario # Importamos los modelos para que SQLAlchemy los detecte
from app.api.routes import auth

# En desarrollo: crea las tablas si no existen. En producción se usa Alembic.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SoftQuality API",
    description="Plataforma para evaluar calidad de software bajo ISO/IEC 25010 y CMMI.",
    version="0.1.0",
    
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend Vite en desarrollo
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(analisis.router, prefix="/api/analisis", tags=["Análisis"])


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}
