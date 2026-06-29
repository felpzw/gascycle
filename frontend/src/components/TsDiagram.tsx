import { useEffect, useState } from 'react'
import { getSaturation, type CompressionOutput, type SaturationResponse } from '../lib/api'
import { PlotlyChart } from './PlotlyChart'

export function TsDiagram({ result }: { result: CompressionOutput }) {
  const [dome, setDome] = useState<SaturationResponse | null>(null)

  // O domo de saturação só faz sentido na mesma referência de entropia da
  // CoolProp (modelo real). No modelo ideal a entropia é relativa.
  useEffect(() => {
    if (result.model !== 'real') {
      setDome(null)
      return
    }
    getSaturation(result.fluid, 'ts')
      .then(setDome)
      .catch(() => setDome(null))
  }, [result.fluid, result.model])

  const pts = result.ts_diagram
  const s = pts.map((p) => p.s)
  const T = pts.map((p) => p.T)

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

  // Caminho isentrópico 1 -> 2s (vertical) e processo real 1 -> 2 (tracejado).
  data.push({
    x: [s[0], s[1]],
    y: [T[0], T[1]],
    mode: 'lines',
    name: 'Isentrópico (1→2s)',
    line: { color: '#22d3ee', width: 2 },
  })
  data.push({
    x: [s[0], s[2]],
    y: [T[0], T[2]],
    mode: 'lines',
    name: 'Real (1→2)',
    line: { color: '#f59e0b', width: 2, dash: 'dot' },
  })
  data.push({
    x: s,
    y: T,
    text: pts.map((p) => p.label),
    mode: 'markers+text',
    textposition: 'top center',
    textfont: { size: 10 },
    name: 'Estados',
    marker: { color: ['#e2e8f0', '#22d3ee', '#f59e0b'], size: 9 },
  })

  return (
    <PlotlyChart
      data={data}
      layout={{
        title: { text: 'Diagrama T–s', font: { size: 14 } },
        xaxis: { title: { text: 's [kJ/kg·K]' } },
        yaxis: { title: { text: 'T [°C]' } },
        showlegend: true,
      }}
    />
  )
}
