from fastapi import APIRouter, HTTPException

from .categories import CATEGORIES
from .domain_packs import DOMAIN_PACKS
from .modes import MODES
from .schemas import CatalogItem, DomainPack, ScenarioDefinition, SimulationRunRequest, SimulationRunResponse, SimulationTurn
import hashlib

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


@router.get("/modes", response_model=list[CatalogItem])
def get_modes() -> list[CatalogItem]:
    return MODES


@router.get("/categories", response_model=list[CatalogItem])
def get_categories() -> list[CatalogItem]:
    return CATEGORIES


@router.get("/domain-packs/{category}", response_model=DomainPack)
def get_domain_pack(category: str) -> DomainPack:
    try:
        return DOMAIN_PACKS[category]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown simulation category") from exc


@router.post("/scenario/validate", response_model=ScenarioDefinition)
def validate_scenario(payload: ScenarioDefinition) -> ScenarioDefinition:
    return payload


@router.post("/run", response_model=SimulationRunResponse)
def run_simulation(payload: SimulationRunRequest) -> SimulationRunResponse:
    """Run a small deterministic simulation so the Engine Lab is useful without an AI key."""
    pack = DOMAIN_PACKS[payload.scenario.primary_category]
    available_actions = [str(item.get("id", "")) for item in payload.scenario.actions]
    if not available_actions:
        available_actions = pack.actions
    if payload.action not in available_actions:
        raise HTTPException(status_code=422, detail="Action is not available in this scenario")

    digest = hashlib.sha256(f"{payload.seed}:{payload.scenario.primary_category}:{payload.action}".encode()).digest()
    volatility = (digest[0] % 11) - 5
    action_index = available_actions.index(payload.action)
    mode_modifier = {"sandbox": 4, "interaction": 2}[payload.scenario.simulation_mode]
    initial = {
        name: max(0, min(100, int(payload.scenario.initial_state.get(name, 50))))
        for name in pack.state_variables
    }
    state = dict(initial)
    turns: list[SimulationTurn] = []
    for step in range(1, 4):
        delta = 5 + ((volatility + action_index + step + mode_modifier) % 7)
        for name in state:
            state[name] = max(0, min(100, state[name] + delta - (step - 1)))
        outcome = "The choice creates useful momentum." if delta >= 7 else "The choice helps, but requires follow-through."
        turns.append(SimulationTurn(step=step, action=payload.action, outcome=outcome, state=dict(state)))

    average = round(sum(state.values()) / max(1, len(state)))
    score = max(0, min(100, average + mode_modifier - len(pack.constraints) * 2))
    status = "promising" if score >= 70 else "mixed" if score >= 50 else "high-risk"
    summary = {
        "promising": "This path builds measurable momentum while keeping the scenario within view.",
        "mixed": "This path is workable, but the next step should reduce uncertainty or pressure.",
        "high-risk": "This path needs a smaller or safer next move before it can become sustainable.",
    }[status]
    metrics = {
        "stability": max(0, min(100, average)),
        "constraint_load": min(100, len(pack.constraints) * 20 + (10 if status == "high-risk" else 0)),
        "reversibility": max(0, min(100, 78 - action_index * 9)),
    }
    run_id = hashlib.sha1(f"{payload.seed}:{payload.action}:{average}".encode()).hexdigest()[:12]
    return SimulationRunResponse(
        run_id=run_id,
        score=score,
        status=status,
        summary=summary,
        state=state,
        metrics=metrics,
        next_actions=[action for action in available_actions if action != payload.action],
        log=turns,
    )
