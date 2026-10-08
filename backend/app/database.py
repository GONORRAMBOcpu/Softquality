"""
Configuración de base de datos (PostgreSQL + SQLAlchemy).
Stack oficial: sección 5 del prompt maestro SoftQuality.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv(override=False)  # .env local; no pisa DATABASE_URL inyectada por Docker

# En producción esto viene de variables de entorno (docker-compose.yml los inyecta)
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://softquality_user:softquality_pass@localhost:5432/softquality_db",
)

# Dentro de Compose el host de Postgres es el servicio "db", no localhost.
if os.getenv("RUNNING_IN_DOCKER", "").lower() == "true":
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "@localhost:", "@db:"
    ).replace("@127.0.0.1:", "@db:")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency de FastAPI: entrega una sesión de DB y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
