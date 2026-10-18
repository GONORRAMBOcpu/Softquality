"""
Rutas de autenticación (montadas bajo /api):
  POST /api/auth/registrarse  -> caso de uso: Registrarse
  POST /api/auth/login        -> caso de uso: Iniciar sesión (JSON, lo usa React)
  POST /api/auth/token        -> igual que login pero en formato OAuth2 (botón Authorize de /docs)
  GET  /api/auth/me           -> devuelve el usuario dueño del token
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    HASH_FALSO,
    crear_token_acceso,
    get_current_user,
    hash_password,
    verificar_password,
)
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import (
    TokenOut,
    UsuarioLoginRequest,
    UsuarioOut,
    UsuarioRegistroRequest,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def _buscar_por_email(db: Session, email: str) -> Usuario | None:
    # Comparación sin distinguir mayúsculas: "Ana@x.com" y "ana@x.com" son la misma cuenta
    return db.query(Usuario).filter(func.lower(Usuario.email) == email.lower()).first()


def _autenticar(db: Session, email: str, password: str) -> Usuario:
    usuario = _buscar_por_email(db, email)
    # Siempre se verifica un hash (real o de relleno) para no revelar si el correo existe
    password_ok = verificar_password(password, usuario.password_hash if usuario else HASH_FALSO)
    if usuario is None or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


def _respuesta_token(usuario: Usuario) -> TokenOut:
    return TokenOut(
        access_token=crear_token_acceso(usuario),
        usuario=UsuarioOut.model_validate(usuario),
    )


@router.post(
    "/registrarse",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario",
)
def registrarse(datos: UsuarioRegistroRequest, db: Session = Depends(get_db)):
    email = datos.email.lower()

    # 1. Validar que el email no esté ya registrado
    if _buscar_por_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con este correo.",
        )

    # 2. Crear el usuario con la contraseña hasheada (nunca en texto plano)
    nuevo_usuario = Usuario(
        nombre=datos.nombre,
        email=email,
        password_hash=hash_password(datos.password),
    )
    db.add(nuevo_usuario)
    try:
        db.commit()
    except IntegrityError:
        # Dos registros simultáneos con el mismo correo: gana el primero
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con este correo.",
        )
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.post("/login", response_model=TokenOut, summary="Iniciar sesión")
def iniciar_sesion(datos: UsuarioLoginRequest, db: Session = Depends(get_db)):
    usuario = _autenticar(db, datos.email, datos.password)
    return _respuesta_token(usuario)


@router.post("/token", response_model=TokenOut, summary="Iniciar sesión (formulario OAuth2)")
def token_oauth2(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # En OAuth2 el campo se llama "username"; aquí es el correo
    usuario = _autenticar(db, form.username, form.password)
    return _respuesta_token(usuario)


@router.get("/me", response_model=UsuarioOut, summary="Usuario de la sesión actual")
def perfil(usuario: Usuario = Depends(get_current_user)):
    return usuario
