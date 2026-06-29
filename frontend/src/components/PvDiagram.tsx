import { useEffect, useState } from 'react'
import { getSaturation, type ActuatorOutput, type SaturationResponse } from '../lib/api'
import { PlotlyChart } from './PlotlyChart'

export function PvDiagram({ result }: { result: ActuatorOutput }) {
  const [dome, setDome] = useState<SaturationResponse | null>(null)

  useEffect(() => {
    if (result.model !== 'real') {
      setDome(null)
      return
    }
    getSaturation(result.fluid, 'pv')
      .then(setDome)
      .catch(() => setDome(null))
  }, [result.fluid, result.model])

  const path = result.pv_diagram
  const v = path.map((p) => p.v)
  const P = path.map((p) => p.P)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = []

  if (dome && dome.liquid.length) {
    data.push({
      x: [...dome.liquid.map((p) => p.x), ...[...dome.vapor].reverse().map((p) => p.x)],
      y: [...dome.liquid.map((p) => p.y), ...[...dome.vapor].reverse().map((p) => p.y)],
      mode: 'lines',
      name: 'Saturação',
      line: { color: '#475569', width: 1 },
      hoverinfo: 'skip',
    })
  }

  // Área sob a curva = trabalho específico (∫P dv). Preenchida até o eixo.
  data.push({
    x: v,
    y: P,
    mode: 'lines',
    name: 'Processo (∫P dv = w)',
    line: { color: '#22d3ee', width: 2.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(34,211,238,0.12)',
  })

  // Estados inicial e final.
  data.push({
    x: [v[0], v[v.length - 1]],
    y: [P[0], P[P.length - 1]],
    text: ['1', '2'],
    mode: 'markers+text',
    textposition: 'top center',
    name: 'Estados',
    marker: { color: ['#e2e8f0', '#f59e0b'], size: 10 },
  })

  return (
    <PlotlyChart
      data={data}
      layout={{
        title: { text: 'Diagrama P–v (área = trabalho)', font: { size: 14 } },
        xaxis: { title: { text: 'v [m³/kg]' } },
        yaxis: { title: { text: 'P [kPa]' }, rangemode: 'tozero' },
        showlegend: true,
      }}
    />
  )
}
