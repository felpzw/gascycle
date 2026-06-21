# GasCycle Suite

Plataforma de engenharia para simulação e dimensionamento de sistemas de
compressão, armazenamento e expansão de gases, baseada na 1ª Lei da
Termodinâmica. Trabalho P2 — Fenômenos de Transporte (UFSC).

Especificação técnica completa em [PROJECT.md](PROJECT.md).

## Estrutura (monorepo)

```
gascycle/
├── backend/    # API FastAPI + motor de cálculo (CoolProp, NumPy, SciPy)
└── frontend/   # SPA React + TypeScript + Vite + TailwindCSS
```

## Como rodar (desenvolvimento)

Dois terminais:

```bash
# Terminal 1 — backend (http://localhost:8000, docs em /docs)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

O Vite faz proxy de `/api` para o backend, então o frontend consome a API sem
configuração extra de CORS em desenvolvimento.

Instruções de setup detalhadas: [backend/README.md](backend/README.md).

## Git workflow

- `main` — produção (estável).
- `develop` — integração.
- `feature/*` — uma branch por funcionalidade, integrada em `develop` via
  *squash merge*. Releases de `develop` para `main` via `merge --no-ff`,
  com tags de versão (`v0.1.0`, ...).
- Mensagens de commit no padrão Conventional Commits (`feat`, `fix`, `chore`, ...).
