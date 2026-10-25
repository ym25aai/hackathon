from switch2.modules.simulations.categories import CATEGORIES
from switch2.modules.simulations.domain_packs import DOMAIN_PACKS
from switch2.modules.simulations.modes import MODES
from switch2.modules.simulations.schemas import ScenarioDefinition, SimulationRunRequest
from switch2.modules.simulations.router import run_simulation


def test_mode_catalog_has_four_unique_modes() -> None:
    ids = [item.id for item in MODES]
    assert ids == ["sandbox", "rules", "probability", "interaction"]
    assert len(ids) == len(set(ids))


def test_category_catalog_has_eight_domain_packs() -> None:
    ids = [item.id for item in CATEGORIES]
    assert len(ids) == 8
    assert set(ids) == set(DOMAIN_PACKS)


def test_universal_scenario_schema_accepts_shared_shape() -> None:
    scenario = ScenarioDefinition(
        simulation_mode="rules",
        primary_category="career",
        scenario={"id": "team_conflict", "title": "Team Conflict"},
        initial_state={"deadline_hours": 24},
    )
    assert scenario.simulation_mode == "rules"
    assert scenario.primary_category == "career"


def test_simulation_run_is_deterministic_and_returns_next_actions() -> None:
    scenario = ScenarioDefinition(
        simulation_mode="rules",
        primary_category="career",
        scenario={"id": "team_conflict", "title": "Team Conflict"},
        initial_state={"team_trust": 45, "deadline_pressure": 60},
        actions=[{"id": "ask_for_status"}, {"id": "escalate_issue"}],
    )
    request = SimulationRunRequest(scenario=scenario, action="ask_for_status", seed=11)
    first = run_simulation(request)
    second = run_simulation(request)
    assert first == second
    assert first.score >= 0
    assert first.next_actions == ["escalate_issue"]
    assert len(first.log) == 3
