"""Double-entry primitives and posting rules (account *keys*, mapped to real accounts by settings)."""
from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional

from .money import D, money

ZERO = Decimal("0.00")


class UnbalancedEntry(Exception):
    pass


@dataclass(frozen=True)
class Line:
    account: str
    debit: Decimal = ZERO
    credit: Decimal = ZERO


def validate(lines: List[Line]) -> None:
    if len(lines) < 2:
        raise UnbalancedEntry("an entry needs at least two lines")
    for l in lines:
        if l.debit < 0 or l.credit < 0 or (l.debit == 0) == (l.credit == 0):
            raise UnbalancedEntry(f"line must have exactly one positive side: {l}")
    if sum(l.debit for l in lines) != sum(l.credit for l in lines):
        raise UnbalancedEntry("total debits must equal total credits")


def reverse(lines: List[Line]) -> List[Line]:
    return [Line(l.account, l.credit, l.debit) for l in lines]


def _dr(a, v): return Line(a, money(v), ZERO)
def _cr(a, v): return Line(a, ZERO, money(v))


def sales_invoice(net, tax, cogs) -> List[Line]:
    """AR = net + tax. Revenue = net. COGS at WAC. Zero lines are dropped."""
    net, tax, cogs = money(net), money(tax), money(cogs)
    lines = [_dr("AR", net + tax), _cr("SALES", net)]
    if tax: lines.append(_cr("TAX_PAYABLE", tax))
    if cogs: lines += [_dr("COGS", cogs), _cr("INVENTORY", cogs)]
    out = [l for l in lines]
    validate(out)
    return out


def purchase_invoice(net, tax) -> List[Line]:
    net, tax = money(net), money(tax)
    lines = [_dr("INVENTORY", net)]
    if tax: lines.append(_dr("TAX_RECEIVABLE", tax))
    lines.append(_cr("AP", net + tax))
    validate(lines)
    return lines


def customer_receipt(amount, cash_account="CASH") -> List[Line]:
    return validate_ret([_dr(cash_account, amount), _cr("AR", amount)])


def supplier_payment(amount, cash_account="CASH") -> List[Line]:
    return validate_ret([_dr("AP", amount), _cr(cash_account, amount)])


def validate_ret(lines):
    validate(lines)
    return lines


def trial_balance(entries: List[List[Line]]):
    """Return {account: net debit-credit} and assert the whole book balances."""
    tb = {}
    for lines in entries:
        validate(lines)
        for l in lines:
            tb[l.account] = tb.get(l.account, ZERO) + l.debit - l.credit
    assert sum(tb.values()) == 0, "trial balance does not net to zero"
    return tb
