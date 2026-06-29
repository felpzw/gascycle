import { useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import axios from 'axios'
import {
  computeFilling,
  getFluids,
  type FillingInput,
  type FillingOutput,
} from '../lib/api'
import { FluidSelect, ModelToggle, NumberField, ResultRow } from './ui'
import { PlotlyChart } from './PlotlyChart'

const DEFAULTS: FillingInput = {
  fluid: 'R134a',
  model: 'real',
  volume: 100,
  P_initial: 120,
  T_initial: 20,
  P_line: 800,
  T_line: 50,
  P_final: 700,
  heat: 0,
  mass_flow_in: 0.02,
}

export function FillingSimulator() {
  const [fluids, setFluids] = useState<string[]>([DEFAULTS.fluid])
  const [input, setInput] = useState<FillingInput>(DEFAULTS)
  const [result, setResult] = useState<FillingOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFluids()
      .then(setFluids)
      .catch(() => {
        /* mantém o default se o backend estiver offline */
      })
  }, [])

  const set = <K extends keyof FillingInput>(key: K, value: FillingInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      setResult(await computeFilling(input))
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Falha ao calcular.')
      } else {
        setError('Erro inesperado.')
      }
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
    <div className="grid gap-6 md:grid-cols-2">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-slate-800 bg-slate-900 p-6"
      >
        <h2 className="mb-4 text-lg font-medium">Parâmetros</h2>
        <div className="grid grid-cols-2 gap-4">
          <FluidSelect
            fluids={fluids}
            value={input.fluid}
            onChange={(v) => set('fluid', v)}
          />
          <ModelToggle value={input.model} onChange={(v) => set('model', v)} />
          <NumberField
            label="Volume do tanque"
            unit="L"
            value={input.volume}
            onChange={(v) => set('volume', v)}
          />
          <NumberField
            label="Calor trocado"
            unit="kJ"
            value={input.heat}
            onChange={(v) => set('heat', v)}
          />
          <NumberField
            label="Pressão inicial"
            unit="kPa"
            value={input.P_initial}
            onChange={(v) => set('P_initial', v)}
          />
          <NumberField
            label="Temp. inicial"
            unit="°C"
            value={input.T_initial}
            onChange={(v) => set('T_initial', v)}
          />
          <NumberField
            label="Pressão da linha"
            unit="kPa"
            value={input.P_line}
            onChange={(v) => set('P_line', v)}
          />
          <NumberField
            label="Temp. da linha"
            unit="°C"
            value={input.T_line}
            onChange={(v) => set('T_line', v)}
          />
          <NumberField
            label="Pressão final"
            unit="kPa"
            value={input.P_final}
            onChange={(v) => set('P_final', v)}
          />
          <NumberField
            label="Vazão de entrada"
            unit="kg/s"
            value={input.mass_flow_in ?? 0}
            onChange={(v) => set('mass_flow_in', v || null)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Calcular
        </button>

        {error && (
          <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-medium">Resultados</h2>
        {result ? (
          <div>
            <ResultRow
              label="Massa inicial"
              value={`${result.m_initial.toFixed(4)} kg`}
            />
            <ResultRow
              label="Massa final"
              value={`${result.m_final.toFixed(4)} kg`}
            />
            <ResultRow
              label="Massa adicionada"
              value={`${result.m_added.toFixed(4)} kg`}
            />
            <ResultRow
              label="Temperatura final"
              value={`${result.T_final.toFixed(2)} °C`}
            />
            <ResultRow
              label="Energia interna final"
              value={`${result.u_final.toFixed(2)} kJ/kg`}
            />
            {result.fill_time != null && (
              <ResultRow
                label="Tempo de enchimento"
                value={`${result.fill_time.toFixed(1)} s`}
              />
            )}
            <p className="mt-4 text-xs text-slate-500">
              Modelo: {result.model === 'real' ? 'gás real (CoolProp)' : 'gás ideal'} · Fluido: {result.fluid}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Preencha os parâmetros e clique em <strong>Calcular</strong>.
          </p>
        )}
      </div>
    </div>
      {result && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <PlotlyChart
            height={300}
            data={[
              {
                type: 'bar',
                x: ['Massa inicial', 'Massa adicionada', 'Massa final'],
                y: [result.m_initial, result.m_added, result.m_final],
                marker: { color: ['#64748b', '#22d3ee', '#f59e0b'] },
                text: [
                  result.m_initial.toFixed(3),
                  result.m_added.toFixed(3),
                  result.m_final.toFixed(3),
                ],
                textposition: 'outside',
              },
            ]}
            layout={{
              title: { text: 'Balanço de massa do enchimento', font: { size: 14 } },
              yaxis: { title: { text: 'massa [kg]' }, rangemode: 'tozero' },
              showlegend: false,
            }}
          />
        </div>
      )}
    </div>
  )
}
