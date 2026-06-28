"""Schemas de entrada/saída do Módulo 1 (Compressão).

Unidades de engenharia na fronteira da API:
- Pressão: kPa
- Temperatura: °C
- Vazão mássica: kg/s
- Potência: kW
- Entalpia / trabalho específico: kJ/kg
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.properties import PropertyModel, SUPPORTED_FLUIDS

KELVIN = 273.15


class CompressionInput(BaseModel):
    fluid: str = Field(..., examples=["R134a"])
    model: PropertyModel = PropertyModel.REAL
    P_in: float = Field(..., gt=0, description="Pressão de entrada [kPa]")
    T_in: float = Field(..., description="Temperatura de entrada [°C]")
    P_out: float = Field(..., gt=0, description="Pressão de saída [kPa]")
    mass_flow: float = Field(..., gt=0, description="Vazão mássica [kg/s]")
    efficiency_isen: float = Field(
        0.85, gt=0, le=1, description="Eficiência isentrópica (0-1]"
    )

    def validate_fluid(self) -> None:
        if self.fluid not in SUPPORTED_FLUIDS:
            raise ValueError(
                f"Fluido '{self.fluid}' não suportado. "
                f"Opções: {', '.join(SUPPORTED_FLUIDS)}"
            )


class CompressionOutput(BaseModel):
    fluid: str
    model: PropertyModel
    power_required: float = Field(..., description="Potência de eixo requerida [kW]")
    work_specific: float = Field(..., description="Trabalho específico real [kJ/kg]")
    T_out: float = Field(..., description="Temperatura real de saída [°C]")
    T_out_isentropic: float = Field(..., description="Temperatura isentrópica [°C]")
    enthalpy_change: float = Field(..., description="Δh real [kJ/kg]")
    enthalpy_change_isentropic: float = Field(..., description="Δh isentrópico [kJ/kg]")


class FluidsResponse(BaseModel):
    fluids: list[str]
