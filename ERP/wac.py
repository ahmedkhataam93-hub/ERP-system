"""Moving Weighted Average Cost for one (product, warehouse) position."""
from dataclasses import dataclass
from decimal import Decimal

from .money import D, cost, money, qty


class InsufficientStock(Exception):
    pass


@dataclass(frozen=True)
class StockPosition:
    quantity: Decimal = Decimal("0")
    avg_cost: Decimal = Decimal("0")

    @property
    def value(self) -> Decimal:
        return money(self.quantity * self.avg_cost)


@dataclass(frozen=True)
class MovementResult:
    position: StockPosition
    unit_cost: Decimal     # cost applied to this movement
    total_cost: Decimal    # money value of this movement (positive)


def stock_in(pos: StockPosition, quantity, unit_cost) -> MovementResult:
    q, c = qty(quantity), cost(unit_cost)
    if q <= 0:
        raise ValueError("quantity must be positive")
    if c < 0:
        raise ValueError("unit cost cannot be negative")
    if pos.quantity <= 0:  # empty (or negative) stock: new cost wins
        new_avg = c
    else:
        new_avg = cost((pos.quantity * pos.avg_cost + q * c) / (pos.quantity + q))
    return MovementResult(StockPosition(qty(pos.quantity + q), new_avg), c, money(q * c))


def stock_out(pos: StockPosition, quantity, allow_negative: bool = False) -> MovementResult:
    q = qty(quantity)
    if q <= 0:
        raise ValueError("quantity must be positive")
    if q > pos.quantity and not allow_negative:
        raise InsufficientStock(f"requested {q}, available {pos.quantity}")
    # Average cost never changes on an outgoing movement.
    return MovementResult(
        StockPosition(qty(pos.quantity - q), pos.avg_cost), pos.avg_cost, money(q * pos.avg_cost)
    )
