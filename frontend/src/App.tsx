import { useEffect, useState } from 'react'
import { Activity, Gauge, Wind } from 'lucide-react'
import { getHealth } from './lib/api'

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
          <div>
            <h1 className="text-xl font-semibold tracking-tight">GasCycle Suite</h1>
            <p className="text-sm text-slate-400">
              Simulação e dimensionamento de sistemas de gases
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-10 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
          <Activity className={`h-5 w-5 ${statusColor}`} />
          <span className="text-sm">
            Backend:{' '}
            <span className={statusColor}>
              {status === 'checking'
                ? 'verificando...'
                : status === 'online'
                  ? `online (v${version})`
                  : 'offline'}
            </span>
          </span>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Compressão', desc: 'Volume de controle em regime permanente' },
            { title: 'Enchimento', desc: 'Volume de controle transiente' },
            { title: 'Atuador', desc: 'Sistema fechado — trabalho de fronteira' },
          ].map((m) => (
            <div
              key={m.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <Gauge className="mb-3 h-6 w-6 text-cyan-400" />
              <h2 className="font-medium">{m.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App
