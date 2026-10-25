VALID_TRANSITIONS = {"locked": {"available"}, "available": {"in_progress"}, "in_progress": {"completed", "paused", "skipped"}, "paused": {"in_progress"}}


def can_transition(current: str, target: str) -> bool:
    return target in VALID_TRANSITIONS.get(current, set())
