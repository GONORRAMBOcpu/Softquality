"""
Ruta: /auth/registrarse
Caso de uso (diagrama, sección 3): Registrarse
Incluye únicamente lógica de registro. Iniciar sesión (login + emisión de JWT)
se implementa como su propio caso de uso, en este mismo router, más adelante.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioRegistroRequest, UsuarioOut
from app.core.security import hash_password

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post(
    "/registrarse",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario",
)
def registrarse(datos: UsuarioRegistroRequest, db: Session = Depends(get_db)):
    # 1. Validar que el email no esté ya registrado
    ya_existe = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if ya_existe:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con este correo.",
        )

    # 2. Crear el usuario con la contraseña hasheada (nunca en texto plano)
    nuevo_usuario = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hash_password(datos.password),
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario
