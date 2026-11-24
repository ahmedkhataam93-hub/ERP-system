from decimal import Decimal, ROUND_HALF_UP

MONEY_PLACES = Decimal("0.01")   # assumption Q6: confirm per-line rounding and places
COST_PLACES = Decimal("0.0001")
QTY_PLACES = Decimal("0.001")


def D(value) -> Decimal:
    """Build a Decimal safely. Floats are rejected to avoid binary rounding errors."""
    if isinstance(value, float):
        raise TypeError("floats are not allowed in monetary calculations")
    return Decimal(str(value)) if not isinstance(value, Decimal) else value


def money(value) -> Decimal:
    return D(value).quantize(MONEY_PLACES, rounding=ROUND_HALF_UP)


def cost(value) -> Decimal:
    return D(value).quantize(COST_PLACES, rounding=ROUND_HALF_UP)


def qty(value) -> Decimal:
    return D(value).quantize(QTY_PLACES, rounding=ROUND_HALF_UP)
