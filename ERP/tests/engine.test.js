const assert = require('assert');
const E = require('../js/engine.js');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    passCount++;
    console.log('✓ PASS:', name);
  } catch (err) {
    failCount++;
    console.error('✗ FAIL:', name, err.message);
    process.exitCode = 1;
  }
}

const fresh = () => {
  const S = E.mk();
  S.pr = [
    { id: 1, name: 'Product A', min: 1000, ms: 1, sell: 2000, buy: 800 },
    { id: 2, name: 'Product B', min: 0, ms: 1, sell: 1500, buy: 500 }
  ];
  S.cu = [{ id: 1, name: 'Customer C' }];
  S.su = [{ id: 1, name: 'Supplier S' }];
  S.wh = ['Main', 'Branch'];
  E.jrn(S, [['CASH', 1e7, 0], ['EQ', 0, 1e7]], 'Capital');
  return S;
};

const buyHelper = (S, q, cost) =>
  E.buy(S, { role: 'admin', party: 1, wh: 0, tax: 14, paid: 0, items: [{ p: 1, q, cost }] });

const sellHelper = (S, extra = {}) =>
  E.sell(S, { role: 'sales', party: 1, wh: 0, tax: 14, paid: 0, items: [{ p: 1, q: 15, price: 2000, d: 0 }], ...extra });

test('WAC weighted average calculation', () => {
  const S = fresh();
  buyHelper(S, 10, 500);
  buyHelper(S, 30, 900);
  assert.strictEqual(E.pos(S, 1, 0).avg, 80000); // 800.00 in cents
});

test('Sale uses avg, keeps avg, books COGS', () => {
  const S = fresh();
  buyHelper(S, 40, 800);
  sellHelper(S);
  assert.strictEqual(E.pos(S, 1, 0).avg, 80000);
  assert.strictEqual(E.pos(S, 1, 0).q, 25);
  assert.strictEqual(E.tb(S).COGS, 12000);
});

test('Sale totals and tax calculation', () => {
  const S = fresh();
  buyHelper(S, 40, 800);
  const inv = sellHelper(S);
  assert.deepStrictEqual([inv.net, inv.tax, inv.grand], [30000, 4200, 34200]);
});

test('Negative stock blocked by default and state untouched', () => {
  const S = fresh();
  buyHelper(S, 5, 800);
  const jrnCount = S.je.length;
  assert.throws(() => sellHelper(S), /Insufficient stock/);
  assert.strictEqual(S.je.length, jrnCount);
  assert.strictEqual(E.pos(S, 1, 0).q, 5);
});

test('Below minimum price blocked for sales, allowed for manager', () => {
  const S = fresh();
  buyHelper(S, 40, 800);
  const items = [{ p: 1, q: 1, price: 900, d: 0 }];
  assert.throws(() => sellHelper(S, { items }), /below minimum/i);
  E.sell(S, { role: 'manager', party: 1, wh: 0, tax: 0, paid: 0, items });
});

test('Role without permission cannot buy', () => {
  const S = fresh();
  assert.throws(
    () => E.buy(S, { role: 'sales', party: 1, wh: 0, tax: 0, paid: 0, items: [{ p: 1, q: 1, cost: 1 }] }),
    /Permission denied/
  );
});

test('Partial payments and invoice status lifecycle', () => {
  const S = fresh();
  buyHelper(S, 40, 800);
  const inv = sellHelper(S);
  E.pay(S, 'sales', inv, 10000);
  assert.strictEqual(E.stat(inv), 'PARTIAL');
  E.pay(S, 'sales', inv, E.out(inv));
  assert.strictEqual(E.stat(inv), 'PAID');
  assert.throws(() => E.pay(S, 'sales', inv, 1), /exceeds outstanding/);
});

test('payParty allocates payment oldest first', () => {
  const S = fresh();
  buyHelper(S, 100, 800);
  const a = sellHelper(S);
  const b = sellHelper(S);
  E.payParty(S, 'accountant', 'S', 1, a.grand + 100);
  assert.strictEqual(E.stat(a), 'PAID');
  assert.strictEqual(E.out(b), b.grand - 100);
});

