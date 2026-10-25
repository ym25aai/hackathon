from pydantic import BaseModel, Field


class CandidatePlan(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str
    tradeoffs: list[str] = []
    estimated_time_hours: float | None = None
    estimated_cost_cents: int | None = None
    status: str = "proposed"
