import unittest
from decimal import Decimal as Dec
from domain.invoicing import *
from domain.permissions import ROLES, ALL, has_perm


class LineTests(unittest.TestCase):
    def test_exclusive_tax_with_percent_discount(self):
        r = calc_line(LineInput(Dec("3"), Dec("100"), discount_percent=Dec("10"), tax_rate=Dec("14")))
        self.assertEqual((r.discount, r.net, r.tax, r.total), (Dec("30.00"), Dec("270.00"), Dec("37.80"), Dec("307.80")))

    def test_inclusive_tax_splits_back_exactly(self):
        r = calc_line(LineInput(Dec("1"), Dec("114"), tax_rate=Dec("14"), tax_inclusive=True))
        self.assertEqual((r.net, r.tax, r.total), (Dec("100.00"), Dec("14.00"), Dec("114.00")))

    def test_inclusive_always_sums_to_gross(self):
        r = calc_line(LineInput(Dec("3"), Dec("9.99"), tax_rate=Dec("14"), tax_inclusive=True))
        self.assertEqual(r.total, Dec("29.97"))

    def test_bad_discounts(self):
        with self.assertRaises(BusinessRuleError):
            calc_line(LineInput(Dec("1"), Dec("10"), discount_percent=Dec("5"), discount_amount=Dec("1")))
        with self.assertRaises(BusinessRuleError):
            calc_line(LineInput(Dec("1"), Dec("10"), discount_amount=Dec("11")))
        with self.assertRaises(BusinessRuleError):
            calc_line(LineInput(Dec("0"), Dec("10")))

    def test_totals(self):
        rs = [calc_line(LineInput(Dec("1"), Dec("100"), tax_rate=Dec("14"))) for _ in range(2)]
        t = totals(rs)
        self.assertEqual((t.net, t.tax, t.grand), (Dec("200.00"), Dec("28.00"), Dec("228.00")))


class GuardTests(unittest.TestCase):
    def test_min_price(self):
        l = LineInput(Dec("1"), Dec("90"), min_price=Dec("100"))
        with self.assertRaises(BusinessRuleError):
            check_min_price(l, can_override=False)
        self.assertTrue(check_min_price(l, can_override=True))
        self.assertFalse(check_min_price(LineInput(Dec("1"), Dec("100"), min_price=Dec("100")), False))

    def test_min_price_counts_discount(self):
        l = LineInput(Dec("1"), Dec("110"), discount_percent=Dec("10"), min_price=Dec("100"))
        with self.assertRaises(BusinessRuleError):
            check_min_price(l, False)

    def test_status(self):
        self.assertEqual(invoice_status(Dec("100"), Dec("0")), "POSTED")
        self.assertEqual(invoice_status(Dec("100"), Dec("40")), "PARTIALLY_PAID")
        self.assertEqual(invoice_status(Dec("100"), Dec("100")), "PAID")
        self.assertEqual(invoice_status(Dec("100"), Dec("0"), cancelled=True), "CANCELLED")
        with self.assertRaises(BusinessRuleError):
            invoice_status(Dec("100"), Dec("101"))

    def test_allocation(self):
        self.assertEqual(allocate_payment("150", [Dec("100"), Dec("100")]), [Dec("100.00"), Dec("50.00")])
        self.assertEqual(allocate_payment("30", [Dec("100")]), [Dec("30.00")])
        self.assertEqual(allocate_payment("500", [Dec("100")]), [Dec("100.00")])  # remainder = credit
        with self.assertRaises(BusinessRuleError):
            allocate_payment("0", [Dec("1")])

    def test_returns(self):
        check_return(10, 4, 6)
        with self.assertRaises(BusinessRuleError):
            check_return(10, 4, 7)
        with self.assertRaises(BusinessRuleError):
            check_return(10, 0, 0)


class PermissionTests(unittest.TestCase):
    def test_matrix(self):
        self.assertTrue(all(p in ALL for r in ROLES.values() for p in r))
        self.assertTrue(has_perm("admin", "users.manage"))
        self.assertFalse(has_perm("sales", "sales.sell_below_min_price"))
        self.assertFalse(has_perm("warehouse", "sales.create"))
        self.assertFalse(has_perm("accountant", "inventory.adjust"))
        self.assertTrue(has_perm("accountant", "accounting.post_manual"))
        self.assertFalse(has_perm("manager", "users.manage"))
        with self.assertRaises(KeyError):
            has_perm("admin", "nope")


if __name__ == "__main__":
    unittest.main()
