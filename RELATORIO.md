# GasCycle Suite — Relatório Técnico Final

**Plataforma computacional para simulação e dimensionamento de sistemas de compressão, armazenamento e expansão de gases via 1ª Lei da Termodinâmica**

Trabalho P2 — Fenômenos de Transporte — Universidade Federal de Santa Catarina (UFSC)

> Este documento consolida a fundamentação teórica, a metodologia numérica, a
> arquitetura de software e os resultados de validação do projeto. Foi redigido
> de forma a ser diretamente reaproveitável na elaboração de um artigo em LaTeX:
> as equações estão em notação matemática, os métodos numéricos estão descritos
> com suas hipóteses, e os resultados estão tabelados com casos reprodutíveis.

---

## Resumo

O **GasCycle Suite** é uma aplicação web full-stack que resolve três classes
canônicas de problemas da Primeira Lei da Termodinâmica: (i) o balanço de energia
em compressores (volume de controle em regime permanente), (ii) o enchimento de
reservatórios rígidos (volume de controle transiente) e (iii) a expansão de gases
em sistemas fechados (atuador pistão-cilindro). Cada módulo pode operar sob o
modelo de **gás ideal** (calores específicos constantes) ou de **gás real**, este
último usando a biblioteca CoolProp para avaliação de propriedades por equações de
estado. Métodos numéricos da SciPy são empregados onde não há solução analítica:
busca de raiz (Brent) para o estado final do enchimento de gás real e quadratura
adaptativa para o trabalho na expansão isotérmica de gás real. A corretude do
motor de cálculo foi verificada contra soluções analíticas clássicas, obtendo-se
fechamento da Primeira Lei na ordem de $10^{-11}$ e concordância de $0{,}0025\%$
entre os modelos real e ideal no limite de baixa pressão.

**Palavras-chave:** Primeira Lei da Termodinâmica; volume de controle; gás real;
CoolProp; FastAPI; métodos numéricos.

---

## 1. Introdução e Objetivos

O dimensionamento de sistemas térmicos exige a aplicação sistemática dos balanços
de massa e energia. Embora as formulações sejam consolidadas, sua aplicação manual
é trabalhosa e propensa a erros, especialmente quando se deseja contrastar a
hipótese de gás ideal com o comportamento de gás real de fluidos refrigerantes.

O objetivo do projeto é fornecer uma ferramenta interativa que:

1. resolva os três módulos termodinâmicos com rigor de engenharia;
2. permita alternar entre os modelos de gás ideal e gás real;
3. exponha um motor de cálculo reutilizável através de uma API REST;
4. apresente uma interface reativa para exploração de cenários.

---

## 2. Arquitetura de Software

A aplicação adota arquitetura cliente-servidor em monorepo, com separação estrita
entre o motor de cálculo (backend) e a interface (frontend).

| Camada | Tecnologia | Função |
| :--- | :--- | :--- |
| Frontend | React 19 + TypeScript + Vite | Interface reativa (SPA) |
| Estilo | TailwindCSS v4 | Sistema de design utilitário |
| Comunicação | Axios + proxy do Vite | Cliente HTTP `/api → :8000` |
| Backend | FastAPI (Python 3.12) | API REST e orquestração |
| Propriedades | CoolProp 6.7.0 | Equações de estado (gás real) |
| Numérico | NumPy 2.2.1 / SciPy 1.15.0 | Raiz e quadratura |

```
gascycle/
├── backend/
│   └── app/
│       ├── main.py            # FastAPI + CORS + routers
│       ├── core/              # MOTOR DE CÁLCULO
│       │   ├── properties.py  # camada de propriedades (ideal | real)
│       │   ├── compression.py # Módulo 1
│       │   ├── tank_filling.py# Módulo 2
│       │   └── actuator.py    # Módulo 3
│       ├── schemas/           # contratos Pydantic (validação + unidades)
│       └── api/routes/        # endpoints REST
└── frontend/
    └── src/
        ├── lib/api.ts         # cliente tipado da API
        └── components/        # simuladores por módulo
```

### 2.1 Convenção de unidades

O motor de cálculo opera **inteiramente em unidades SI** (Pa, K, m³, kg, J, W).
A conversão para unidades de engenharia (kPa, °C, L, kJ, kW) ocorre exclusivamente
na fronteira da API (camada de *schemas*), garantindo consistência dimensional
interna e evitando fatores de conversão dispersos pelo código.

---

## 3. Modelos de Propriedades Termodinâmicas

Os módulos compartilham uma camada de propriedades única com dois modelos
selecionáveis.

### 3.1 Gás ideal

Adota equação de estado $Pv = RT$ e **calores específicos constantes**, avaliados
na temperatura de referência do problema. A constante específica é obtida da massa
molar $M$ do fluido:

