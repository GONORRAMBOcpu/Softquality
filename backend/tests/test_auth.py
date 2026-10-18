"""
Pruebas de Registrarse / Iniciar sesión. Corren sin PostgreSQL (usan SQLite en memoria).
Ejecutar desde backend/:   pytest -q
"""
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("SECRET_KEY", "clave-solo-para-pruebas-" + "x" * 40)
os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import auth
from app.core.config import ALGORITHM, SECRET_KEY
from app.core.security import get_current_user
from app.database import get_db
from app.models.usuario import Usuario

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
Sesion = sessionmaker(bind=engine, autoflush=False, autocommit=False)

app = FastAPI()
app.include_router(auth.router, prefix="/api")


@app.get("/protegida")
def protegida(u: Usuario = Depends(get_current_user)):
    return {"email": u.email}


def _get_db_prueba():
    db = Sesion()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _get_db_prueba


@pytest.fixture()
def cliente():
    Usuario.__table__.create(bind=engine)
    yield TestClient(app)
    Usuario.__table__.drop(bind=engine)


DATOS = {"nombre": "Ana Pérez", "email": "ana@correo.edu.co", "password": "Segura1234"}


def registrar(c, **cambios):
    return c.post("/api/auth/registrarse", json={**DATOS, **cambios})


def login(c, email=DATOS["email"], password=DATOS["password"]):
    return c.post("/api/auth/login", json={"email": email, "password": password})


def test_registro_ok_no_expone_hash(cliente):
    r = registrar(cliente)
    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["email"] == DATOS["email"] and cuerpo["rol"] == "usuario"
    assert "password" not in cuerpo and "password_hash" not in cuerpo


def test_registro_correo_duplicado_ignora_mayusculas(cliente):
    assert registrar(cliente).status_code == 201
    assert registrar(cliente, email="ANA@correo.edu.co").status_code == 409


def test_registro_valida_datos(cliente):
    assert registrar(cliente, password="corta").status_code == 422
    assert registrar(cliente, email="no-es-correo").status_code == 422
    assert registrar(cliente, password="é" * 40).status_code == 422  # 80 bytes > 72


def test_login_ok_devuelve_token_y_usuario(cliente):
    registrar(cliente)
    r = login(cliente)
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["token_type"] == "bearer" and cuerpo["access_token"]
    assert cuerpo["usuario"]["email"] == DATOS["email"]


def test_login_es_insensible_a_mayusculas_en_el_correo(cliente):
    registrar(cliente)
    assert login(cliente, email="Ana@Correo.edu.co").status_code == 200


def test_login_error_es_identico_para_clave_mala_y_correo_inexistente(cliente):
    registrar(cliente)
    mala = login(cliente, password="OtraClave999")
    inexistente = login(cliente, email="nadie@correo.edu.co")
    assert mala.status_code == inexistente.status_code == 401
    assert mala.json() == inexistente.json()


def test_me_con_token_valido(cliente):
    registrar(cliente)
    token = login(cliente).json()["access_token"]
    r = cliente.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200 and r.json()["email"] == DATOS["email"]


def test_rutas_protegidas_exigen_token(cliente):
    assert cliente.get("/protegida").status_code == 401
    assert cliente.get("/api/auth/me").status_code == 401
    r = cliente.get("/protegida", headers={"Authorization": "Bearer basura"})
    assert r.status_code == 401


def test_token_alterado_o_firmado_con_otra_clave_es_rechazado(cliente):
    registrar(cliente)
    token = login(cliente).json()["access_token"]
    id_usuario = jwt.get_unverified_claims(token)["sub"]
    falso = jwt.encode({"sub": id_usuario}, "otra-clave-" + "y" * 40, algorithm=ALGORITHM)
    assert cliente.get("/protegida", headers={"Authorization": f"Bearer {falso}"}).status_code == 401


def test_token_expirado_es_rechazado(cliente):
    registrar(cliente)
    id_usuario = login(cliente).json()["usuario"]["id"]
    vencido = jwt.encode(
        {"sub": id_usuario, "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    assert cliente.get("/protegida", headers={"Authorization": f"Bearer {vencido}"}).status_code == 401


def test_endpoint_oauth2_para_swagger(cliente):
    registrar(cliente)
    r = cliente.post("/api/auth/token", data={"username": DATOS["email"], "password": DATOS["password"]})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert cliente.get("/protegida", headers={"Authorization": f"Bearer {token}"}).status_code == 200
