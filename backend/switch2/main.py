from contextlib import asynccontextmanager
from fastapi import FastAPI
from .config import settings
from .database import initialize_database
from .modules.profiles.router import router as profiles_router
from .modules.goals.router import router as goals_router
from .modules.simulations.router import router as simulations_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.include_router(profiles_router)
app.include_router(goals_router)
app.include_router(simulations_router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "switch2"}
