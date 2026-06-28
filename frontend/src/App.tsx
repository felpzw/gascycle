import { useEffect, useState } from 'react'
import { Activity, Wind } from 'lucide-react'
import { getHealth } from './lib/api'
import { CompressionSimulator } from './components/CompressionSimulator'
import { FillingSimulator } from './components/FillingSimulator'
import { ActuatorSimulator } from './components/ActuatorSimulator'

type Status = 'checking' | 'online' | 'offline'

const MODULES = [
  {
    id: 'compression',
    tab: 'Módulo 1 — Compressão',
    title: 'Módulo 1 — Compressão',
    desc: 'Volume de controle em regime permanente: balanço de energia (1ª Lei) em compressor adiabático com eficiência isentrópica.',
    render: () => <CompressionSimulator />,
  },
  {
    id: 'filling',
    tab: 'Módulo 2 — Enchimento',
    title: 'Módulo 2 — Enchimento de reservatório',
    desc: 'Volume de controle transiente (tanque rígido, W = 0): estado final pelo balanço integrado de massa e energia a partir de uma linha de alimentação.',
    render: () => <FillingSimulator />,
  },
  {
    id: 'actuator',
    tab: 'Módulo 3 — Atuador',
    title: 'Módulo 3 — Atuador mecânico',
    desc: 'Sistema fechado (pistão-cilindro): expansão isobárica, isotérmica ou politrópica com Q − W = ΔU e trabalho de fronteira W = ∫P dV.',
    render: () => <ActuatorSimulator />,
  },
] as const

function App() {
  const [status, setStatus] = useState<Status>('checking')
  const [version, setVersion] = useState<string>('')
  const [active, setActive] = useState<(typeof MODULES)[number]['id']>('compression')

  useEffect(() => {
    getHealth()
      .then((res) => {
        setStatus('online')
        setVersion(res.version)
      })
      .catch(() => setStatus('offline'))
  }, [])

  const statusColor =
    status === 'online'
      ? 'text-emerald-400'
      : status === 'offline'
        ? 'text-red-400'
        : 'text-amber-400'

  const current = MODULES.find((m) => m.id === active)!

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Wind className="h-7 w-7 text-cyan-400" />
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">GasCycle Suite</h1>
            <p className="text-sm text-slate-400">
              Simulação e dimensionamento de sistemas de gases
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Activity className={`h-4 w-4 ${statusColor}`} />
            <span className={statusColor}>
              {status === 'checking'
                ? 'verificando...'
                : status === 'online'
                  ? `online v${version}`
                  : 'offline'}
            </span>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-6">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
                active === m.id
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">{current.title}</h2>
          <p className="text-sm text-slate-400">{current.desc}</p>
        </div>
        {current.render()}
      </main>
    </div>
  )
}

export default App
