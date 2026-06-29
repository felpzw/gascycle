"""Endpoints de apoio aos diagramas (curva de saturação)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core import properties as props
from app.core.properties import SUPPORTED_FLUIDS
from app.schemas.compression import KELVIN

router = APIRouter(prefix="/api/diagrams", tags=["diagrams"])


class DomePoint(BaseModel):
    x: float
    y: float


class SaturationResponse(BaseModel):
    fluid: str
    diagram: str
    liquid: list[DomePoint]
    vapor: list[DomePoint]


@router.get("/saturation", response_model=SaturationResponse)
def saturation(fluid: str, diagram: str = "pv") -> SaturationResponse:
    """Curva de saturação (domo) para sobrepor aos diagramas P-v ou T-s.

    diagram="pv": x = v [m³/kg], y = P [kPa].
    diagram="ts": x = s [kJ/kg·K], y = T [°C].
    Fluidos sem domo bem definido retornam listas vazias (sem erro).
    """
    if fluid not in SUPPORTED_FLUIDS:
        raise HTTPException(status_code=422, detail=f"Fluido '{fluid}' não suportado.")
    if diagram not in ("pv", "ts"):
        raise HTTPException(status_code=422, detail="diagram deve ser 'pv' ou 'ts'.")

    liquid_si, vapor_si = props.saturation_dome(fluid, diagram)

    if diagram == "pv":
        # (v [m³/kg], P [Pa]) -> (v, P em kPa)
        to_point = lambda x, y: DomePoint(x=x, y=y / 1000.0)
    else:
        # (s [J/kg·K], T [K]) -> (s em kJ/kg·K, T em °C)
        to_point = lambda x, y: DomePoint(x=x / 1000.0, y=y - KELVIN)

    return SaturationResponse(
        fluid=fluid,
        diagram=diagram,
        liquid=[to_point(x, y) for x, y in liquid_si],
        vapor=[to_point(x, y) for x, y in vapor_si],
    )
