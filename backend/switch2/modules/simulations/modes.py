from .schemas import CatalogItem, SimulationMode

MODES: list[CatalogItem] = [
    CatalogItem(id="sandbox", title="SANDBOX", description="Explore decisions from a fixed, reproducible starting state."),
    CatalogItem(id="rules", title="RULES", description="Make decisions under constraints, resources and objectives."),
    CatalogItem(id="probability", title="PROBABILITY", description="Explore uncertainty with reproducible assumptions and outcomes."),
    CatalogItem(id="interaction", title="INTERACTION", description="Simulate consent-based collaboration between authorized personas."),
]


def is_mode(value: str) -> bool:
    return value in {item.id for item in MODES}
