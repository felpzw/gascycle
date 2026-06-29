import { useEffect, useRef } from 'react'

// Tema escuro coerente com a UI (slate).
const DARK_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: '#cbd5e1', size: 12 },
  margin: { l: 60, r: 20, t: 30, b: 50 },
  xaxis: { gridcolor: '#1e293b', zerolinecolor: '#334155' },
  yaxis: { gridcolor: '#1e293b', zerolinecolor: '#334155' },
  legend: { orientation: 'h', y: -0.2 },
}

const CONFIG = { displayModeBar: false, responsive: true }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Trace = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Layout = any

export function PlotlyChart({
  data,
  layout,
  height = 360,
}: {
  data: Trace[]
  layout?: Layout
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    // Carrega o Plotly sob demanda (chunk separado, ~4 MB) só quando há gráfico.
    import('plotly.js-dist-min').then(({ default: Plotly }) => {
      if (cancelled || !ref.current) return
      const merged = {
        ...DARK_LAYOUT,
        ...layout,
        xaxis: { ...DARK_LAYOUT.xaxis, ...(layout?.xaxis ?? {}) },
        yaxis: { ...DARK_LAYOUT.yaxis, ...(layout?.yaxis ?? {}) },
      }
      Plotly.react(ref.current, data, merged, CONFIG)
    })
    return () => {
      cancelled = true
      import('plotly.js-dist-min').then(({ default: Plotly }) => {
        if (el) Plotly.purge(el)
      })
    }
  }, [data, layout])

  return <div ref={ref} style={{ width: '100%', height }} />
}
