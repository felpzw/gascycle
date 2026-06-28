import { useEffect, useState } from 'react'
import { Activity, Wind } from 'lucide-react'
import { getHealth } from './lib/api'
import { CompressionSimulator } from './components/CompressionSimulator'

type Status = 'checking' | 'online' | 'offline'

function App() {
  const [status, setStatus] = useState<Status>('checking')
  const [version, setVersion] = useState<string>('')

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
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Módulo 1 — Compressão</h2>
          <p className="text-sm text-slate-400">
            Volume de controle em regime permanente: balanço de energia (1ª Lei)
            em compressor adiabático com eficiência isentrópica.
          </p>
        </div>
        <CompressionSimulator />
      </main>
    </div>
  )
}

export default App
