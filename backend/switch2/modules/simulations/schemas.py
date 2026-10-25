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
