from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    profile_id: int
    description: str = Field(min_length=1, max_length=500)
    success_criteria: str = Field(min_length=1, max_length=1000)
    status: str = "active"


class Goal(GoalCreate):
    id: int
    version: int = 1
