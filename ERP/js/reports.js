/**
 * SmartTrade ERP Financial & Operational Reporting Module
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exported = factory(require('./engine.js'), require('./i18n.js'));
    module.exports = exported;
    if (root) root.SmartTradeReports = exported;
  } else {
    root.SmartTradeReports = factory(root.SmartTradeEngine, root.SmartTradeI18n);
  }
}(typeof self !== 'undefined' ? self : this, function (Engine, I18n) {
  'use strict';

  // 1. Profit & Loss Statement
  function generateProfitAndLoss(S, startDate = null, endDate = null) {
    const t = Engine.tb(S);

    // Sales Revenue
    const grossSalesInvoices = S.iv.filter(i => i.t === 'S' && !i.x);
    let grossSales = 0;
    let salesReturns = 0;
    for (const inv of grossSalesInvoices) {
      if (startDate && inv.d < startDate) continue;
      if (endDate && inv.d > endDate) continue;
      grossSales += inv.net;
      salesReturns += (inv.ret || 0);
    }
    const netRevenue = -(t.SAL || 0);
    const cogs = t.COGS || 0;
    const grossProfit = netRevenue - cogs;
    const grossMarginPct = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0.0';

    // Categorized Expenses
    const expensesByCategory = {};
    for (const exp of S.ex) {
      if (startDate && exp.d < startDate) continue;
      if (endDate && exp.d > endDate) continue;
      expensesByCategory[exp.cat] = (expensesByCategory[exp.cat] || 0) + exp.a;
    }
    const totalOperatingExpenses = t.EXP || 0;
    const netOperatingProfit = grossProfit - totalOperatingExpenses;
    const netMarginPct = netRevenue > 0 ? ((netOperatingProfit / netRevenue) * 100).toFixed(1) : '0.0';

    return {
      grossSales,
      salesReturns,
      netRevenue,
      cogs,
      grossProfit,
      grossMarginPct,
      expensesByCategory,
      totalOperatingExpenses,
      netOperatingProfit,
      netMarginPct
    };
  }

  // 2. Balance Sheet
  function generateBalanceSheet(S) {
    const t = Engine.tb(S);
    const g = acc => t[acc] || 0;
    const m = Engine.metrics(S);

    const cash = g('CASH');
    const bank = g('BANK');
    const ar = g('AR');
    const inventory = Engine.stockVal(S);
    const txr = g('TXR');
    const totalAssets = cash + bank + ar + inventory + txr;

    const ap = -g('AP');
    const txp = -g('TXP');
    const totalLiabilities = ap + txp;

    const capital = -g('EQ');
    const netProfit = m.profit;
    const totalEquity = capital + netProfit;

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) <= (S.mv.length || 1);

    return {
      assets: {
        cash,
        bank,
        ar,
        inventory,
        txr,
        total: totalAssets
      },
      liabilities: {
        ap,
        txp,
        total: totalLiabilities
      },
      equity: {
        capital,
        netProfit,
        total: totalEquity
      },
      totalLiabilitiesAndEquity,
      isBalanced
    };
  }

  // 3. Trial Balance Report
  function generateTrialBalance(S) {
    const t = Engine.tb(S);
    const rows = [];
    let grandDebit = 0;
    let grandCredit = 0;

    const accountNames = {
      CASH: 'Cash on Hand (Safe)',
      BANK: 'Bank Current Account',
      AR: 'Accounts Receivable (Customers)',
      INV: 'Merchandise Inventory',
      TXR: 'VAT Input Tax (Receivable)',
      AP: 'Accounts Payable (Suppliers)',
      TXP: 'VAT Output Tax (Payable)',
      EQ: "Owner's Equity & Capital",
      SAL: 'Sales Revenue',
      COGS: 'Cost of Goods Sold',
      EXP: 'Operating & Admin Expenses'
    };

    for (const acc in Engine.TYPE) {
      const net = t[acc] || 0;
      const dr = net > 0 ? net : 0;
      const cr = net < 0 ? -net : 0;

      grandDebit += dr;
      grandCredit += cr;

      rows.push({
        code: acc,
        name: accountNames[acc] || acc,
        type: Engine.TYPE[acc],
        dr,
        cr
      });
    }

    return {
      rows,
      grandDebit,
      grandCredit,
      isBalanced: grandDebit === grandCredit
    };
  }

  // 4. General Ledger Account Drilldown
  function generateGeneralLedger(S, accountCode = 'CASH', startDate = null, endDate = null) {
    let runningBalance = 0;
    const ledgerLines = [];

    // Sort chronologically
    const sortedEntries = [...S.je].sort((a, b) => a.id - b.id);

    for (const entry of sortedEntries) {
      if (startDate && entry.date < startDate) continue;
      if (endDate && entry.date > endDate) continue;

      for (const [acc, dr, cr] of entry.L) {
        if (acc === accountCode) {
          runningBalance += (dr - cr);
          ledgerLines.push({
            id: entry.id,
            date: entry.date,
            memo: entry.memo,
            ref: entry.ref,
            dr,
            cr,
            balance: runningBalance
          });
        }
      }
    }

    return {
      account: accountCode,
      lines: ledgerLines,
      closingBalance: runningBalance
    };
  }

  // 5. Stock Valuation Report
  function generateStockValuation(S, warehouseId = null) {
    const items = [];
    let grandStockQty = 0;
    let grandStockValue = 0;

    for (const product of S.pr) {
      let prodTotalQty = 0;
      let prodTotalValue = 0;

      const warehouseBreakdown = S.wh.map((whName, wIdx) => {
        if (warehouseId !== null && warehouseId != wIdx) return null;
        const pos = Engine.pos(S, product.id, wIdx);
        const lineVal = Engine.val(pos.q, pos.avg);
        prodTotalQty += pos.q;
        prodTotalValue += lineVal;
        return {
          warehouse: whName,
          qty: pos.q,
          avgCost: pos.avg,
          value: lineVal
        };
      }).filter(Boolean);

      grandStockQty += prodTotalQty;
      grandStockValue += prodTotalValue;

      items.push({
        product,
        totalQty: prodTotalQty,
        totalValue: prodTotalValue,
        isLowStock: prodTotalQty < (product.ms || 0),
        warehouses: warehouseBreakdown
      });
    }

    return {
      items,
      grandStockQty,
      grandStockValue
    };
  }

  // 6. Aged Receivables (AR) or Payables (AP)
  function generateAgingReport(S, type = 'S') {
    const invoices = S.iv.filter(i => i.t === type && !i.x && Engine.out(i) > 0);
    const today = new Date(S.today || new Date().toISOString().slice(0, 10));

    const partyMap = {};
    for (const inv of invoices) {
      const partyObj = (type === 'S' ? S.cu : S.su).find(p => p.id == inv.party);
      const partyName = partyObj ? partyObj.name : `Party #${inv.party}`;

      if (!partyMap[inv.party]) {
        partyMap[inv.party] = {
          partyId: inv.party,
          partyName,
          current: 0,   // 0-30 days
          days30: 0,    // 31-60 days
          days60: 0,    // 61-90 days
          days90Plus: 0,// 90+ days
          totalDue: 0
        };
      }

      const invDate = new Date(inv.d);
      const diffDays = Math.floor((today - invDate) / (1000 * 60 * 60 * 24));
      const due = Engine.out(inv);

      partyMap[inv.party].totalDue += due;
      if (diffDays <= 30) {
        partyMap[inv.party].current += due;
      } else if (diffDays <= 60) {
        partyMap[inv.party].days30 += due;
      } else if (diffDays <= 90) {
        partyMap[inv.party].days60 += due;
      } else {
        partyMap[inv.party].days90Plus += due;
      }
    }

    return Object.values(partyMap);
  }

  return {
    generateProfitAndLoss,
    generateBalanceSheet,
    generateTrialBalance,
    generateGeneralLedger,
    generateStockValuation,
    generateAgingReport
  };
}));
