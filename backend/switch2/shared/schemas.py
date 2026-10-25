from datetime import datetime
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class Versioned(BaseModel):
    version: int = 1
    created_at: datetime | None = None
    updated_at: datetime | None = None


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
