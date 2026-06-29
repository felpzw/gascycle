"""Módulo 1 — Compressão (volume de controle, regime permanente).

Balanço de massa e energia (1ª Lei) em um compressor adiabático:

    ṁ_e = ṁ_s = ṁ
    Ẇ_eixo = ṁ (h_e - h_s)         (negativo: trabalho fornecido ao fluido)

O processo real é referenciado ao isentrópico pela eficiência isentrópica:

    η_s = (h_2s - h_1) / (h_2 - h_1)

Tudo em unidades SI. A conversão para unidades de engenharia fica nas schemas.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core import properties as props
from app.core.properties import PropertyModel


@dataclass(frozen=True)
class CompressionResult:
    model: PropertyModel
    fluid: str
    # estados (SI)
    T_in: float  # K
    T_out: float  # K
    T_out_isentropic: float  # K
    h_in: float  # J/kg
    h_out: float  # J/kg
    # desempenho
    delta_h: float  # J/kg (real)
    delta_h_isentropic: float  # J/kg
    specific_work: float  # J/kg (trabalho fornecido ao fluido, positivo)
    power: float  # W (potência de eixo requerida, positiva)
    # entropia (para o diagrama T-s)
    s_in: float  # J/kg·K
    s_out: float  # J/kg·K (estado real de saída)


def compress(
    fluid: str,
    P_in: float,
    T_in: float,
    P_out: float,
    mass_flow: float,
    eta_isen: float,
    model: PropertyModel = PropertyModel.REAL,
) -> CompressionResult:
    """Resolve a compressão. Entradas/saídas em SI (Pa, K, kg/s, J, W)."""
    if P_out <= P_in:
        raise ValueError("P_out deve ser maior que P_in para compressão.")
    if not (0.0 < eta_isen <= 1.0):
        raise ValueError("Eficiência isentrópica deve estar em (0, 1].")
    if mass_flow <= 0.0:
        raise ValueError("Vazão mássica deve ser positiva.")

    state1 = props.state_from_PT(fluid, P_in, T_in, model)

    if model is PropertyModel.REAL:
        h2s = props.enthalpy_from_Ps(fluid, P_out, state1.s, model)
        dh_s = h2s - state1.h
        h2 = state1.h + dh_s / eta_isen
        T2 = props.temperature_from_Ph(fluid, P_out, h2, model)
        T2s = props.temperature_from_Ph(fluid, P_out, h2s, model)
        s2 = props.coolprop("S", "P", P_out, "H", h2, fluid)
    else:
        # Gás ideal: relação isentrópica de gás perfeito.
        cp = props.cp0(fluid, T_in)
        R = props.gas_constant(fluid)
        k = cp / (cp - R)
        T2s = T_in * (P_out / P_in) ** ((k - 1.0) / k)
        dh_s = cp * (T2s - T_in)
        dh = dh_s / eta_isen
        T2 = T_in + dh / cp
        h2 = state1.h + dh
        # Δs de gás ideal entre estados real de saída e entrada.
        from math import log

        s2 = state1.s + cp * log(T2 / T_in) - R * log(P_out / P_in)

    dh = h2 - state1.h
    power = mass_flow * dh  # W (positivo = potência requerida)

    return CompressionResult(
        model=model,
        fluid=fluid,
        T_in=T_in,
        T_out=T2,
        T_out_isentropic=T2s,
        h_in=state1.h,
        h_out=h2,
        delta_h=dh,
        delta_h_isentropic=dh_s,
        specific_work=dh,
        power=power,
        s_in=state1.s,
        s_out=s2,
    )
