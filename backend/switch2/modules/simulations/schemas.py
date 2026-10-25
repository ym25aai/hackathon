from typing import Any, Literal

from pydantic import BaseModel, Field


SimulationMode = Literal["sandbox", "rules", "probability", "interaction"]
SimulationCategory = Literal["self", "education", "career", "relationships", "finance", "ethics", "health", "crisis"]


class CatalogItem(BaseModel):
    id: str
    title: str
    description: str


class DomainPack(BaseModel):
    id: SimulationCategory
    title: str
    description: str
    context: dict[str, Any] = Field(default_factory=dict)
    state_variables: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    events: list[str] = Field(default_factory=list)
    evaluation_criteria: list[str] = Field(default_factory=list)


class ScenarioDefinition(BaseModel):
    simulation_mode: SimulationMode
    primary_category: SimulationCategory
    secondary_tags: list[str] = Field(default_factory=list)
    scenario: dict[str, Any]
    initial_state: dict[str, Any] = Field(default_factory=dict)
    participants: list[dict[str, Any]] = Field(default_factory=list)
    objectives: list[dict[str, Any]] = Field(default_factory=list)
    constraints: list[dict[str, Any]] = Field(default_factory=list)
    actions: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)
    evaluation: dict[str, Any] = Field(default_factory=dict)


class SimulationRunRequest(BaseModel):
    scenario: ScenarioDefinition
    action: str = Field(min_length=1, max_length=120)
    seed: int = Field(default=7, ge=0, le=2_147_483_647)


class SimulationTurn(BaseModel):
    step: int
    action: str
    outcome: str
    state: dict[str, int]


class SimulationRunResponse(BaseModel):
    run_id: str
    score: int
    status: Literal["promising", "mixed", "high-risk"]
    summary: str
    state: dict[str, int]
    metrics: dict[str, int]
    next_actions: list[str]
    log: list[SimulationTurn]
