def cents_to_currency(cents: int, currency: str = "USD") -> dict[str, str]:
    if cents < 0:
        raise ValueError("amount cannot be negative")
    return {"amount": f"{cents / 100:.2f}", "currency": currency.upper()}
