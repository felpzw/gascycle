"""Módulo 3 — Atuador mecânico (sistema fechado).

Expansão/compressão de um gás em conjunto pistão-cilindro. 1ª Lei para sistema
fechado:

    Q - W = ΔU = m (u_2 - u_1)
    W_12 = ∫_{V1}^{V2} P dV

O processo é controlado pela razão de volumes r = V_2 / V_1 (r > 1: expansão).
Três caminhos são suportados:

- Isobárica (P = C):      W = P (V_2 - V_1)
- Isotérmica (T = C):     ideal -> W = P_1 V_1 ln(V_2/V_1)
                          real  -> W = ∫ P(T_1, V) dV  (SciPy, integração numérica)
- Politrópica (P V^n = C): W = (P_2 V_2 - P_1 V_1) / (1 - n)

Tudo em unidades SI (Pa, K, m³, kg, J).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from math import log

from scipy.integrate import quad

from app.core import properties as props
from app.core.properties import PropertyModel


class Process(str, Enum):
    ISOBARIC = "isobaric"
    ISOTHERMAL = "isothermal"
    POLYTROPIC = "polytropic"


@dataclass(frozen=True)
class ActuatorResult:
    model: PropertyModel
    fluid: str
    process: Process
    mass: float  # kg
    V1: float  # m³
    V2: float  # m³
    P1: float  # Pa
    P2: float  # Pa
    T1: float  # K
    T2: float  # K
    work: float  # J (∫P dV, + = realizado pelo gás)
    delta_U: float  # J
    heat: float  # J
    path: list[tuple[float, float]]  # caminho P-v: (v [m³/kg], P [Pa])


def run(
    fluid: str,
    mass: float,
    P1: float,
    T1: float,
    process: Process,
    ratio: float,
    n: float | None = None,
    model: PropertyModel = PropertyModel.REAL,
) -> ActuatorResult:
    """Resolve o processo do atuador. Entradas/saídas em SI."""
    if mass <= 0.0:
        raise ValueError("Massa deve ser positiva.")
    if ratio <= 0.0:
        raise ValueError("Razão de volumes deve ser positiva.")
    if process is Process.POLYTROPIC:
        if n is None:
            raise ValueError("Expoente politrópico n é obrigatório.")
        if abs(n - 1.0) < 1e-9:
            raise ValueError("Para n = 1 use o processo isotérmico.")

    state1 = props.state_from_PT(fluid, P1, T1, model)
    V1 = mass * state1.v
    V2 = ratio * V1
    v2 = V2 / mass

    if model is PropertyModel.IDEAL:
        P2, T2, work, delta_U = _ideal(fluid, mass, P1, T1, V1, V2, process, n)
    else:
        P2, T2, u2, work = _real(fluid, mass, P1, T1, state1.rho, V1, V2, v2, process, n)
        delta_U = mass * (u2 - state1.u)

    heat = delta_U + work  # Q = ΔU + W
    path = _path(fluid, mass, P1, T1, V1, V2, P2, process, n, model)

    return ActuatorResult(
        model=model,
        fluid=fluid,
        process=process,
        mass=mass,
        V1=V1,
        V2=V2,
        P1=P1,
        P2=P2,
        T1=T1,
        T2=T2,
        work=work,
        delta_U=delta_U,
        heat=heat,
        path=path,
    )


def _path(
    fluid: str,
    mass: float,
    P1: float,
    T1: float,
    V1: float,
    V2: float,
    P2: float,
    process: Process,
    n: float | None,
    model: PropertyModel,
    n_points: int = 60,
) -> list[tuple[float, float]]:
    """Caminho P-v do processo: lista de (v [m³/kg], P [Pa]) de V1 a V2."""
    points: list[tuple[float, float]] = []
    for i in range(n_points):
        V = V1 + (V2 - V1) * i / (n_points - 1)
        v = V / mass
        if process is Process.ISOBARIC:
            P = P1
        elif process is Process.ISOTHERMAL:
            if model is PropertyModel.REAL:
                P = props.coolprop("P", "T", T1, "D", mass / V, fluid)
            else:
                P = P1 * V1 / V  # PV = C
        else:  # POLYTROPIC: P V^n = C (vale para ambos os modelos)
            assert n is not None
            P = P1 * (V1 / V) ** n
        points.append((v, P))
    return points


def _ideal(
    fluid: str,
    mass: float,
    P1: float,
    T1: float,
    V1: float,
    V2: float,
    process: Process,
    n: float | None,
) -> tuple[float, float, float, float]:
    """Retorna (P2, T2, W, ΔU) para gás ideal com calores específicos
    constantes (cp, cv avaliados na temperatura de entrada T1)."""
    R = props.gas_constant(fluid)
    cv = props.cp0(fluid, T1) - R  # cv = cp - R (relação de Mayer)
    if process is Process.ISOBARIC:
        P2 = P1
        T2 = T1 * (V2 / V1)  # P const => V/T const
        work = P1 * (V2 - V1)
    elif process is Process.ISOTHERMAL:
        T2 = T1
        P2 = P1 * (V1 / V2)  # PV = C
        work = P1 * V1 * log(V2 / V1)
    else:  # POLYTROPIC
        assert n is not None
        P2 = P1 * (V1 / V2) ** n  # P V^n = C
        T2 = T1 * (V1 / V2) ** (n - 1.0)
        work = (P2 * V2 - P1 * V1) / (1.0 - n)
    delta_U = mass * cv * (T2 - T1)  # ΔU = m cv ΔT
    return P2, T2, work, delta_U


def _real(
    fluid: str,
    mass: float,
    P1: float,
    T1: float,
    rho1: float,
    V1: float,
    V2: float,
    v2: float,
    process: Process,
    n: float | None,
) -> tuple[float, float, float, float]:
    """Retorna (P2, T2, u2, W) para gás real (CoolProp)."""
    rho2 = 1.0 / v2
    if process is Process.ISOBARIC:
        P2 = P1
        T2 = props.coolprop("T", "P", P2, "D", rho2, fluid)
        u2 = props.coolprop("U", "P", P2, "D", rho2, fluid)
        work = P1 * (V2 - V1)
    elif process is Process.ISOTHERMAL:
        T2 = T1
        P2 = props.coolprop("P", "T", T1, "D", rho2, fluid)
        u2 = props.coolprop("U", "T", T1, "D", rho2, fluid)
        # W = ∫ P dV ao longo da isoterma real (P depende de V via ρ = m/V).
        def pressure_of_V(V: float) -> float:
            return props.coolprop("P", "T", T1, "D", mass / V, fluid)

        work, _ = quad(pressure_of_V, V1, V2)
    else:  # POLYTROPIC — o caminho P V^n = C define P2; o estado vem de (P2, ρ2).
        assert n is not None
        P2 = P1 * (V1 / V2) ** n
        T2 = props.coolprop("T", "P", P2, "D", rho2, fluid)
        u2 = props.coolprop("U", "P", P2, "D", rho2, fluid)
        work = (P2 * V2 - P1 * V1) / (1.0 - n)
    return P2, T2, u2, work
