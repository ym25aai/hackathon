def straight_line_value(purchase_cents: int, useful_life_years: int, elapsed_years: float) -> int:
    if purchase_cents < 0 or useful_life_years <= 0 or elapsed_years < 0:
        raise ValueError("invalid depreciation inputs")
    remaining = max(0.0, 1.0 - elapsed_years / useful_life_years)
    return round(purchase_cents * remaining)
