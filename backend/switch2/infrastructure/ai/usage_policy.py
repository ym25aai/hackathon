from dataclasses import dataclass


@dataclass(frozen=True)
class UsagePolicy:
    enabled: bool = False
    max_retries: int = 2
    paid_search_allowed: bool = False


DEFAULT_USAGE_POLICY = UsagePolicy()
