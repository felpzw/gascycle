import type { PropertyModel } from '../lib/api'

export function NumberField({
  label,
  unit,
  value,
  step,
  onChange,
}: {
  label: string
  unit: string
  value: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-400">
        {label} <span className="text-slate-500">[{unit}]</span>
      </span>
      <input
        type="number"
        step={step ?? 'any'}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
      />
    </label>
  )
}

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-800 py-2">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-mono text-slate-100">{value}</span>
    </div>
  )
}

export function FluidSelect({
  fluids,
  value,
  onChange,
}: {
  fluids: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="col-span-2 flex flex-col gap-1 text-sm">
      <span className="text-slate-400">Fluido</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
      >
        {fluids.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ModelToggle({
  value,
  onChange,
}: {
  value: PropertyModel
  onChange: (v: PropertyModel) => void
}) {
  return (
    <label className="col-span-2 flex flex-col gap-1 text-sm">
      <span className="text-slate-400">Modelo de gás</span>
      <div className="flex gap-2">
        {(['real', 'ideal'] as const).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => onChange(m)}
            className={`flex-1 rounded-md border px-3 py-2 capitalize ${
              value === m
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {m === 'real' ? 'Real (CoolProp)' : 'Ideal'}
          </button>
        ))}
      </div>
    </label>
  )
}
