from fastapi import APIRouter, HTTPException

from .categories import CATEGORIES
from .domain_packs import DOMAIN_PACKS
from .modes import MODES
from .schemas import CatalogItem, DomainPack, ScenarioDefinition

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
