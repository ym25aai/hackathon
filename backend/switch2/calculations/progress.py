def completion_ratio(completed: int, total: int) -> float | None:
    if total < 0 or completed < 0 or completed > total:
        raise ValueError("invalid progress inputs")
    return None if total == 0 else completed / total
