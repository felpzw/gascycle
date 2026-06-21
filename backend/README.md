# GasCycle — Backend (FastAPI)

Motor de cálculo termodinâmico (CoolProp + NumPy/SciPy) exposto via API REST.

## Requisitos

- Python 3.12
- A venv vive em `backend/venv/` (ignorada pelo git).

## Setup

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # ajuste se necessário
```

## Executar (desenvolvimento)

```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Docs (Swagger): http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Estrutura

```
backend/
├── app/
│   ├── main.py          # entrypoint FastAPI + CORS
│   ├── config.py        # settings (pydantic-settings)
│   ├── api/routes/      # endpoints (health, módulos termodinâmicos)
│   ├── core/            # motor de cálculo (compressão, transiente, atuador)
│   └── schemas/         # modelos Pydantic de entrada/saída
├── requirements.txt
└── venv/                # ambiente virtual (gitignored)
```
