"""Schemas de entrada/saída do Módulo 2 (Enchimento de reservatório).

Unidades de engenharia na fronteira da API:
- Pressão: kPa · Temperatura: °C · Volume: L · Calor: kJ
- Massa: kg · Vazão: kg/s · Energia interna: kJ/kg
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.properties import PropertyModel, SUPPORTED_FLUIDS


class FillingInput(BaseModel):
    fluid: str = Field(..., examples=["R134a"])
    model: PropertyModel = PropertyModel.REAL
    volume: float = Field(..., gt=0, description="Volume do tanque [L]")
    P_initial: float = Field(..., gt=0, description="Pressão inicial no tanque [kPa]")
    T_initial: float = Field(..., description="Temperatura inicial no tanque [°C]")
    P_line: float = Field(..., gt=0, description="Pressão da linha de alimentação [kPa]")
    T_line: float = Field(..., description="Temperatura da linha [°C]")
    P_final: float = Field(..., gt=0, description="Pressão final desejada [kPa]")
    heat: float = Field(0.0, description="Calor trocado com o tanque [kJ] (+entra)")
    mass_flow_in: float | None = Field(
        None, gt=0, description="Vazão de entrada [kg/s] (opcional, p/ tempo)"
    )

    def validate_fluid(self) -> None:
        if self.fluid not in SUPPORTED_FLUIDS:
            raise ValueError(
                f"Fluido '{self.fluid}' não suportado. "
                f"Opções: {', '.join(SUPPORTED_FLUIDS)}"
            )


class FillingOutput(BaseModel):
    fluid: str
    model: PropertyModel
    m_initial: float = Field(..., description="Massa inicial [kg]")
    m_final: float = Field(..., description="Massa final [kg]")
    m_added: float = Field(..., description="Massa adicionada [kg]")
    T_final: float = Field(..., description="Temperatura final [°C]")
    u_initial: float = Field(..., description="Energia interna inicial [kJ/kg]")
    u_final: float = Field(..., description="Energia interna final [kJ/kg]")
    fill_time: float | None = Field(None, description="Tempo de enchimento [s]")
