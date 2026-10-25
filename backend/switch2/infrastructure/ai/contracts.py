from typing import Protocol


class AIProvider(Protocol):
    def generate(self, prompt: str, *, model: str) -> str: ...


class AIUnavailable(RuntimeError):
    """Raised when AI is disabled or provider credentials are unavailable."""
