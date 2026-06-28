"""GasCycle Suite — FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import actuator, compression, health, tank_filling
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Plataforma de engenharia para simulação e dimensionamento de sistemas "
        "de compressão, armazenamento e expansão de gases (1ª Lei da Termodinâmica)."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(compression.router)
app.include_router(tank_filling.router)
app.include_router(actuator.router)


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {"name": settings.app_name, "version": settings.version, "docs": "/docs"}
