# GasCycle Suite: Documentação de Produção e Especificação Técnica

O **GasCycle Suite** é uma plataforma de engenharia para simulação e dimensionamento de sistemas de compressão, armazenamento e expansão de gases. O projeto aplica os princípios da **1ª Lei da Termodinâmica** para volumes de controle (regime permanente e transiente) e sistemas fechados.

---

## 1. Arquitetura de Software (Stack Proposta)

Para garantir precisão nos cálculos e uma interface reativa, a stack recomendada é:

*   **Frontend:** React.js (TypeScript) + Vite.
    *   *Bibliotecas Visuais:* TailwindCSS (UI), Lucide-React (Ícones).
    *   *Gráficos:* Plotly.js ou Chart.js (especializados em curvas P-v e T-s).
*   **Backend:** Python (FastAPI).
    *   *Por que Python?* Acesso imediato à biblioteca **CoolProp**, que fornece propriedades reais de fluidos (entalpia, entropia, volume específico) para gases como R134a e SO2 com precisão industrial.
*   **Motor de Cálculo:** NumPy (Álgebra linear) e SciPy (Integração numérica para o regime transiente).
*   **Banco de Dados:** PostgreSQL (armazenamento de simulações e históricos de dimensionamento).

---

## 2. Modelagem Matemática e Módulos do Projeto

### Módulo 1: A Compressão (Volume de Controle em Regime Permanente)
**Foco:** Balanço de massa e energia em compressores.

*   **Hipótese:** Estado Estacionário ($\frac{dE_{vc}}{dt} = 0$).
*   **Conservação de Massa:** $\dot{m}_e = \dot{m}_s = \dot{m}$
*   **Equação de Energia (1ª Lei):**
    $$\dot{Q} - \dot{W}_{eixo} = \dot{m} \left( h_s - h_e + \frac{V_s^2 - V_e^2}{2} + g(z_s - z_e) \right)$$
    *Desprezando $\Delta EC$ e $\Delta EP$, temos:*
    $$\dot{W}_{eixo} = \dot{m}(h_e - h_s)$$
*   **Relação para Gás Ideal (Cálculo de $h$):**
    $$h_s - h_e = C_{p0}(T_s - T_e)$$

### Módulo 2: O Enchimento do Reservatório (Volume de Controle Transiente)
**Foco:** Acúmulo de massa e energia em tanque rígido.

*   **Conservação de Massa Transiente:**
    $$\frac{dm_{VC}}{dt} = \dot{m}_e - \dot{m}_s$$
*   **Conservação de Energia Transiente:**
    $$\frac{dU_{VC}}{dt} = \dot{Q} - \dot{W} + \dot{m}_e h_{tot,e} - \dot{m}_s h_{tot,s}$$
*   **O "Pulo do Gato" (Tanque Rígido):**
    Como o volume é constante, o trabalho de fronteira é zero ($W = 0$). A entalpia do fluido de entrada converte-se em energia interna acumulada:
    $$m_2 u_2 - m_1 u_1 = \int (\dot{m}_e h_e) dt + Q$$

### Módulo 3: O Atuador Mecânico (Sistema Fechado)
**Foco:** Expansão de gás para realização de trabalho.

*   **Equação da 1ª Lei:**
    $$Q - W = \Delta U = m(u_2 - u_1)$$
*   **Trabalho de Fronteira ($W_{12}$):**
    $$W_{12} = \int_{V_1}^{V_2} P \, dV$$
*   **Modelos de Expansão Implementados:**
    1.  **Isobárica ($P=C$):** $W = P(V_2 - V_1)$
    2.  **Isotérmica ($PV=C$):** $W = P_1 V_1 \ln\left(\frac{V_2}{V_1}\right)$
    3.  **Politrópica ($PV^n=C$):** $W = \frac{P_2 V_2 - P_1 V_1}{1-n}$

---

## 3. Propriedades Termodinâmicas (Implementação)

O software deve alternar entre dois modelos conforme a necessidade do usuário:

| Modelo | Uso Adequado | Fórmulas de Apoio |
| :--- | :--- | :--- |
| **Gás Ideal** | Baixas pressões / Altas temperaturas | $Pv = RT$ ; $\Delta u = C_v \Delta T$ ; $\Delta h = C_p \Delta T$ |
| **Gás Real** | Fluidos refrigerantes (R134a, Amônia) | Consultas via biblioteca CoolProp (EoS - Equation of State) |

---

## 4. Estrutura de Dados (JSON API)

Exemplo de objeto para comunicação entre o motor Python e a interface React:

```json
{
  "project_id": "gas-001",
  "fluid": "R134a",
  "module": "compression",
  "inputs": {
    "P_in": 100,
    "T_in": 25,
    "mass_flow": 0.5,
    "efficiency_isen": 0.85
  },
  "outputs": {
    "work_required": 15.4,
    "T_out": 65.2,
    "enthalpy_change": 30.8
  }
}