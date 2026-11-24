"""Invoice line/total calculation, price guard, payment allocation, return limits."""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional

from .money import D, money

ZERO = Decimal("0.00")


class BusinessRuleError(Exception):
    pass


@dataclass(frozen=True)
class LineInput:
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0")   # 0-100
    discount_amount: Decimal = Decimal("0")    # fixed per line; only one of the two
    tax_rate: Decimal = Decimal("0")           # percent, from a TaxRate record
    tax_inclusive: bool = False
    min_price: Optional[Decimal] = None


@dataclass(frozen=True)
class LineResult:
    net: Decimal       # after discount, excluding tax
    tax: Decimal
    total: Decimal     # net + tax
    discount: Decimal


def calc_line(l: LineInput) -> LineResult:
    """Per-line rounding (assumption Q6). Discount applies before tax."""
    q, p = D(l.quantity), D(l.unit_price)
    if q <= 0 or p < 0:
        raise BusinessRuleError("quantity must be > 0 and price >= 0")
    if l.discount_percent and l.discount_amount:
        raise BusinessRuleError("use either percent or fixed discount, not both")
    if not (0 <= l.discount_percent <= 100):
        raise BusinessRuleError("discount percent must be within 0-100")
    gross = q * p
    disc = gross * l.discount_percent / 100 if l.discount_percent else D(l.discount_amount)
    disc = money(disc)
    if disc > money(gross):
        raise BusinessRuleError("discount exceeds line amount")
    after = money(gross) - disc
    rate = D(l.tax_rate) / 100
    if l.tax_inclusive:
        net = money(after / (1 + rate)); tax = after - net
    else:
        net = after; tax = money(after * rate)
    return LineResult(net, tax, net + tax, disc)


def check_min_price(l: LineInput, can_override: bool) -> bool:
    """Return True if an override was needed and used (to be audited)."""
    if l.min_price is None:
        return False
    effective = D(l.unit_price)
    if l.discount_percent:
        effective = effective * (1 - l.discount_percent / 100)
    elif l.discount_amount:
        effective = effective - D(l.discount_amount) / D(l.quantity)
    if effective < l.min_price:
        if not can_override:
            raise BusinessRuleError("price below minimum selling price")
        return True
    return False


@dataclass(frozen=True)
class Totals:
    net: Decimal
    tax: Decimal
    discount: Decimal
    grand: Decimal


def totals(results: List[LineResult]) -> Totals:
    net = sum((r.net for r in results), ZERO); tax = sum((r.tax for r in results), ZERO)
    return Totals(net, tax, sum((r.discount for r in results), ZERO), net + tax)


def invoice_status(grand: Decimal, paid: Decimal, cancelled: bool = False) -> str:
    if cancelled: return "CANCELLED"
    if paid < 0 or paid > grand: raise BusinessRuleError("paid amount out of range")
    return "PAID" if paid == grand else ("PARTIALLY_PAID" if paid > 0 else "POSTED")


def allocate_payment(amount, outstanding: List[Decimal]) -> List[Decimal]:
    """Apply a payment to invoices in order (oldest first). Returns amounts per invoice;
    any remainder is left unallocated (customer/supplier credit, see Q8)."""
    left = money(amount)
    if left <= 0: raise BusinessRuleError("payment must be positive")
    out = []
    for o in outstanding:
        take = min(left, money(o)); out.append(take); left -= take
    return out


def returnable_qty(sold, already_returned) -> Decimal:
    r = D(sold) - D(already_returned)
    return r if r > 0 else Decimal("0")


def check_return(sold, already_returned, requested) -> None:
    if D(requested) <= 0: raise BusinessRuleError("return quantity must be positive")
    if D(requested) > returnable_qty(sold, already_returned):
        raise BusinessRuleError("return exceeds quantity sold")
