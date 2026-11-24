import unittest
from decimal import Decimal as Dec

from domain import journal as j
from domain.money import D, money
from domain.wac import InsufficientStock, StockPosition, stock_in, stock_out


class WacTests(unittest.TestCase):
    def test_first_receipt_sets_cost(self):
        r = stock_in(StockPosition(), 10, "5.00")
        self.assertEqual((r.position.quantity, r.position.avg_cost), (Dec("10.000"), Dec("5.0000")))

    def test_weighted_average(self):
        p = stock_in(StockPosition(), 10, "5").position
        p = stock_in(p, 30, "9").position  # (50+270)/40 = 8
        self.assertEqual(p.avg_cost, Dec("8.0000"))
        self.assertEqual(p.value, Dec("320.00"))

    def test_out_uses_avg_and_keeps_it(self):
        p = stock_in(StockPosition(), 40, "8").position
        r = stock_out(p, 15)
        self.assertEqual(r.unit_cost, Dec("8.0000"))
        self.assertEqual(r.total_cost, Dec("120.00"))
        self.assertEqual(r.position.avg_cost, Dec("8.0000"))
        self.assertEqual(r.position.quantity, Dec("25.000"))

    def test_non_terminating_average_rounds_half_up(self):
        p = stock_in(StockPosition(), 3, "10").position
        p = stock_in(p, 1, "10.0001").position
        self.assertEqual(p.avg_cost, Dec("10.0000"))
        p = stock_in(StockPosition(), 1, "1").position
        p = stock_in(p, 2, "1.0001").position  # 3.0002/3 = 1.000066.. -> 1.0001
        self.assertEqual(p.avg_cost, Dec("1.0001"))

    def test_negative_stock_blocked_by_default(self):
        p = stock_in(StockPosition(), 5, "2").position
        with self.assertRaises(InsufficientStock):
            stock_out(p, 6)
        self.assertEqual(stock_out(p, 6, allow_negative=True).position.quantity, Dec("-1.000"))

    def test_sell_all_then_restock_resets_cost(self):
        p = stock_in(StockPosition(), 5, "2").position
        p = stock_out(p, 5).position
        p = stock_in(p, 5, "7").position
        self.assertEqual(p.avg_cost, Dec("7.0000"))

    def test_rejects_float_and_bad_input(self):
        with self.assertRaises(TypeError):
            D(1.1)
        with self.assertRaises(ValueError):
            stock_in(StockPosition(), 0, "1")
        with self.assertRaises(ValueError):
            stock_out(StockPosition(Dec("5")), -1)


class JournalTests(unittest.TestCase):
    def test_sales_invoice_balances(self):
        lines = j.sales_invoice("1000.00", "140.00", "620.00")
        self.assertEqual(sum(l.debit for l in lines), sum(l.credit for l in lines))
        self.assertEqual(sum(l.debit for l in lines), Dec("1760.00"))

    def test_purchase_invoice_balances(self):
        lines = j.purchase_invoice("500", "70")
        self.assertEqual(sum(l.debit for l in lines), Dec("570.00"))

    def test_unbalanced_rejected(self):
        with self.assertRaises(j.UnbalancedEntry):
            j.validate([j.Line("A", Dec("10")), j.Line("B", j.ZERO, Dec("9"))])
        with self.assertRaises(j.UnbalancedEntry):
            j.validate([j.Line("A", Dec("10"), Dec("10")), j.Line("B", j.ZERO, Dec("0"))])

    def test_reversal_nets_to_zero(self):
        e = j.sales_invoice("100", "14", "60")
        tb = j.trial_balance([e, j.reverse(e)])
        self.assertTrue(all(v == 0 for v in tb.values()))

    def test_full_cycle_ledger(self):
        # buy 40 @ 8 (+14% tax), sell 15 @ 20 (+14% tax) at WAC, collect and pay in part
        buy_net = money(40 * D("8")); buy_tax = money(buy_net * D("0.14"))
        cogs = stock_out(stock_in(StockPosition(), 40, "8").position, 15).total_cost
        sale_net = money(15 * D("20")); sale_tax = money(sale_net * D("0.14"))
        book = [
            j.purchase_invoice(buy_net, buy_tax),
            j.sales_invoice(sale_net, sale_tax, cogs),
            j.customer_receipt("100"),
            j.supplier_payment("200"),
        ]
        tb = j.trial_balance(book)
        self.assertEqual(tb["INVENTORY"], buy_net - cogs)          # 320 - 120 = 200
        self.assertEqual(tb["AR"], sale_net + sale_tax - 100)
        self.assertEqual(tb["AP"], -(buy_net + buy_tax - 200))
        self.assertEqual(tb["COGS"], cogs)
        self.assertEqual(tb["CASH"], Dec("-100.00"))


if __name__ == "__main__":
    unittest.main()
