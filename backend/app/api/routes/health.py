"""Health-check and environment introspection endpoints."""

from fastapi import APIRouter

from app import __version__

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by the frontend and orchestration."""
    return {"status": "ok", "version": __version__}
