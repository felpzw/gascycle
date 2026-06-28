import { useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import axios from 'axios'
import {
  computeActuator,
  getFluids,
  type ActuatorInput,
  type ActuatorOutput,
  type Process,
} from '../lib/api'
import { FluidSelect, ModelToggle, NumberField, ResultRow } from './ui'

const DEFAULTS: ActuatorInput = {
  fluid: 'Air',
  model: 'ideal',
  mass: 1,
  P1: 200,
  T1: 25,
  process: 'polytropic',
  ratio: 2,
  polytropic_n: 1.3,
}

const PROCESSES: { id: Process; label: string }[] = [
  { id: 'isobaric', label: 'Isobárica' },
  { id: 'isothermal', label: 'Isotérmica' },
  { id: 'polytropic', label: 'Politrópica' },
]

export function ActuatorSimulator() {
  const [fluids, setFluids] = useState<string[]>([DEFAULTS.fluid])
  const [input, setInput] = useState<ActuatorInput>(DEFAULTS)
  const [result, setResult] = useState<ActuatorOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFluids()
      .then(setFluids)
      .catch(() => {
        /* mantém o default se o backend estiver offline */
      })
  }, [])

  const set = <K extends keyof ActuatorInput>(key: K, value: ActuatorInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      setResult(await computeActuator(input))
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

          <label className="col-span-2 flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Processo</span>
            <div className="flex gap-2">
              {PROCESSES.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => set('process', p.id)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                    input.process === p.id
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </label>

          <NumberField
            label="Massa"
            unit="kg"
            value={input.mass}
            onChange={(v) => set('mass', v)}
          />
          <NumberField
            label="Razão V2/V1"
            unit="—"
            step={0.1}
            value={input.ratio}
            onChange={(v) => set('ratio', v)}
          />
          <NumberField
            label="Pressão inicial"
            unit="kPa"
            value={input.P1}
            onChange={(v) => set('P1', v)}
          />
          <NumberField
            label="Temp. inicial"
            unit="°C"
            value={input.T1}
            onChange={(v) => set('T1', v)}
          />
          {input.process === 'polytropic' && (
            <NumberField
              label="Expoente n"
              unit="—"
              step={0.05}
              value={input.polytropic_n ?? 1.3}
              onChange={(v) => set('polytropic_n', v)}
            />
          )}
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
            <ResultRow label="Volume inicial" value={`${result.V1.toFixed(2)} L`} />
            <ResultRow label="Volume final" value={`${result.V2.toFixed(2)} L`} />
            <ResultRow
              label="Pressão final"
              value={`${result.P2.toFixed(2)} kPa`}
            />
            <ResultRow
              label="Temperatura final"
              value={`${result.T2.toFixed(2)} °C`}
            />
            <ResultRow
              label="Trabalho (∫P dV)"
              value={`${result.work.toFixed(3)} kJ`}
            />
            <ResultRow label="ΔU" value={`${result.delta_U.toFixed(3)} kJ`} />
            <ResultRow label="Calor Q" value={`${result.heat.toFixed(3)} kJ`} />
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
  )
}
