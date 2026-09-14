# app/schemas/metrica.py
from pydantic import BaseModel
from typing import Optional

class MetricaCalculada(BaseModel):
    nombre_metrica: str
    valor: float
    unidad: str
    caracteristica_iso_sugerida: str 
    descripcion: Optional[str] = None