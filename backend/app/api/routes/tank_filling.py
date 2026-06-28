"""Endpoints do Módulo 2 — Enchimento de reservatório."""

from fastapi import APIRouter, HTTPException

from app.core import tank_filling as engine
from app.schemas.compression import KELVIN
from app.schemas.tank_filling import FillingInput, FillingOutput

router = APIRouter(prefix="/api/filling", tags=["filling"])


@router.post("", response_model=FillingOutput)
def compute_filling(payload: FillingInput) -> FillingOutput:
    try:
        payload.validate_fluid()
        result = engine.fill(
            fluid=payload.fluid,
            volume=payload.volume / 1000.0,  # L -> m³
            P_initial=payload.P_initial * 1000.0,  # kPa -> Pa
            T_initial=payload.T_initial + KELVIN,  # °C -> K
            P_line=payload.P_line * 1000.0,
            T_line=payload.T_line + KELVIN,
            P_final=payload.P_final * 1000.0,
            heat=payload.heat * 1000.0,  # kJ -> J
            mass_flow_in=payload.mass_flow_in,
            model=payload.model,
        )
    except (ValueError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return FillingOutput(
        fluid=result.fluid,
        model=result.model,
        m_initial=result.m_initial,
        m_final=result.m_final,
        m_added=result.m_added,
        T_final=result.T_final - KELVIN,  # K -> °C
        u_initial=result.u_initial / 1000.0,  # J/kg -> kJ/kg
        u_final=result.u_final / 1000.0,
        fill_time=result.fill_time,
    )
