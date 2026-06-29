import { useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import axios from 'axios'
import {
  computeCompression,
  getFluids,
  type CompressionInput,
  type CompressionOutput,
} from '../lib/api'
import { FluidSelect, ModelToggle, NumberField, ResultRow } from './ui'
import { TsDiagram } from './TsDiagram'

const DEFAULTS: CompressionInput = {
  fluid: 'R134a',
  model: 'real',
  P_in: 100,
  T_in: 25,
  P_out: 300,
  mass_flow: 0.5,
  efficiency_isen: 0.85,
}

export function CompressionSimulator() {
  const [fluids, setFluids] = useState<string[]>([DEFAULTS.fluid])
  const [input, setInput] = useState<CompressionInput>(DEFAULTS)
  const [result, setResult] = useState<CompressionOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFluids()
      .then(setFluids)
      .catch(() => {
        /* mantém o default se o backend estiver offline */
      })
  }, [])

  const set = <K extends keyof CompressionInput>(
    key: K,
    value: CompressionInput[K],
  ) => setInput((prev) => ({ ...prev, [key]: value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      setResult(await computeCompression(input))
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
            label="Pressão entrada"
            unit="kPa"
            value={input.P_in}
            onChange={(v) => set('P_in', v)}
          />
          <NumberField
            label="Temp. entrada"
            unit="°C"
            value={input.T_in}
            onChange={(v) => set('T_in', v)}
          />
          <NumberField
            label="Pressão saída"
            unit="kPa"
            value={input.P_out}
            onChange={(v) => set('P_out', v)}
          />
          <NumberField
            label="Vazão mássica"
            unit="kg/s"
            value={input.mass_flow}
            onChange={(v) => set('mass_flow', v)}
          />
          <NumberField
            label="Efic. isentrópica"
            unit="0-1"
            step={0.01}
            value={input.efficiency_isen}
            onChange={(v) => set('efficiency_isen', v)}
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
              label="Potência requerida"
              value={`${result.power_required.toFixed(3)} kW`}
            />
            <ResultRow
              label="Trabalho específico"
              value={`${result.work_specific.toFixed(2)} kJ/kg`}
            />
            <ResultRow
              label="Temperatura de saída"
              value={`${result.T_out.toFixed(2)} °C`}
            />
            <ResultRow
              label="Temp. saída isentrópica"
              value={`${result.T_out_isentropic.toFixed(2)} °C`}
            />
            <ResultRow
              label="Δh real"
              value={`${result.enthalpy_change.toFixed(2)} kJ/kg`}
            />
            <ResultRow
              label="Δh isentrópico"
              value={`${result.enthalpy_change_isentropic.toFixed(2)} kJ/kg`}
            />
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
          <TsDiagram result={result} />
        </div>
      )}
    </div>
  )
}
