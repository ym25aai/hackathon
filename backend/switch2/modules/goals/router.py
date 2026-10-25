from fastapi import APIRouter
from .schemas import Goal, GoalCreate

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("", response_model=Goal, status_code=201)
def create_goal(payload: GoalCreate) -> Goal:
    # Persistence is intentionally deferred until the goal migration is added.
    return Goal(id=0, **payload.model_dump())
