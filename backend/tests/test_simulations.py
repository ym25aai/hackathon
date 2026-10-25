from switch2.modules.simulations.categories import CATEGORIES
from switch2.modules.simulations.domain_packs import DOMAIN_PACKS
from switch2.modules.simulations.modes import MODES
from switch2.modules.simulations.schemas import ScenarioDefinition


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
