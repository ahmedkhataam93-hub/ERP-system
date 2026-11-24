/**
 * SmartTrade ERP Core Engine
 * Professional Double-Entry Accounting & Moving Weighted Average Cost (WAC) Engine
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    const exported = factory();
    module.exports = exported;
    if (root) root.SmartTradeEngine = exported;
  } else {
    root.SmartTradeEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const R = Math.round;

  function need(condition, message) {
    if (!condition) {
      const err = new Error(message);
      err.isBusinessError = true;
      throw err;
    }
  }

  // Account Categories: A = Asset, L = Liability, Q = Equity, R = Revenue, X = Expense
  const TYPE = {
    CASH: 'A',
    BANK: 'A',
    AR: 'A',
    INV: 'A',
    TXR: 'A',
    AP: 'L',
    TXP: 'L',
    EQ: 'Q',
    SAL: 'R',
    COGS: 'X',
    EXP: 'X'
  };

  const RIGHTS = {
    sell: ['admin', 'manager', 'sales'],
    below: ['admin', 'manager'],
    buy: ['admin', 'manager', 'warehouse'],
    adj: ['admin', 'manager', 'warehouse'],
    tr: ['admin', 'manager', 'warehouse'],
    exp: ['admin', 'manager', 'accountant'],
    pay: ['admin', 'manager', 'accountant', 'sales'],
    cancel: ['admin', 'manager'],
    post: ['admin', 'manager', 'accountant'],
    manage_products: ['admin', 'manager', 'warehouse'],
    manage_partners: ['admin', 'manager', 'sales'],
    close_period: ['admin', 'accountant']
  };

  function can(role, action) {
    if (!RIGHTS[action]) return false;
    return RIGHTS[action].includes(role);
  }

  function mk() {
    return {
      company: {
        name: 'SmartTrade Enterprise Ltd.',
        taxId: 'EG-948-283-11',
        phone: '+20 2 2795 4321',
        email: 'info@smarttrade-erp.com',
        address: '42 Smart Business Park, New Cairo, Egypt',
        currency: 'EGP',
        defaultTax: 14,
        allowNegativeStock: false
      },
      today: '2026-11-18',
      pr: [],
      cu: [],
      su: [],
      wh: ['Main Cairo Warehouse', 'Alexandria Hub', 'Giza Retail Depot'],
      st: {}, // key: "p|w" => { q: number, avg: number (in cents) }
      iv: [], // invoices
      je: [], // journal entries
      ex: [], // expenses
      mv: [], // stock movements
      au: [], // audit trail
      seq: { S: 0, P: 0, JE: 0, EX: 0, PR: 0, CU: 0, SU: 0 }
    };
  }

  function pos(S, p, w) {
    const key = `${p}|${w}`;
    if (!S.st[key]) {
      S.st[key] = { q: 0, avg: 0 };
    }
    return S.st[key];
  }

  function val(q, avgInCents) {
    return R((q * avgInCents) / 100);
  }

  function pn(S, id) {
    return S.pr.find(x => x.id == id);
  }

  function log(S, userRole, action, details) {
    if (!S.au) S.au = [];
    S.au.push({
      t: S.today || new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      u: userRole,
      a: action,
      x: typeof details === 'object' ? JSON.stringify(details) : String(details || '')
    });
  }

  function jrn(S, rawLines, memo, ref) {
    // Filter out zero amount lines
    const L = rawLines.filter(l => (l[1] && l[1] > 0) || (l[2] && l[2] > 0));
    need(L.length >= 2, 'Journal entry requires at least two lines');

    let totalDebit = 0;
    let totalCredit = 0;

    for (const [acc, dr, cr] of L) {
      need(TYPE[acc], `Unknown account: ${acc}`);
      need(dr >= 0 && cr >= 0, 'Line amounts cannot be negative');
      need(!(dr > 0 && cr > 0), 'Line cannot have both debit and credit');
      need(dr > 0 || cr > 0, 'Line must have either debit or credit');
      totalDebit += dr;
      totalCredit += cr;
    }

    need(totalDebit === totalCredit, `Unbalanced entry: Dr ${totalDebit} != Cr ${totalCredit}`);

    S.seq.JE = (S.seq.JE || 0) + 1;
    const entry = {
      id: S.seq.JE,
      date: S.today,
      memo: memo || 'Journal entry',
      ref: ref || '',
      L
    };
    S.je.push(entry);
    return entry.id;
  }

  // Stock In: Moving Weighted Average Cost
  function wIn(S, productId, warehouseId, qty, unitCostInCents, type, ref) {
    need(qty > 0, 'Stock in quantity must be positive');
    need(unitCostInCents >= 0, 'Unit cost cannot be negative');

    const s = pos(S, productId, warehouseId);
    if (s.q <= 0) {
      s.avg = unitCostInCents;
    } else {
      s.avg = R((s.q * s.avg + qty * unitCostInCents) / (s.q + qty));
    }
    s.q += qty;

    S.mv.push({
      d: S.today,
      p: productId,
      w: warehouseId,
      q: qty,
      c4: unitCostInCents,
      type: type || 'RECEIPT',
      ref: ref || ''
    });
  }

  // Stock Out: Average Cost is maintained, decreases inventory
  function wOut(S, productId, warehouseId, qty, type, ref) {
    need(qty > 0, 'Stock out quantity must be positive');
    const s = pos(S, productId, warehouseId);
    const allowNegative = S.company && S.company.allowNegativeStock;

    if (!allowNegative) {
      const prod = pn(S, productId);
      const prodName = prod ? prod.name : `Product #${productId}`;
      need(qty <= s.q, `Insufficient stock for ${prodName} (Requested: ${qty}, Available: ${s.q})`);
    }

    s.q -= qty;
    const unitCost = s.avg || 0;

    S.mv.push({
      d: S.today,
      p: productId,
      w: warehouseId,
      q: -qty,
      c4: unitCost,
      type: type || 'ISSUE',
      ref: ref || ''
    });

    return unitCost;
  }

  function out(invoice) {
    if (invoice.x) return 0;
    const due = invoice.grand - (invoice.ret || 0) - (invoice.paid || 0);
    return due > 0 ? due : 0;
  }

  function stat(invoice) {
    if (invoice.x) return 'CANCELLED';
    const due = out(invoice);
    if (due === 0 && invoice.paid > 0) return 'PAID';
    if (invoice.paid > 0) return 'PARTIAL';
    return 'POSTED';
  }

  function mkInv(S, t, options, lines, net, tax, jrnId) {
    S.seq[t] = (S.seq[t] || 0) + 1;
    const prefix = t === 'S' ? 'INV' : 'BILL';
    const num = `${prefix}-${String(S.seq[t]).padStart(5, '0')}`;

    const invoice = {
      id: S.iv.length + 1,
      t,
      num,
      d: S.today,
      party: +options.party,
      wh: +options.wh,
      lines,
      net,
      tax,
      grand: net + tax,
      paid: 0,
      ret: 0,
      x: false,
      notes: options.notes || '',
      paymentTerms: options.paymentTerms || 'Immediate',
      je: [jrnId]
    };

    S.iv.push(invoice);
    return invoice;
  }

  // Sales Order / Invoice
  function sell(S, opt) {
    need(can(opt.role, 'sell'), 'Permission denied: Cannot create sales invoices');
    need(opt.items && opt.items.length > 0, 'Invoice must contain at least one line item');

    const aggregatedQty = {};
    for (const item of opt.items) {
      const p = pn(S, item.p);
      need(p, `Invalid product ID: ${item.p}`);
      need(item.q > 0, `Quantity must be positive for ${p.name}`);
      need(item.price >= 0, `Price cannot be negative for ${p.name}`);
      const discount = item.d || 0;
      need(discount >= 0 && discount <= 100, `Discount percent must be between 0 and 100 for ${p.name}`);

      const effectivePrice = item.price * (1 - discount / 100);
      if (p.min && effectivePrice < p.min) {
        need(can(opt.role, 'below'), `Price below minimum allowed selling price for ${p.name} (Min: ${(p.min/100).toFixed(2)})`);
        log(S, opt.role, 'OVERRIDE_MIN_PRICE', `${p.name} sold at ${(effectivePrice/100).toFixed(2)} vs min ${(p.min/100).toFixed(2)}`);
      }

      aggregatedQty[item.p] = (aggregatedQty[item.p] || 0) + item.q;
    }

    if (!S.company || !S.company.allowNegativeStock) {
      for (const prodId in aggregatedQty) {
        const available = pos(S, prodId, opt.wh).q;
        const prod = pn(S, prodId);
        need(aggregatedQty[prodId] <= available, `Insufficient stock for ${prod.name} (Requested: ${aggregatedQty[prodId]}, In Stock: ${available})`);
      }
    }

    const nextSeq = (S.seq.S || 0) + 1;
    const invNum = `INV-${String(nextSeq).padStart(5, '0')}`;
    let net = 0;
    let tax = 0;
    let cogs = 0;

    const taxPercent = opt.tax !== undefined ? opt.tax : 14;

    const processedLines = opt.items.map(item => {
      const gross = item.q * item.price;
      const discount = item.d || 0;
      const lineNet = gross - R(gross * discount / 100);
      const lineTax = R(lineNet * taxPercent / 100);
      const unitAvgCost = wOut(S, item.p, opt.wh, item.q, 'SALE', invNum);
      const lineCogs = val(item.q, unitAvgCost);

      cogs += lineCogs;
      net += lineNet;
      tax += lineTax;

      return {
        ...item,
        n: lineNet,
        t: lineTax,
        c4: unitAvgCost,
        r: 0,
        rn: 0,
        rt: 0
      };
    });

    const journalLines = [
      ['AR', net + tax, 0],
      ['SAL', 0, net]
    ];
    if (tax > 0) journalLines.push(['TXP', 0, tax]);
    if (cogs > 0) {
      journalLines.push(['COGS', cogs, 0]);
      journalLines.push(['INV', 0, cogs]);
    }

    const jrnId = jrn(S, journalLines, `Sales Invoice ${invNum}`, invNum);
    const invoice = mkInv(S, 'S', opt, processedLines, net, tax, jrnId);

    log(S, opt.role, 'POST_SALE', `${invoice.num} - Total: ${(invoice.grand / 100).toFixed(2)}`);

    if (opt.paid && opt.paid > 0) {
      const payAmount = Math.min(opt.paid, invoice.grand);
      pay(S, opt.role, invoice, payAmount, opt.paymentMethod || 'CASH');
    }

    return invoice;
  }

  // Purchase Bill
  function buy(S, opt) {
    need(can(opt.role, 'buy'), 'Permission denied: Cannot create purchase bills');
    need(opt.items && opt.items.length > 0, 'Purchase must contain at least one line item');

    const nextSeq = (S.seq.P || 0) + 1;
    const billNum = `BILL-${String(nextSeq).padStart(5, '0')}`;
    let net = 0;

    for (const item of opt.items) {
      const p = pn(S, item.p);
      need(p, `Invalid product ID: ${item.p}`);
      need(item.q > 0, `Quantity must be positive for ${p.name}`);
      need(item.cost >= 0, `Cost cannot be negative for ${p.name}`);
    }

    const processedLines = opt.items.map(item => {
      const lineNet = item.q * item.cost;
      net += lineNet;
      wIn(S, item.p, opt.wh, item.q, item.cost * 100, 'PURCHASE', billNum);
      return {
        ...item,
        n: lineNet
      };
    });

    const taxPercent = opt.tax !== undefined ? opt.tax : 14;
    const tax = R(net * taxPercent / 100);

    const journalLines = [
      ['INV', net, 0]
    ];
    if (tax > 0) journalLines.push(['TXR', tax, 0]);
    journalLines.push(['AP', 0, net + tax]);

    const jrnId = jrn(S, journalLines, `Purchase Bill ${billNum}`, billNum);
    const invoice = mkInv(S, 'P', opt, processedLines, net, tax, jrnId);

    log(S, opt.role, 'POST_PURCHASE', `${invoice.num} - Total: ${(invoice.grand / 100).toFixed(2)}`);

    if (opt.paid && opt.paid > 0) {
      const payAmount = Math.min(opt.paid, invoice.grand);
      pay(S, opt.role, invoice, payAmount, opt.paymentMethod || 'CASH');
    }

    return invoice;
  }

  // Payment against an Invoice
  function pay(S, role, invoice, amountInCents, paymentAccount = 'CASH') {
    need(can(role, 'pay'), 'Permission denied: Cannot record payments');
    need(!invoice.x, 'Cannot pay a cancelled invoice');
    const remainingDue = out(invoice);
    need(amountInCents > 0, 'Payment amount must be greater than zero');
    need(amountInCents <= remainingDue, `Amount (${(amountInCents/100).toFixed(2)}) exceeds outstanding due (${(remainingDue/100).toFixed(2)})`);

    const acc = paymentAccount === 'BANK' ? 'BANK' : 'CASH';

    let journalLines;
    if (invoice.t === 'S') {
      // Customer Payment: Cash/Bank Debit, AR Credit
      journalLines = [
        [acc, amountInCents, 0],
        ['AR', 0, amountInCents]
      ];
    } else {
      // Supplier Payment: AP Debit, Cash/Bank Credit
      journalLines = [
        ['AP', amountInCents, 0],
        [acc, 0, amountInCents]
      ];
    }

    const jrnId = jrn(S, journalLines, `Payment for ${invoice.num}`, invoice.num);
    invoice.je.push(jrnId);
    invoice.paid = (invoice.paid || 0) + amountInCents;

    log(S, role, 'PAYMENT', `${invoice.num} paid ${(amountInCents/100).toFixed(2)} via ${acc}`);
    return invoice;
  }

  // Bulk / Account Payment (Oldest-First Allocation)
  function payParty(S, role, type, partyId, amountInCents, paymentAccount = 'CASH') {
    need(can(role, 'pay'), 'Permission denied: Cannot record payments');
    need(amountInCents > 0, 'Payment amount must be greater than zero');

    const openInvoices = S.iv
      .filter(i => i.t === type && i.party == partyId && out(i) > 0)
      .sort((a, b) => a.id - b.id); // Oldest first

    const totalDue = openInvoices.reduce((sum, i) => sum + out(i), 0);
    need(amountInCents <= totalDue, `Payment ${(amountInCents/100).toFixed(2)} exceeds total balance ${(totalDue/100).toFixed(2)}`);

    let remaining = amountInCents;
    for (const invoice of openInvoices) {
      if (remaining <= 0) break;
      const due = out(invoice);
      const applyAmount = Math.min(remaining, due);
      if (applyAmount > 0) {
        pay(S, role, invoice, applyAmount, paymentAccount);
        remaining -= applyAmount;
      }
    }
  }

  // Sales Return
  function sret(S, role, invoice, lineIndex, returnQty) {
    need(can(role, 'sell'), 'Permission denied: Cannot process sales returns');
    need(!invoice.x && invoice.t === 'S', 'Invalid sales invoice for return');

    const line = invoice.lines[lineIndex];
    need(line, 'Invoice line not found');
    const returnable = line.q - (line.r || 0);
    need(returnQty > 0, 'Return quantity must be positive');
    need(returnQty <= returnable, `Return quantity (${returnQty}) exceeds returnable quantity (${returnable})`);

    const isFinalReturn = returnQty === returnable;
    const returnNet = isFinalReturn ? (line.n - (line.rn || 0)) : R(line.n * returnQty / line.q);
    const returnTax = isFinalReturn ? (line.t - (line.rt || 0)) : R(line.t * returnQty / line.q);
    const returnCogs = val(returnQty, line.c4);

    // Return goods back to stock at original cost
    wIn(S, line.p, invoice.wh, returnQty, line.c4, 'SALE_RETURN', invoice.num);

    // Reversal journal entry: SAL Dr, TXP Dr, AR Cr, INV Dr, COGS Cr
    const journalLines = [
      ['SAL', returnNet, 0],
      ['AR', 0, returnNet + returnTax],
      ['INV', returnCogs, 0],
      ['COGS', 0, returnCogs]
    ];
    if (returnTax > 0) {
      journalLines.splice(1, 0, ['TXP', returnTax, 0]);
    }

    const jrnId = jrn(S, journalLines, `Return on ${invoice.num}`, invoice.num);
    invoice.je.push(jrnId);

    line.r = (line.r || 0) + returnQty;
    line.rn = (line.rn || 0) + returnNet;
    line.rt = (line.rt || 0) + returnTax;
    invoice.ret = (invoice.ret || 0) + returnNet + returnTax;

    // If customer already paid more than new grand total, refund immediately
    const maxPayable = invoice.grand - invoice.ret;
    const overpayment = (invoice.paid || 0) - maxPayable;
    if (overpayment > 0) {
      const refundJrnId = jrn(S, [
        ['AR', overpayment, 0],
        ['CASH', 0, overpayment]
      ], `Cash Refund for ${invoice.num}`, invoice.num);
      invoice.je.push(refundJrnId);
      invoice.paid -= overpayment;
    }

    log(S, role, 'SALES_RETURN', `${invoice.num}: returned ${returnQty} of product #${line.p}`);
    return invoice;
  }

  // Cancel Invoice with complete reversal
  function cancel(S, role, invoice) {
    need(can(role, 'cancel'), 'Permission denied: Cannot cancel invoices');
    need(!invoice.x, 'Invoice is already cancelled');
    need(!invoice.ret || invoice.ret === 0, 'Cannot cancel invoice after partial returns have been processed');

    const firstJrn = S.je.find(j => j.id === invoice.je[0]);
    need(firstJrn, 'Original journal entry missing');

    if (invoice.t === 'S') {
      // Return all goods to warehouse at original cost
      for (const line of invoice.lines) {
        wIn(S, line.p, invoice.wh, line.q, line.c4, 'CANCEL', invoice.num);
      }
      // Reverse original sale entry lines: swap Dr and Cr
      const reversedLines = firstJrn.L.map(([acc, dr, cr]) => [acc, cr, dr]);
      jrn(S, reversedLines, `Cancel ${invoice.num}`, invoice.num);

      // If customer paid, refund cash
      if (invoice.paid && invoice.paid > 0) {
        jrn(S, [
          ['AR', invoice.paid, 0],
          ['CASH', 0, invoice.paid]
        ], `Refund on Cancel ${invoice.num}`, invoice.num);
      }
    } else {
      // Purchase cancellation: must have sufficient stock to return
      let cogsDelta = 0;
      for (const line of invoice.lines) {
        cogsDelta += val(line.q, wOut(S, line.p, invoice.wh, line.q, 'CANCEL', invoice.num));
      }

      const journalLines = [
        ['AP', invoice.grand, 0],
        ['INV', 0, cogsDelta]
      ];
      if (invoice.tax > 0) {
        journalLines.push(['TXR', 0, invoice.tax]);
      }
      if (invoice.net > cogsDelta) {
        journalLines.push(['COGS', invoice.net - cogsDelta, 0]);
      } else if (cogsDelta > invoice.net) {
        journalLines.push(['COGS', 0, cogsDelta - invoice.net]);
      }

      jrn(S, journalLines, `Cancel ${invoice.num}`, invoice.num);

      if (invoice.paid && invoice.paid > 0) {
        jrn(S, [
          ['CASH', invoice.paid, 0],
          ['AP', 0, invoice.paid]
        ], `Refund on Cancel ${invoice.num}`, invoice.num);
      }
    }

    invoice.x = true;
    log(S, role, 'CANCEL_INVOICE', invoice.num);
    return invoice;
  }

  // Inter-warehouse Stock Transfer
  function transfer(S, role, productId, fromWarehouse, toWarehouse, qty) {
    need(can(role, 'tr'), 'Permission denied: Cannot perform stock transfers');
    need(fromWarehouse != toWarehouse, 'Source and destination warehouses cannot be the same');
    need(qty > 0, 'Transfer quantity must be positive');

    const costUnit = wOut(S, productId, fromWarehouse, qty, 'TRANSFER_OUT', `To Wh ${toWarehouse}`);
    wIn(S, productId, toWarehouse, qty, costUnit, 'TRANSFER_IN', `From Wh ${fromWarehouse}`);

    const prod = pn(S, productId);
    log(S, role, 'STOCK_TRANSFER', `${qty} of ${prod ? prod.name : productId} from Wh #${fromWarehouse} to #${toWarehouse}`);
  }

  // Inventory Adjustment (audited)
  function adjust(S, role, productId, warehouseId, deltaQty, reason) {
    need(can(role, 'adj'), 'Permission denied: Cannot adjust inventory');
    need(deltaQty !== 0, 'Adjustment quantity cannot be zero');
    need(reason && reason.trim(), 'Reason is required for inventory adjustments');

    const s = pos(S, productId, warehouseId);
    const prod = pn(S, productId);
    const unitCost = s.avg || (prod && prod.buy ? prod.buy * 100 : 0);

    if (deltaQty > 0) {
      wIn(S, productId, warehouseId, deltaQty, unitCost, 'ADJUST_IN', reason);
      const adjustmentValue = val(deltaQty, unitCost);
      jrn(S, [
        ['INV', adjustmentValue, 0],
        ['EXP', 0, adjustmentValue] // Credit expense / inventory gain
      ], `Inventory Surplus: ${reason}`);
    } else {
      const positiveQty = -deltaQty;
      const appliedCost = wOut(S, productId, warehouseId, positiveQty, 'ADJUST_OUT', reason);
      const adjustmentValue = val(positiveQty, appliedCost);
      jrn(S, [
        ['EXP', adjustmentValue, 0], // Shrinkage / damage expense
        ['INV', 0, adjustmentValue]
      ], `Inventory Loss: ${reason}`);
    }

    log(S, role, 'STOCK_ADJUSTMENT', `${prod ? prod.name : productId}: ${deltaQty > 0 ? '+' : ''}${deltaQty} (${reason})`);
  }

  // Operational Expenses
  function expense(S, role, category, amountInCents, note, account = 'CASH') {
    need(can(role, 'exp'), 'Permission denied: Cannot record expenses');
    need(amountInCents > 0, 'Expense amount must be positive');
    need(category && category.trim(), 'Expense category is required');

    const acc = account === 'BANK' ? 'BANK' : 'CASH';
    const jrnId = jrn(S, [
      ['EXP', amountInCents, 0],
      [acc, 0, amountInCents]
    ], `Expense: ${category}${note ? ' - ' + note : ''}`);

    S.seq.EX = (S.seq.EX || 0) + 1;
    const expRecord = {
      id: S.seq.EX,
      d: S.today,
      cat: category,
      a: amountInCents,
      note: note || '',
      acc,
      je: jrnId
    };
    S.ex.push(expRecord);

    log(S, role, 'EXPENSE', `${category}: ${(amountInCents/100).toFixed(2)} (${note || 'No note'})`);
    return expRecord;
  }

  // Manual Journal Entry for Accountant
  function manualJournal(S, role, lines, memo, ref) {
    need(can(role, 'post'), 'Permission denied: Cannot post manual journal entries');
    const jrnId = jrn(S, lines, memo, ref);
    log(S, role, 'MANUAL_JOURNAL', `Entry #${jrnId}: ${memo}`);
    return jrnId;
  }

  // Financial Trial Balance: sum of debits minus credits per account
  function tb(S) {
    const balances = {};
    for (const entry of S.je) {
      for (const [acc, dr, cr] of entry.L) {
        balances[acc] = (balances[acc] || 0) + dr - cr;
      }
    }
    return balances;
  }

  // Stock Valuation in Cents
  function stockVal(S, warehouseId = null) {
    let total = 0;
    for (const key in S.st) {
      if (warehouseId !== null) {
        const parts = key.split('|');
        if (parts[1] != warehouseId) continue;
      }
      const position = S.st[key];
      if (position.q > 0) {
        total += val(position.q, position.avg);
      }
    }
    return total;
  }

  // Executive KPI Metrics
  function metrics(S) {
    const t = tb(S);
    const g = acc => t[acc] || 0;
    const activeInvoices = S.iv.filter(i => !i.x);

    const salesRevenue = -g('SAL');
    const cogs = g('COGS');
    const grossProfit = salesRevenue - cogs;
    const operatingExpenses = g('EXP');
    const netProfit = grossProfit - operatingExpenses;

    const purchasesTotal = activeInvoices.filter(i => i.t === 'P').reduce((sum, i) => sum + i.net, 0);
    const inventoryValuation = stockVal(S);
    const cashBalance = g('CASH');
    const bankBalance = g('BANK');
    const totalLiquidFunds = cashBalance + bankBalance;
    const accountsReceivable = g('AR');
    const accountsPayable = -g('AP');
    const taxReceivable = g('TXR');
    const taxPayable = -g('TXP');

    const totalAssets = totalLiquidFunds + accountsReceivable + inventoryValuation + taxReceivable;
    const totalLiabilities = accountsPayable + taxPayable;
    const totalEquity = -g('EQ') + netProfit;

    return {
      sales: salesRevenue,
      purch: purchasesTotal,
      cogs,
      grossProfit,
      exp: operatingExpenses,
      profit: netProfit,
      inv: inventoryValuation,
      cash: cashBalance,
      bank: bankBalance,
      liquid: totalLiquidFunds,
      ar: accountsReceivable,
      ap: accountsPayable,
      txr: taxReceivable,
      txp: taxPayable,
      assets: totalAssets,
      liab: totalLiabilities,
      eq: totalEquity
    };
  }

  // System Integrity Checks
  function checks(S) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of S.je) {
      for (const line of entry.L) {
        totalDebit += line[1];
        totalCredit += line[2];
      }
    }

    const t = tb(S);
    const stockGlVal = t.INV || 0;
    const actualStockVal = stockVal(S);
    const stockGlDiff = Math.abs(actualStockVal - stockGlVal);
    const tolerance = S.mv.length; // rounding cents tolerance over many movements

    return {
      balanced: totalDebit === totalCredit,
      totalDebit,
      totalCredit,
      stockVsGL: stockGlDiff,
      tol: tolerance,
      isClean: totalDebit === totalCredit && stockGlDiff <= tolerance
    };
  }

  // Seed sample data for testing and demonstrations
  function seed() {
    const S = mk();

    S.pr = [
      { id: 1, sku: 'LAP-PRO-15', barcode: '6221001001', name: 'MacBook Pro 15" M3', cat: 'Computers', buy: 48000, sell: 65000, min: 58000, ms: 5, unit: 'pcs' },
      { id: 2, sku: 'LAP-AIR-13', barcode: '6221001002', name: 'Dell XPS 13" Plus', cat: 'Computers', buy: 36000, sell: 49000, min: 42000, ms: 4, unit: 'pcs' },
      { id: 3, sku: 'MON-4K-27', barcode: '6221002001', name: 'Dell UltraSharp 27" 4K', cat: 'Displays', buy: 12500, sell: 18000, min: 15000, ms: 6, unit: 'pcs' },
      { id: 4, sku: 'MON-CRV-34', barcode: '6221002002', name: 'LG 34" Curved Ultrawide', cat: 'Displays', buy: 16000, sell: 23500, min: 20000, ms: 3, unit: 'pcs' },
      { id: 5, sku: 'MOU-MX-03', barcode: '6221003001', name: 'Logitech MX Master 3S', cat: 'Peripherals', buy: 2100, sell: 3600, min: 2800, ms: 12, unit: 'pcs' },
      { id: 6, sku: 'KEY-MX-MECH', barcode: '6221003002', name: 'Logitech Mechanical Wireless', cat: 'Peripherals', buy: 3200, sell: 5400, min: 4400, ms: 8, unit: 'pcs' },
      { id: 7, sku: 'CAB-TB4-2M', barcode: '6221004001', name: 'Thunderbolt 4 Pro Cable (2m)', cat: 'Accessories', buy: 450, sell: 950, min: 700, ms: 25, unit: 'pcs' },
      { id: 8, sku: 'DOCK-12P', barcode: '6221004002', name: 'Anker 12-in-1 Triple Display Dock', cat: 'Accessories', buy: 4200, sell: 7200, min: 5800, ms: 5, unit: 'pcs' }
    ];
    S.seq.PR = 8;

    S.cu = [
      { id: 1, name: 'Nile Valley Tech Solutions', ph: '+20 100 248 1111', email: 'billing@nilevalley.tech', taxId: 'EG-301-444-12', address: 'Plot 14, Smart Village, Giza', creditLimit: 250000 },
      { id: 2, name: 'Delta Office Systems SAE', ph: '+20 100 888 3333', email: 'procurement@deltaoffice.com', taxId: 'EG-402-999-55', address: '28 El Gomhouria St, Downtown, Cairo', creditLimit: 150000 },
      { id: 3, name: 'Alexandria Digital Agency', ph: '+20 102 555 7777', email: 'finance@alexdigital.io', taxId: 'EG-503-111-88', address: '77 Corniche Road, Alexandria', creditLimit: 100000 },
      { id: 4, name: 'Walk-in Retail Customer', ph: '', email: '', taxId: '', address: 'In-store', creditLimit: 0 }
    ];
    S.seq.CU = 4;

    S.su = [
      { id: 1, name: 'Global Tech Wholesale Hub', ph: '+20 2 3345 8800', email: 'orders@globaltech-hub.com', taxId: 'EG-900-111-01', address: 'Free Zone Area, Nasr City, Cairo' },
      { id: 2, name: 'Apex Peripherals & Displays Co.', ph: '+20 2 2260 9900', email: 'supply@apexperipherals.com', taxId: 'EG-900-222-02', address: 'Industrial Zone 3, 6th of October City' }
    ];
    S.seq.SU = 2;

    // Opening Capital
    S.today = '2026-11-01';
    jrn(S, [
      ['CASH', 20000000, 0], // 200,000 EGP Cash
      ['BANK', 30000000, 0], // 300,000 EGP Bank
      ['EQ', 0, 50000000]    // 500,000 EGP Owner Equity
    ], 'Owner Capital Injection');

    // Initial Stock Purchases
    S.today = '2026-11-02';
    buy(S, {
      role: 'admin',
      party: 1,
      wh: 0,
      tax: 14,
      paid: 500000, // 5,000.00 EGP paid initially
      items: [
        { p: 1, q: 10, cost: 48000 },
        { p: 2, q: 8, cost: 36000 },
        { p: 3, q: 15, cost: 12500 }
      ]
    });

    S.today = '2026-11-04';
    buy(S, {
      role: 'admin',
      party: 2,
      wh: 0,
      tax: 14,
      paid: 200000, // 2,000.00 EGP paid initially
      items: [
        { p: 4, q: 6, cost: 16000 },
        { p: 5, q: 40, cost: 2100 },
        { p: 6, q: 30, cost: 3200 },
        { p: 7, q: 80, cost: 450 },
        { p: 8, q: 12, cost: 4200 }
      ]
    });

    // Inter-warehouse Transfer to Alexandria Hub
    S.today = '2026-11-05';
    transfer(S, 'admin', 1, 0, 1, 2);
    transfer(S, 'admin', 5, 0, 1, 15);
    transfer(S, 'admin', 7, 0, 1, 25);

    // Sales Transactions
    S.today = '2026-11-07';
    const s1 = sell(S, {
      role: 'sales',
      party: 1,
      wh: 0,
      tax: 14,
      paid: 150000, // 1,500.00 EGP paid
      items: [
        { p: 1, q: 2, price: 65000, d: 0 },
        { p: 3, q: 3, price: 18000, d: 5 },
        { p: 5, q: 4, price: 3600, d: 0 }
      ]
    });

    S.today = '2026-11-09';
    const s2 = sell(S, {
      role: 'sales',
      party: 2,
      wh: 0,
      tax: 14,
      paid: 0,
      items: [
        { p: 2, q: 3, price: 49000, d: 2 },
        { p: 6, q: 6, price: 5400, d: 0 },
        { p: 7, q: 15, price: 950, d: 10 }
      ]
    });

    S.today = '2026-11-12';
    const s3 = sell(S, {
      role: 'sales',
      party: 3,
      wh: 1, // Sold from Alexandria Hub
      tax: 14,
      paid: 50000, // 500.00 EGP paid
      items: [
        { p: 1, q: 1, price: 65000, d: 0 },
        { p: 5, q: 5, price: 3600, d: 5 },
        { p: 7, q: 10, price: 950, d: 0 }
      ]
    });

    S.today = '2026-11-14';
    // Cash Retail Sale
    const s4 = sell(S, {
      role: 'sales',
      party: 4,
      wh: 0,
      tax: 14,
      paid: 0,
      items: [
        { p: 5, q: 2, price: 3600, d: 0 },
        { p: 7, q: 3, price: 950, d: 0 }
      ]
    });
    // Pay in full
    pay(S, 'sales', s4, s4.grand, 'CASH');

    // Customer Partial Collection on Invoice 2
    S.today = '2026-11-15';
    pay(S, 'accountant', s2, 100000, 'BANK'); // 1,000.00 EGP

    // Supplier Payment
    S.today = '2026-11-16';
    const openBill = S.iv.find(i => i.t === 'P' && out(i) > 0);
    if (openBill) {
      pay(S, 'accountant', openBill, 300000, 'BANK'); // 3,000.00 EGP
    }

    // Operational Expenses
    S.today = '2026-11-17';
    expense(S, 'accountant', 'Facility Rent', 250000, 'Cairo HQ Office & Warehouse lease for Nov', 'BANK');
    expense(S, 'accountant', 'Utilities', 38000, 'Electricity and high-speed fiber internet', 'CASH');
    expense(S, 'accountant', 'Office Supplies', 12500, 'Stationery and packaging supplies', 'CASH');

    S.today = '2026-11-18';
    return S;
  }

  return {
    R,
    need,
    TYPE,
    RIGHTS,
    can,
    mk,
    pos,
    val,
    pn,
    log,
    jrn,
    wIn,
    wOut,
    out,
    stat,
    mkInv,
    sell,
    buy,
    pay,
    payParty,
    sret,
    cancel,
    transfer,
    adjust,
    expense,
    manualJournal,
    tb,
    stockVal,
    metrics,
    checks,
    seed
  };
}));
