"""Endpoints do Módulo 3 — Atuador mecânico."""

from fastapi import APIRouter, HTTPException

from app.core import actuator as engine
from app.schemas.actuator import ActuatorInput, ActuatorOutput
from app.schemas.compression import KELVIN

router = APIRouter(prefix="/api/actuator", tags=["actuator"])


@router.post("", response_model=ActuatorOutput)
def compute_actuator(payload: ActuatorInput) -> ActuatorOutput:
    try:
        payload.validate_fluid()
        result = engine.run(
            fluid=payload.fluid,
            mass=payload.mass,
            P1=payload.P1 * 1000.0,  # kPa -> Pa
            T1=payload.T1 + KELVIN,  # °C -> K
            process=payload.process,
            ratio=payload.ratio,
            n=payload.polytropic_n,
            model=payload.model,
        )
    except (ValueError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ActuatorOutput(
        fluid=result.fluid,
        model=result.model,
        process=result.process,
        V1=result.V1 * 1000.0,  # m³ -> L
        V2=result.V2 * 1000.0,
        P2=result.P2 / 1000.0,  # Pa -> kPa
        T2=result.T2 - KELVIN,  # K -> °C
        work=result.work / 1000.0,  # J -> kJ
        delta_U=result.delta_U / 1000.0,
        heat=result.heat / 1000.0,
    )