$$R = \frac{\bar{R}}{M}, \qquad \bar{R} = 8{,}314462618\ \text{J/(mol·K)}$$

com $c_{p0}$ fornecido pela CoolProp e $c_v$ pela relação de Mayer:

$$c_v = c_{p0} - R, \qquad k = \frac{c_{p0}}{c_v}$$

As variações de propriedade seguem:

$$\Delta h = c_{p0}\,\Delta T, \qquad \Delta u = c_v\,\Delta T$$

### 3.2 Gás real

As propriedades ($h$, $u$, $s$, $\rho$) são obtidas diretamente das equações de
estado multiparamétricas da CoolProp via `PropsSI`. Para estados próximos à linha
de saturação, empregam-se pares de entrada baseados em massa específica
($P\text{-}\rho$, $T\text{-}\rho$), numericamente robustos inclusive na região
bifásica, em substituição ao par $(P, T)$, que é degenerado sobre a saturação.

### 3.3 Fluidos suportados

R134a, Amônia (R717), CO₂ (R744), Nitrogênio, Ar e Água.

---

## 4. Modelagem Matemática dos Módulos

### 4.1 Módulo 1 — Compressão (volume de controle, regime permanente)

**Hipóteses:** estado estacionário ($dE_{vc}/dt = 0$); compressor adiabático
($\dot{Q} = 0$); variações de energia cinética e potencial desprezíveis.

**Conservação de massa:**

$$\dot{m}_e = \dot{m}_s = \dot{m}$$

**Conservação de energia (1ª Lei):**

$$\dot{W}_{eixo} = \dot{m}\,(h_e - h_s)$$

O processo real é referenciado ao isentrópico pela **eficiência isentrópica**:

$$\eta_s = \frac{h_{2s} - h_1}{h_2 - h_1}$$

de onde a entalpia de saída real e a potência requerida resultam em:

$$h_2 = h_1 + \frac{h_{2s} - h_1}{\eta_s}, \qquad \dot{W} = \dot{m}\,(h_2 - h_1)$$

No modelo de gás ideal, o estado isentrópico de saída usa a relação de gás
perfeito:

$$T_{2s} = T_1\left(\frac{P_2}{P_1}\right)^{\frac{k-1}{k}}$$

No modelo de gás real, $h_{2s}$ é obtido de $(P_2, s_1)$ via CoolProp.

### 4.2 Módulo 2 — Enchimento de reservatório (volume de controle transiente)

**Hipóteses:** tanque rígido ($W = 0$, pois não há trabalho de fronteira);
alimentação por uma linha em estado constante de entalpia $h_{linha}$; ausência de
saída ($\dot{m}_s = 0$).

**Balanços transientes de massa e energia:**

$$\frac{dm_{vc}}{dt} = \dot{m}_e, \qquad
\frac{dU_{vc}}{dt} = \dot{Q} + \dot{m}_e\,h_{linha}$$

Integrando do estado inicial (1) ao final (2) — o "pulo do gato" do tanque rígido:

$$m_2 u_2 - m_1 u_1 = (m_2 - m_1)\,h_{linha} + Q$$

Como o volume é fixo, o estado final satisfaz simultaneamente
$m_2 = V / v_2(P_2, T_2)$ e a equação de energia acima, constituindo **uma equação
não linear em $T_2$**.

**Gás ideal — solução fechada.** Com $u = c_v T$, $h = c_p T$ e $v = RT/P$, o termo
$m\,c_v T$ no estado final torna-se independente de $T_2$, levando a:

$$m_2 - m_1 = \frac{\dfrac{c_v}{R}\,V\,(P_2 - P_1) - Q}{c_p\,T_{linha}},
\qquad T_2 = \frac{P_2 V}{R\,m_2}$$

Caso particular notável (tanque evacuado, adiabático): $T_2 = k\,T_{linha}$.

**Gás real — solução numérica.** Resolve-se a raiz da função resíduo

$$f(T_2) = m_2(T_2)\,u_2(T_2) - m_1 u_1 - \big(m_2(T_2) - m_1\big)h_{linha} - Q$$

restrita à região de vapor superaquecido (limite inferior em
$T_{sat}(P_2) + 0{,}5\,\text{K}$ para $P_2 < P_{crit}$).

### 4.3 Módulo 3 — Atuador mecânico (sistema fechado)

**Hipóteses:** massa fixa de gás; processo quase-estático; o caminho do processo é
controlado pela razão de volumes $r = V_2/V_1$.

**1ª Lei para sistema fechado:**

$$Q - W = \Delta U = m\,(u_2 - u_1), \qquad W_{12} = \int_{V_1}^{V_2} P\,dV$$

