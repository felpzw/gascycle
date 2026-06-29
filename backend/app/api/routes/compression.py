"""Endpoints do Módulo 1 — Compressão."""

from fastapi import APIRouter, HTTPException

from app.core import compression as engine
from app.core.properties import SUPPORTED_FLUIDS
from app.schemas.compression import (
    CompressionInput,
    CompressionOutput,
    FluidsResponse,
    KELVIN,
    TsPoint,
)

router = APIRouter(prefix="/api/compression", tags=["compression"])


@router.get("/fluids", response_model=FluidsResponse)
def list_fluids() -> FluidsResponse:
    """Lista de fluidos suportados pelo motor de cálculo."""
    return FluidsResponse(fluids=list(SUPPORTED_FLUIDS))


@router.post("", response_model=CompressionOutput)
def compute_compression(payload: CompressionInput) -> CompressionOutput:
    try:
        payload.validate_fluid()
        result = engine.compress(
            fluid=payload.fluid,
            P_in=payload.P_in * 1000.0,  # kPa -> Pa
            T_in=payload.T_in + KELVIN,  # °C -> K
            P_out=payload.P_out * 1000.0,  # kPa -> Pa
            mass_flow=payload.mass_flow,
            eta_isen=payload.efficiency_isen,
            model=payload.model,
        )
    except (ValueError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    s_in = result.s_in / 1000.0  # J/kg·K -> kJ/kg·K
    s_out = result.s_out / 1000.0
    return CompressionOutput(
        fluid=result.fluid,
        model=result.model,
        power_required=result.power / 1000.0,  # W -> kW
        work_specific=result.specific_work / 1000.0,  # J/kg -> kJ/kg
        T_out=result.T_out - KELVIN,  # K -> °C
        T_out_isentropic=result.T_out_isentropic - KELVIN,
        enthalpy_change=result.delta_h / 1000.0,
        enthalpy_change_isentropic=result.delta_h_isentropic / 1000.0,
        ts_diagram=[
            TsPoint(label="1 (entrada)", s=s_in, T=result.T_in - KELVIN),
            TsPoint(label="2s (isentrópico)", s=s_in, T=result.T_out_isentropic - KELVIN),
            TsPoint(label="2 (real)", s=s_out, T=result.T_out - KELVIN),
        ],
    )
