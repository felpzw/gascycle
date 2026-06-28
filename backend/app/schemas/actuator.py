"""Schemas de entrada/saída do Módulo 3 (Atuador mecânico).

Unidades de engenharia na fronteira da API:
- Pressão: kPa · Temperatura: °C · Massa: kg · Volume: L
- Trabalho / energia / calor: kJ
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.actuator import Process
from app.core.properties import PropertyModel, SUPPORTED_FLUIDS


class ActuatorInput(BaseModel):
    fluid: str = Field(..., examples=["Air"])
    model: PropertyModel = PropertyModel.REAL
    mass: float = Field(..., gt=0, description="Massa de gás [kg]")
    P1: float = Field(..., gt=0, description="Pressão inicial [kPa]")
    T1: float = Field(..., description="Temperatura inicial [°C]")
    process: Process = Field(..., description="Tipo de processo")
    ratio: float = Field(
        ..., gt=0, description="Razão de volumes V2/V1 (>1 expansão)"
    )
    polytropic_n: float | None = Field(
        None, description="Expoente politrópico n (obrigatório p/ politrópica)"
    )

    def validate_fluid(self) -> None:
        if self.fluid not in SUPPORTED_FLUIDS:
            raise ValueError(
                f"Fluido '{self.fluid}' não suportado. "
                f"Opções: {', '.join(SUPPORTED_FLUIDS)}"
            )


class ActuatorOutput(BaseModel):
    fluid: str
    model: PropertyModel
    process: Process
    V1: float = Field(..., description="Volume inicial [L]")
    V2: float = Field(..., description="Volume final [L]")
    P2: float = Field(..., description="Pressão final [kPa]")
    T2: float = Field(..., description="Temperatura final [°C]")
    work: float = Field(..., description="Trabalho de fronteira ∫P dV [kJ]")
    delta_U: float = Field(..., description="Variação de energia interna [kJ]")
    heat: float = Field(..., description="Calor trocado Q [kJ]")