**Processos implementados:**

| Processo | Restrição | Trabalho $W_{12}$ |
| :--- | :--- | :--- |
| Isobárico | $P = C$ | $P(V_2 - V_1)$ |
| Isotérmico (ideal) | $PV = C$ | $P_1 V_1 \ln(V_2/V_1)$ |
| Isotérmico (real) | $T = C$ | $\displaystyle\int_{V_1}^{V_2} P(T_1, V)\,dV$ (numérico) |
| Politrópico | $PV^n = C$ | $\dfrac{P_2 V_2 - P_1 V_1}{1 - n}$ |

Para o gás ideal, $\Delta U = m\,c_v\,(T_2 - T_1)$. Para o gás real, $u_1$ e $u_2$
vêm da CoolProp; no caso politrópico o estado final é determinado por $(P_2,
\rho_2)$, com $P_2 = P_1 (V_1/V_2)^n$.

---

## 5. Métodos Numéricos

| Método | Onde | Biblioteca | Justificativa |
| :--- | :--- | :--- | :--- |
| Brent (`brentq`) | Estado final do enchimento (gás real) | SciPy | Equação não linear $f(T_2)=0$ sem forma fechada |
| Quadratura adaptativa (`quad`) | Trabalho na isoterma real (Módulo 3) | SciPy | $PV=C$ não vale para gás real; integra-se $P(V)$ |
| Forma fechada | Enchimento e atuador (gás ideal) | — | Soluções analíticas exatas |

O integrando da expansão isotérmica real é
$P(V) = \texttt{PropsSI}(P;\, T_1,\, \rho = m/V)$, avaliado ponto a ponto sobre a
isoterma física do fluido.

---

## 6. Validação e Verificação

Todos os casos abaixo são reprodutíveis pelo motor de cálculo. Verificou-se o
**fechamento da Primeira Lei**, $|Q - W - \Delta U|$, na ordem de $10^{-11}$ kJ
(limitada pela precisão de máquina) para os seis casos do Módulo 3.

### 6.1 Módulo 1 — Compressão

Caso: R134a, $P_e = 100$ kPa, $T_e = 25\,°\text{C}$, $P_s = 300$ kPa,
$\dot{m} = 0{,}5$ kg/s, $\eta_s = 0{,}85$.

| Modelo | $\dot{W}$ [kW] | $T_s$ [°C] | $T_{2s}$ [°C] | $\Delta h$ [kJ/kg] | $\Delta h_s$ [kJ/kg] |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Gás real | 16,100 | 64,52 | 59,34 | 32,20 | 27,37 |
| Gás ideal | 16,575 | 64,78 | 58,81 | 33,15 | 28,18 |

Os modelos concordam dentro de $\approx 3\%$ para esta condição moderada de
pressão. Verificação adicional: ar comprimido $100 \to 800$ kPa a partir de
$20\,°\text{C}$ com $\eta_s = 1$ resulta em $T_s = 255{,}0\,°\text{C}$ (real),
contra o valor de gás ideal $T_2 = T_1 (P_2/P_1)^{(k-1)/k} = 258\,°\text{C}$.

### 6.2 Módulo 2 — Enchimento

**Verificação analítica (tanque evacuado, adiabático):** ar, $T_{linha} = 300$ K.
O motor retorna $T_2 = 419{,}98$ K, idêntico ao valor teórico
$k\,T_{linha} = 1{,}3999 \times 300 = 419{,}98$ K.

Caso: R134a, $V = 100$ L, estado inicial $120$ kPa / $20\,°\text{C}$, linha a
$800$ kPa / $50\,°\text{C}$, $P_2 = 700$ kPa, adiabático, $\dot{m}_e = 0{,}02$ kg/s.

| Modelo | $m_1$ [kg] | $m_2$ [kg] | $m_{ad}$ [kg] | $T_2$ [°C] | $t_{ench}$ [s] |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Gás real | 0,5157 | 2,7907 | 2,2749 | 66,36 | 113,7 |
| Gás ideal | 0,5023 | 2,5003 | 1,9980 | 70,42 | 99,9 |

A temperatura final supera a da linha em ambos os modelos — efeito do trabalho de
fluxo convertido em energia interna acumulada, característico do enchimento.

### 6.3 Módulo 3 — Atuador

**Gás ideal** — ar, $m = 1$ kg, $P_1 = 200$ kPa, $T_1 = 350$ K, $r = 2$,
$n = 1{,}3$:

| Processo | $W$ [kJ] | $\Delta U$ [kJ] | $Q$ [kJ] | $T_2$ [K] | $P_2$ [kPa] |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Isobárico | 100,467 | 252,369 | 352,835 | 700,0 | 200,0 |
| Isotérmico | 69,638 | 0,000 | 69,638 | 350,0 | 100,0 |
| Politrópico | 62,875 | −47,382 | 15,493 | 284,3 | 81,2 |