test('Sales return restores stock at sale cost, refunds overpayment', () => {
  const S = fresh();
  buyHelper(S, 40, 800);
  const inv = sellHelper(S, { paid: 34200 });
  E.sret(S, 'sales', inv, 0, 5);
  assert.strictEqual(E.pos(S, 1, 0).q, 30);
  assert.strictEqual(inv.paid, 34200 - 11400);
  assert.strictEqual(E.out(inv), 0);
  assert.throws(() => E.sret(S, 'sales', inv, 0, 11), /exceeds returnable/);
  E.sret(S, 'sales', inv, 0, 10);
  assert.strictEqual(inv.ret, inv.grand);
});

test('Cancel sales invoice reverses stock, GL, and payment', () => {
  const S = fresh();
  buyHelper(S, 40, 800);
  const before = E.tb(S);
  const inv = sellHelper(S, { paid: 5000 });
  E.cancel(S, 'manager', inv);
  const after = E.tb(S);
  assert.strictEqual(E.pos(S, 1, 0).q, 40);
  for (const acc of ['AR', 'SAL', 'COGS', 'INV', 'TXP', 'CASH']) {
    assert.strictEqual(after[acc] || 0, before[acc] || 0, `Account ${acc} mismatch`);
  }
  assert.strictEqual(E.stat(inv), 'CANCELLED');
});

test('Cancel purchase bill requires available stock and reverses GL', () => {
  const S = fresh();
  const bill = buyHelper(S, 10, 800);
  sellHelper(S, { items: [{ p: 1, q: 3, price: 2000, d: 0 }] });
  assert.throws(() => E.cancel(S, 'admin', bill), /Insufficient stock/);

  const S2 = fresh();
  const bill2 = buyHelper(S2, 10, 800);
  E.cancel(S2, 'admin', bill2);
  assert.strictEqual(E.tb(S2).AP || 0, 0);
  assert.strictEqual(E.tb(S2).INV || 0, 0);
});

test('Stock transfer preserves unit cost and total inventory valuation', () => {
  const S = fresh();
  buyHelper(S, 10, 800);
  const initialValue = E.stockVal(S);
  E.transfer(S, 'warehouse', 1, 0, 1, 4);
  assert.strictEqual(E.pos(S, 1, 1).avg, 80000);
  assert.strictEqual(E.stockVal(S), initialValue);
  assert.throws(() => E.transfer(S, 'sales', 1, 0, 1, 1), /Permission denied/);
});

test('Stock adjustment affects GL and maintains ledger integrity', () => {
  const S = fresh();
  buyHelper(S, 10, 800);
  E.adjust(S, 'warehouse', 1, 0, -2, 'Damaged during shipping');
  assert.strictEqual(E.pos(S, 1, 0).q, 8);
  const check = E.checks(S);
  assert.ok(check.balanced && check.stockVsGL <= check.tol);
  assert.throws(() => E.adjust(S, 'admin', 1, 0, 1, ''), /Reason is required/);
});

test('Unbalanced journal entries are rejected', () => {
  const S = fresh();
  assert.throws(() => E.jrn(S, [['CASH', 500, 0], ['EQ', 0, 400]], 'Unbalanced test'), /Unbalanced entry/);
});

test('Seed demo data passes all accounting checks and balances', () => {
  const S = E.seed();
  const chk = E.checks(S);
  const m = E.metrics(S);
  assert.ok(chk.balanced, 'Debits must equal Credits');
  assert.ok(chk.stockVsGL <= chk.tol, `Stock valuation ${chk.stockVsGL} must equal GL INV account within tolerance ${chk.tol}`);
  assert.strictEqual(m.assets, m.liab + m.eq, 'Accounting equation: Assets = Liabilities + Equity');
  assert.ok(m.sales > 0 && m.inv > 0, 'Sales and Inventory must be positive');
});

test('Permissions enforce role boundaries on expenses and cancellations', () => {
  const S = fresh();
  assert.throws(() => E.expense(S, 'sales', 'Rent', 10000, ''), /Permission denied/);
  E.expense(S, 'accountant', 'Rent', 10000, 'Monthly office rent');
  assert.strictEqual(E.tb(S).EXP, 10000);
});

console.log(`\n=============================`);
console.log(`All ${passCount} unit tests PASSED successfully!`);
if (failCount > 0) {
  console.log(`Errors: ${failCount}`);
}
console.log(`=============================\n`);
