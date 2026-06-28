"""Módulo 2 — Enchimento de reservatório (volume de controle transiente).

Tanque rígido (W = 0) preenchido a partir de uma linha de alimentação em estado
constante (h_linha). Integrando os balanços transientes de massa e energia:

    dm/dt = ṁ_e            ->  m_2 - m_1 = m_e
    dU/dt = Q̇ + ṁ_e h_e   ->  m_2 u_2 - m_1 u_1 = m_e h_linha + Q

Com o volume fixo, o estado final (P_2, T_2) satisfaz simultaneamente
``m_2 = V / v_2(P_2, T_2)`` e a equação de energia acima — uma equação não
linear em T_2, resolvida por SciPy (Brent) no modelo real. No modelo de gás
ideal há solução fechada.

Tudo em unidades SI (Pa, K, m³, kg, J).
"""

from __future__ import annotations

from dataclasses import dataclass

from scipy.optimize import brentq

from app.core import properties as props
from app.core.properties import PropertyModel


@dataclass(frozen=True)
class FillingResult:
    model: PropertyModel
    fluid: str
    volume: float  # m³
    m_initial: float  # kg
    m_final: float  # kg
    m_added: float  # kg
    T_initial: float  # K
    T_final: float  # K
    u_initial: float  # J/kg
    u_final: float  # J/kg
    fill_time: float | None  # s (se vazão de entrada fornecida)


def fill(
    fluid: str,
    volume: float,
    P_initial: float,
    T_initial: float,
    P_line: float,
    T_line: float,
    P_final: float,
    heat: float = 0.0,
    mass_flow_in: float | None = None,
    model: PropertyModel = PropertyModel.REAL,
) -> FillingResult:
    """Resolve o enchimento de um tanque rígido. Entradas/saídas em SI."""
    if volume <= 0.0:
        raise ValueError("Volume deve ser positivo.")
    if P_final <= P_initial:
        raise ValueError("P_final deve ser maior que P_initial (enchimento).")
    if P_line < P_final:
        raise ValueError(
            "Pressão da linha deve ser >= P_final para empurrar massa ao tanque."
        )
    if mass_flow_in is not None and mass_flow_in <= 0.0:
        raise ValueError("Vazão de entrada deve ser positiva.")

    state1 = props.state_from_PT(fluid, P_initial, T_initial, model)
    line = props.state_from_PT(fluid, P_line, T_line, model)
    m1 = volume * state1.rho

    if model is PropertyModel.IDEAL:
        # Solução fechada: m·cv·T = P·V·cv/R (independente de T no estado final).
        R = props.gas_constant(fluid)
        cp = props.cp0(fluid, T_line)
        cv = cp - R
        # m2 - m1 = [(cv/R)·V·(P2 - P1) - Q] / (cp·T_line)
        m_added = ((cv / R) * volume * (P_final - P_initial) - heat) / (cp * T_line)
        m2 = m1 + m_added
        if m2 <= 0.0:
            raise ValueError("Massa final não-física; revise Q e as pressões.")
        T2 = P_final * volume / (R * m2)
        state2 = props.state_from_PT(fluid, P_final, T2, model)
    else:
        T2 = _solve_real_final_temperature(
            fluid, volume, P_final, m1, state1.u, line.h, heat
        )
        state2 = props.state_from_PT(fluid, P_final, T2, model)
        m2 = volume * state2.rho
        m_added = m2 - m1

    fill_time = m_added / mass_flow_in if mass_flow_in else None

    return FillingResult(
        model=model,
        fluid=fluid,
        volume=volume,
        m_initial=m1,
        m_final=m2,
        m_added=m_added,
        T_initial=T_initial,
        T_final=T2,
        u_initial=state1.u,
        u_final=state2.u,
        fill_time=fill_time,
    )


def _solve_real_final_temperature(
    fluid: str,
    volume: float,
    P_final: float,
    m1: float,
    u1: float,
    h_line: float,
    heat: float,
) -> float:
    """Acha T_2 tal que m_2 u_2 - m_1 u_1 - (m_2 - m_1) h_linha - Q = 0."""

    def residual(T2: float) -> float:
        st = props.state_from_PT(fluid, P_final, T2, PropertyModel.REAL)
        m2 = volume * st.rho
        return m2 * st.u - m1 * u1 - (m2 - m1) * h_line - heat

    # Restringe a busca à região de vapor superaquecido (estado final do gás no
    # tanque), evitando a linha de saturação onde (P, T) é degenerado.
    t_min, t_max = props.temperature_bounds(fluid)
    if P_final < props.critical_pressure(fluid):
        lo = props.saturation_temperature(fluid, P_final) + 0.5
    else:
        lo = t_min + 0.5
    hi = t_max - 0.5
    f_lo, f_hi = residual(lo), residual(hi)
    if f_lo * f_hi > 0.0:
        raise ValueError(
            "Não foi possível encontrar o estado final na faixa válida do fluido "
            "(verifique pressões, temperatura da linha e calor)."
        )
    return brentq(residual, lo, hi, xtol=1e-4, rtol=1e-8)
