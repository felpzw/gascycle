"""Camada de propriedades termodinâmicas.

Unifica dois modelos sob a mesma interface, trabalhando sempre em **unidades SI**
(Pa, K, J/kg, J/kg·K):

- ``ideal``: gás ideal com calor específico ``cp0`` (ideal-gas) avaliado pela
  CoolProp. Usa as relações isentrópicas de gás perfeito.
- ``real``: equação de estado real da CoolProp (CoolProp.PropsSI).

A camada expõe apenas o necessário para os módulos de cálculo: estado a partir
de (P, T), entalpia isentrópica a partir de (P, s) e temperatura a partir de
(P, h).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from CoolProp.CoolProp import PropsSI

R_UNIVERSAL = 8.314462618  # J/mol·K

# Fluidos expostos pela API (rótulo amigável -> nome CoolProp).
SUPPORTED_FLUIDS: dict[str, str] = {
    "R134a": "R134a",
    "Ammonia": "Ammonia",
    "CO2": "CO2",
    "Nitrogen": "Nitrogen",
    "Air": "Air",
    "Water": "Water",
}


class PropertyModel(str, Enum):
    IDEAL = "ideal"
    REAL = "real"


@dataclass(frozen=True)
class State:
    """Estado termodinâmico em unidades SI."""

    fluid: str
    P: float  # Pa
    T: float  # K
    h: float  # J/kg
    s: float  # J/kg·K
    u: float  # J/kg (energia interna específica)
    rho: float  # kg/m³ (massa específica)

    @property
    def v(self) -> float:
        """Volume específico [m³/kg]."""
        return 1.0 / self.rho


def _coolprop_name(fluid: str) -> str:
    try:
        return SUPPORTED_FLUIDS[fluid]
    except KeyError as exc:
        raise ValueError(
            f"Fluido '{fluid}' não suportado. Opções: {', '.join(SUPPORTED_FLUIDS)}"
        ) from exc


def gas_constant(fluid: str) -> float:
    """Constante específica do gás R = R_universal / M  [J/kg·K]."""
    name = _coolprop_name(fluid)
    molar_mass = PropsSI("M", name)  # kg/mol
    return R_UNIVERSAL / molar_mass


def temperature_bounds(fluid: str) -> tuple[float, float]:
    """Faixa de temperatura válida do fluido na CoolProp [K]."""
    name = _coolprop_name(fluid)
    return PropsSI("Tmin", name), PropsSI("Tmax", name)


def critical_pressure(fluid: str) -> float:
    """Pressão crítica do fluido [Pa]."""
    return PropsSI("Pcrit", _coolprop_name(fluid))


def saturation_temperature(fluid: str, P: float) -> float:
    """Temperatura de saturação à pressão P (vapor saturado) [K]."""
    return PropsSI("T", "P", P, "Q", 1, _coolprop_name(fluid))


def cp0(fluid: str, T: float) -> float:
    """Calor específico de gás ideal cp0(T)  [J/kg·K]."""
    name = _coolprop_name(fluid)
    # Pressão de referência irrelevante para cp0 (propriedade de gás ideal).
    return PropsSI("Cp0mass", "T", T, "P", 101325.0, name)


def coolprop(output: str, n1: str, v1: float, n2: str, v2: float, fluid: str) -> float:
    """Acesso direto à CoolProp.PropsSI com validação do fluido.

    Útil para pares de estado baseados em massa específica (P-D, T-D), que são
    robustos inclusive na região bifásica — usados pelo motor do Módulo 3.
    """
    return PropsSI(output, n1, v1, n2, v2, _coolprop_name(fluid))


def state_from_PT(fluid: str, P: float, T: float, model: PropertyModel) -> State:
    """Estado completo a partir de pressão e temperatura."""
    name = _coolprop_name(fluid)
    if model is PropertyModel.REAL:
        h = PropsSI("H", "P", P, "T", T, name)
        s = PropsSI("S", "P", P, "T", T, name)
        u = PropsSI("U", "P", P, "T", T, name)
        rho = PropsSI("D", "P", P, "T", T, name)
        return State(fluid=fluid, P=P, T=T, h=h, s=s, u=u, rho=rho)

    # Gás ideal: h, u e s relativos a um estado de referência (T_ref, P_ref).
    # Os módulos usam apenas diferenças, então a referência se cancela.
    cp = cp0(fluid, T)
    R = gas_constant(fluid)
    T_ref, P_ref = 298.15, 101325.0
    h = cp * (T - T_ref)
    s = cp * _log(T / T_ref) - R * _log(P / P_ref)
    rho = P / (R * T)  # Pv = RT
    u = h - R * T  # h = u + Pv = u + RT
    return State(fluid=fluid, P=P, T=T, h=h, s=s, u=u, rho=rho)


def enthalpy_from_Ps(fluid: str, P: float, s: float, model: PropertyModel) -> float:
    """Entalpia [J/kg] a partir de pressão e entropia (estado isentrópico)."""
    name = _coolprop_name(fluid)
    if model is PropertyModel.REAL:
        return PropsSI("H", "P", P, "S", s, name)
    # Para gás ideal a inversão é feita pelos módulos via relação isentrópica;
    # aqui não há caminho fechado sem T. Mantido para simetria da interface.
    raise NotImplementedError("enthalpy_from_Ps não se aplica ao modelo ideal")


def temperature_from_Ph(fluid: str, P: float, h: float, model: PropertyModel) -> float:
    """Temperatura [K] a partir de pressão e entalpia."""
    name = _coolprop_name(fluid)
    if model is PropertyModel.REAL:
        return PropsSI("T", "P", P, "H", h, name)
    raise NotImplementedError("temperature_from_Ph não se aplica ao modelo ideal")


def _log(x: float) -> float:
    from math import log

    return log(x)