Conferências: isobárico $Q = m c_p \Delta T = 352{,}835$ kJ e
$\Delta U = m c_v \Delta T = 252{,}369$ kJ; isotérmico $\Delta U = 0$ e
$Q = W = m R T_1 \ln r = 69{,}638$ kJ.

**Gás real** — R134a, $m = 2$ kg, $P_1 = 500$ kPa, $T_1 = 330$ K, $r = 1{,}8$,
$n = 1{,}2$:

| Processo | $W$ [kJ] | $\Delta U$ [kJ] | $Q$ [kJ] | $T_2$ [°C] | $P_2$ [kPa] |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Isobárico | 39,892 | 453,637 | 493,529 | 282,72 | 500,0 |
| Isotérmico | 29,865 | 4,605 | 34,470 | 56,85 | 287,4 |
| Politrópico | 27,653 | −60,551 | −32,898 | 15,69 | 247,0 |

**Convergência do integrador:** para o ar na isoterma a $200$ kPa (baixa pressão,
regime quase-ideal), o trabalho obtido por quadratura difere da forma fechada de
gás ideal em apenas $0{,}0025\%$, validando a implementação de
$\int P\,dV$ por `quad`.

---

## 7. Interface da API REST

Base local: `http://localhost:8000` — documentação interativa em `/docs` (Swagger).

| Método | Rota | Módulo |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/compression/fluids` | Lista de fluidos |
| `POST` | `/api/compression` | Módulo 1 — Compressão |
| `POST` | `/api/filling` | Módulo 2 — Enchimento |
| `POST` | `/api/actuator` | Módulo 3 — Atuador |

**Exemplo — requisição/resposta do Módulo 1:**

```json
// POST /api/compression
{
  "fluid": "R134a", "model": "real",
  "P_in": 100, "T_in": 25, "P_out": 300,
  "mass_flow": 0.5, "efficiency_isen": 0.85
}
```
```json
{
  "fluid": "R134a", "model": "real",
  "power_required": 16.100, "work_specific": 32.20,
  "T_out": 64.52, "T_out_isentropic": 59.34,
  "enthalpy_change": 32.20, "enthalpy_change_isentropic": 27.37
}
```

---

## 8. Conclusões

A plataforma cumpre os objetivos propostos, resolvendo os três módulos da Primeira
Lei sob modelos de gás ideal e gás real com rigor verificável. Os métodos
numéricos foram aplicados apenas onde a solução analítica inexiste (enchimento de
gás real e trabalho isotérmico real), preservando exatidão nos demais casos. A
verificação contra soluções clássicas — $T_2 = k\,T_{linha}$ no enchimento
evacuado, fechamento da Primeira Lei a $10^{-11}$ e concordância real–ideal de
$0{,}0025\%$ no limite de baixa pressão — confere confiança aos resultados.

### Trabalhos futuros

- **Visualização interativa:** diagramas $P\text{-}v$ (com área correspondente ao
  trabalho) e $T\text{-}s$, incluindo a curva de saturação (domo bifásico).
- **Suíte de testes automatizados** (`pytest`) cobrindo os casos-âncora.
- **Persistência** de simulações (PostgreSQL) para histórico de dimensionamento.
- **Análise transiente resolvida no tempo** do enchimento via integração de EDO.

---

## Referências

1. BELL, I. H.; WRONSKI, J.; QUOILIN, S.; LEMORT, V. *Pure and Pseudo-pure Fluid
   Thermophysical Property Evaluation and the Open-Source Thermophysical Property
   Library CoolProp*. Industrial & Engineering Chemistry Research, v. 53, n. 6,
   p. 2498–2508, 2014.
2. BORGNAKKE, C.; SONNTAG, R. E. *Fundamentos da Termodinâmica*. 8. ed. Blucher.
3. MORAN, M. J.; SHAPIRO, H. N. *Princípios de Termodinâmica para Engenharia*. LTC.
4. VIRTANEN, P. et al. *SciPy 1.0: Fundamental Algorithms for Scientific Computing
   in Python*. Nature Methods, v. 17, p. 261–272, 2020.

---

## Apêndice A — Reprodutibilidade

Ambiente de referência: Python 3.12, CoolProp 6.7.0, SciPy 1.15.0, NumPy 2.2.1,
FastAPI 0.115.6. Setup e execução descritos em [README.md](README.md) e
[backend/README.md](backend/README.md). O motor de cálculo é determinístico:
mesmas entradas produzem as saídas tabeladas na Seção 6.
