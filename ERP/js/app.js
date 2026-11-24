/**
 * SmartTrade ERP Master Application Controller
 */

const SmartTradeApp = (function () {
  'use strict';

  const Engine = (typeof window !== 'undefined' && window.SmartTradeEngine) || (typeof SmartTradeEngine !== 'undefined' ? SmartTradeEngine : null);
  const Store = (typeof window !== 'undefined' && window.SmartTradeStore) || (typeof SmartTradeStore !== 'undefined' ? SmartTradeStore : null);
  const I18n = (typeof window !== 'undefined' && window.SmartTradeI18n) || (typeof SmartTradeI18n !== 'undefined' ? SmartTradeI18n : null);
  const UI = (typeof window !== 'undefined' && window.SmartTradeUI) || (typeof SmartTradeUI !== 'undefined' ? SmartTradeUI : null);
  const Reports = (typeof window !== 'undefined' && window.SmartTradeReports) || (typeof SmartTradeReports !== 'undefined' ? SmartTradeReports : null);
  const Export = (typeof window !== 'undefined' && window.SmartTradeExport) || (typeof SmartTradeExport !== 'undefined' ? SmartTradeExport : null);

  let currentView = 'dashboard';
  let activeTab = 'customers'; // For partners and accounting
  let openedDetailDoc = null;  // For invoice/bill detail view
  let invoiceCart = [];
  let searchQuery = '';

  const NAV_ITEMS = [
    { id: 'dashboard', labelKey: 'navDashboard', icon: '📊', group: 'navMain' },
    { id: 'products', labelKey: 'navProducts', icon: '📦', group: 'navOperations' },
    { id: 'sales', labelKey: 'navSales', icon: '🛒', group: 'navOperations' },
    { id: 'purchases', labelKey: 'navPurchases', icon: '🚚', group: 'navOperations' },
    { id: 'partners', labelKey: 'navPartners', icon: '👥', group: 'navOperations' },
    { id: 'inventory', labelKey: 'navInventory', icon: '🏭', group: 'navOperations' },
    { id: 'cashbox', labelKey: 'navCashbox', icon: '💵', group: 'navFinance' },
    { id: 'accounting', labelKey: 'navAccounting', icon: '📑', group: 'navFinance' },
    { id: 'audit', labelKey: 'navAudit', icon: '🛡️', group: 'navManagement' },
    { id: 'settings', labelKey: 'navSettings', icon: '⚙️', group: 'navManagement' }
  ];

  // Initialize Application
  function initApp() {
    Store.init();

    // Event listeners for state changes
    window.addEventListener('smarttrade:state-updated', () => renderCurrentView());
    window.addEventListener('smarttrade:language-changed', () => {
      renderNavigation();
      renderHeader();
      renderCurrentView();
    });
    window.addEventListener('smarttrade:role-changed', () => {
      renderNavigation();
      renderHeader();
      renderCurrentView();
    });

    // Global keyboard shortcuts: Ctrl+K or / for search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.focus();
      }
    });

    renderNavigation();
    renderHeader();
    navigateTo('dashboard');
  }

  // Navigation
  function navigateTo(viewId) {
    currentView = viewId;
    openedDetailDoc = null;
    invoiceCart = [];
    searchQuery = '';

    // Update active nav class
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });

    renderCurrentView();
  }

  // Render Sidebar
  function renderNavigation() {
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer) return;

    const S = Store.getState();
    const role = Store.getRole();

    // Badge counts
    const lowStockCount = S.pr.filter(p => {
      const totalQ = S.wh.reduce((sum, _, wIdx) => sum + Engine.pos(S, p.id, wIdx).q, 0);
      return totalQ < (p.ms || 0);
    }).length;

    const unpaidSalesCount = S.iv.filter(i => i.t === 'S' && !i.x && Engine.out(i) > 0).length;

    let html = '';
    let lastGroup = null;

    NAV_ITEMS.forEach(item => {
      // Permission checks for views
      if (item.id === 'settings' && role !== 'admin') return;
      if (item.id === 'audit' && !['admin', 'manager'].includes(role)) return;
      if (item.id === 'accounting' && !['admin', 'manager', 'accountant'].includes(role)) return;

      if (item.group !== lastGroup) {
        html += `<div class="nav-group-label">${I18n.t(item.group)}</div>`;
        lastGroup = item.group;
      }

      let badgeHtml = '';
      if (item.id === 'inventory' && lowStockCount > 0) {
        badgeHtml = `<span class="nav-badge">${lowStockCount}</span>`;
      } else if (item.id === 'sales' && unpaidSalesCount > 0) {
        badgeHtml = `<span class="nav-badge" style="background-color: var(--warning-solid)">${unpaidSalesCount}</span>`;
      }

      html += `
        <a class="nav-item ${currentView === item.id ? 'active' : ''}" data-view="${item.id}" onclick="SmartTradeApp.navigateTo('${item.id}')">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${I18n.t(item.labelKey)}</span>
          ${badgeHtml}
        </a>
      `;
    });

    navContainer.innerHTML = html;

    // Render user card in sidebar footer
    const footerContainer = document.getElementById('sidebar-user-footer');
    if (footerContainer) {
      footerContainer.innerHTML = `
        <div class="user-role-card">
          <div class="user-role-avatar">${role.charAt(0).toUpperCase()}</div>
          <div class="user-role-details">
            <div class="user-role-name">${S.company.name}</div>
            <div class="user-role-badge">${role}</div>
          </div>
        </div>
      `;
    }
  }

  // Render Top Header
  function renderHeader() {
    const role = Store.getRole();
    const lang = I18n.getLanguage();

    const roleSelect = document.getElementById('header-role-select');
    if (roleSelect) {
      roleSelect.value = role;
    }

    const langBtn = document.getElementById('header-lang-btn');
    if (langBtn) {
      langBtn.textContent = lang === 'en' ? 'العربية' : 'English';
    }

    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.placeholder = `${I18n.t('actionSearch')} (Ctrl+K)`;
    }
  }

  // Render Active Main View
  function renderCurrentView() {
    const container = document.getElementById('page-content');
    if (!container) return;

    const S = Store.getState();

    switch (currentView) {
      case 'dashboard':
        container.innerHTML = renderDashboardView(S);
        break;
      case 'products':
        container.innerHTML = renderProductsView(S);
        break;
      case 'sales':
        container.innerHTML = openedDetailDoc ? renderDocumentDetail(openedDetailDoc) : renderSalesView(S);
        break;
      case 'purchases':
        container.innerHTML = openedDetailDoc ? renderDocumentDetail(openedDetailDoc) : renderPurchasesView(S);
        break;
      case 'partners':
        container.innerHTML = renderPartnersView(S);
        break;
      case 'inventory':
        container.innerHTML = renderInventoryView(S);
        break;
      case 'cashbox':
        container.innerHTML = renderCashboxView(S);
        break;
      case 'accounting':
        container.innerHTML = renderAccountingView(S);
        break;
      case 'audit':
        container.innerHTML = renderAuditView(S);
        break;
      case 'settings':
        container.innerHTML = renderSettingsView(S);
        break;
      default:
        container.innerHTML = `<div class="empty-state">${I18n.t('emptyList')}</div>`;
    }
  }

  // 1. Dashboard View
  function renderDashboardView(S) {
    const m = Engine.metrics(S);
    const curr = S.company.currency;
    const chk = Engine.checks(S);

    const lowStockItems = S.pr.filter(p => {
      const q = S.wh.reduce((sum, _, wIdx) => sum + Engine.pos(S, p.id, wIdx).q, 0);
      return q < (p.ms || 0);
    });

    const recentEntries = S.je.slice(-6).reverse();

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navDashboard')}</h2>
          <p>${S.company.name} • ${I18n.fmtDate(S.today)}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="SmartTradeApp.openNewSaleModal()">+ ${I18n.t('saleNewInvoice')}</button>
          <button class="btn btn-secondary" onclick="SmartTradeApp.openNewPurchaseModal()">+ ${I18n.t('purNewBill')}</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('kpiTotalRevenue')}</span>
            <div class="kpi-icon" style="background: rgba(37,99,235,0.1); color: var(--primary-600)">📈</div>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(m.sales, curr)}</div>
          <div class="kpi-footer"><span>Gross Margin: ${m.sales > 0 ? ((m.grossProfit/m.sales)*100).toFixed(1) : 0}%</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('kpiNetProfit')}</span>
            <div class="kpi-icon" style="background: rgba(16,185,129,0.1); color: var(--success-solid)">💰</div>
          </div>
          <div class="kpi-value" style="color: ${m.profit >= 0 ? 'var(--success-solid)' : 'var(--danger-solid)'}">
            ${I18n.fmtMoney(m.profit, curr)}
          </div>
          <div class="kpi-footer"><span>Net Margin: ${m.sales > 0 ? ((m.profit/m.sales)*100).toFixed(1) : 0}%</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('kpiInventoryValue')}</span>
            <div class="kpi-icon" style="background: rgba(245,158,11,0.1); color: var(--warning-solid)">📦</div>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(m.inv, curr)}</div>
          <div class="kpi-footer"><span>${S.pr.length} Products across ${S.wh.length} Warehouses</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('kpiCashBank')}</span>
            <div class="kpi-icon" style="background: rgba(14,165,233,0.1); color: var(--info-solid)">🏦</div>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(m.liquid, curr)}</div>
          <div class="kpi-footer"><span>Cash: ${I18n.fmtMoney(m.cash, curr)} • Bank: ${I18n.fmtMoney(m.bank, curr)}</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('kpiReceivables')}</span>
            <div class="kpi-icon" style="background: rgba(59,130,246,0.1); color: var(--primary-500)">📥</div>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(m.ar, curr)}</div>
          <div class="kpi-footer"><span>Due from Customers</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('kpiPayables')}</span>
            <div class="kpi-icon" style="background: rgba(239,68,68,0.1); color: var(--danger-solid)">📤</div>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(m.ap, curr)}</div>
          <div class="kpi-footer"><span>Due to Suppliers</span></div>
        </div>
      </div>

      <!-- Charts & Alerts Row -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div class="card-title">${I18n.t('kpiSalesTrend')}</div>
          </div>
          <div class="card-body">
            ${UI.renderSalesPurchaseChart(S)}
          </div>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div class="card-title">
              <span>⚠ ${I18n.t('kpiLowStockAlerts')}</span>
              <span class="badge ${lowStockItems.length ? 'badge-danger' : 'badge-success'}">${lowStockItems.length}</span>
            </div>
          </div>
          <div class="card-body" style="padding: 10px;">
            ${lowStockItems.length ? `
              <div class="table-wrapper">
                <table class="data-table">
                  <tbody>
                    ${lowStockItems.map(p => {
                      const totalQ = S.wh.reduce((s, _, w) => s + Engine.pos(S, p.id, w).q, 0);
                      return `
                        <tr>
                          <td><b>${UI.escapeHtml(p.name)}</b><br><small style="color:var(--text-muted)">${p.sku}</small></td>
                          <td class="num-col" style="color:var(--danger-solid); font-weight:bold;">${totalQ} / ${p.ms}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<div class="empty-state">${I18n.t('kpiBalanced')}</div>`}
          </div>
        </div>
      </div>

      <!-- Recent Transactions Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">${I18n.t('kpiRecentTransactions')}</div>
          <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.navigateTo('accounting')">${I18n.t('actionViewDetails')}</button>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${I18n.t('saleDate')}</th>
                <th>Description</th>
                <th>Account Lines</th>
                <th class="num-col">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${recentEntries.map(e => `
                <tr>
                  <td><b>#${e.id}</b></td>
                  <td>${I18n.fmtDate(e.date)}</td>
                  <td><b>${UI.escapeHtml(e.memo)}</b></td>
                  <td><small style="color:var(--text-muted)">${e.L.map(l => l[0]).join(', ')}</small></td>
                  <td class="num-col">${I18n.fmtMoney(e.L.reduce((sum, l) => sum + l[1], 0), curr)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 2. Products View
  function renderProductsView(S) {
    const curr = S.company.currency;
    const filterText = searchQuery.toLowerCase();

    const filtered = S.pr.filter(p => {
      if (!filterText) return true;
      return p.name.toLowerCase().includes(filterText) ||
             p.sku.toLowerCase().includes(filterText) ||
             (p.barcode && p.barcode.includes(filterText)) ||
             p.cat.toLowerCase().includes(filterText);
    });

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navProducts')}</h2>
          <p>${S.pr.length} items catalog</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="SmartTradeApp.exportProductsCsv()">📥 ${I18n.t('actionExportCsv')}</button>
          <button class="btn btn-primary" onclick="SmartTradeApp.openNewProductModal()">+ ${I18n.t('prodNew')}</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="header-search">
            <span class="header-search-icon">🔍</span>
            <input type="text" placeholder="${I18n.t('actionSearch')}" value="${UI.escapeHtml(searchQuery)}" oninput="SmartTradeApp.setSearch(this.value)">
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('prodSku')}</th>
                <th>${I18n.t('prodName')}</th>
                <th>${I18n.t('prodCat')}</th>
                <th class="num-col">${I18n.t('prodBuy')}</th>
                <th class="num-col">${I18n.t('prodSell')}</th>
                <th class="num-col">${I18n.t('prodMin')}</th>
                <th class="num-col">${I18n.t('prodStock')}</th>
                <th>${I18n.t('prodStatus')}</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => {
                const totalStock = S.wh.reduce((s, _, w) => s + Engine.pos(S, p.id, w).q, 0);
                const isLow = totalStock < (p.ms || 0);
                const isOut = totalStock <= 0;
                const statusKey = isOut ? 'OUT_OF_STOCK' : (isLow ? 'LOW_STOCK' : 'IN_STOCK');

                return `
                  <tr>
                    <td><code>${UI.escapeHtml(p.sku)}</code></td>
                    <td><b>${UI.escapeHtml(p.name)}</b></td>
                    <td><span class="badge badge-neutral">${UI.escapeHtml(p.cat)}</span></td>
                    <td class="num-col">${I18n.fmtMoney(p.buy * 100, curr)}</td>
                    <td class="num-col" style="font-weight: 600;">${I18n.fmtMoney(p.sell * 100, curr)}</td>
                    <td class="num-col" style="color: var(--text-muted);">${I18n.fmtMoney(p.min * 100, curr)}</td>
                    <td class="num-col" style="font-weight: 600;">${totalStock} ${p.unit || 'pcs'}</td>
                    <td>${UI.badge(statusKey)}</td>
                    <td style="text-align: center;">
                      <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.openEditProductModal(${p.id})">✏️ ${I18n.t('actionEdit')}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 3. Sales Invoices View
  function renderSalesView(S) {
    const curr = S.company.currency;
    const invoices = S.iv.filter(i => i.t === 'S').reverse();

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navSales')}</h2>
          <p>${invoices.length} invoices registered</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="SmartTradeApp.exportInvoicesCsv('S')">📥 ${I18n.t('actionExportCsv')}</button>
          <button class="btn btn-primary" onclick="SmartTradeApp.openNewSaleModal()">+ ${I18n.t('saleNewInvoice')}</button>
        </div>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('saleInvoiceNo')}</th>
                <th>${I18n.t('saleDate')}</th>
                <th>${I18n.t('saleCustomer')}</th>
                <th>${I18n.t('saleWarehouse')}</th>
                <th class="num-col">${I18n.t('saleGrandTotal')}</th>
                <th class="num-col">${I18n.t('saleRemainingDue')}</th>
                <th>${I18n.t('saleStatus')}</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(i => {
                const customer = S.cu.find(c => c.id === i.party) || { name: 'Party #' + i.party };
                const whName = S.wh[i.wh] || 'Warehouse ' + i.wh;
                const due = Engine.out(i);
                const status = Engine.stat(i);

                return `
                  <tr>
                    <td><b>${i.num}</b></td>
                    <td>${I18n.fmtDate(i.d)}</td>
                    <td><b>${UI.escapeHtml(customer.name)}</b></td>
                    <td><small>${UI.escapeHtml(whName)}</small></td>
                    <td class="num-col">${I18n.fmtMoney(i.grand, curr)}</td>
                    <td class="num-col" style="font-weight: 600; color: ${due > 0 ? 'var(--danger-solid)' : 'var(--text-muted)'}">${I18n.fmtMoney(due, curr)}</td>
                    <td>${UI.badge(status)}</td>
                    <td style="text-align: center;">
                      <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.openDocumentDetail(${i.id})">${I18n.t('actionViewDetails')}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 4. Purchases Bills View
  function renderPurchasesView(S) {
    const curr = S.company.currency;
    const bills = S.iv.filter(i => i.t === 'P').reverse();

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navPurchases')}</h2>
          <p>${bills.length} purchase bills recorded</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="SmartTradeApp.exportInvoicesCsv('P')">📥 ${I18n.t('actionExportCsv')}</button>
          <button class="btn btn-primary" onclick="SmartTradeApp.openNewPurchaseModal()">+ ${I18n.t('purNewBill')}</button>
        </div>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('purBillNo')}</th>
                <th>${I18n.t('saleDate')}</th>
                <th>${I18n.t('purSupplier')}</th>
                <th>${I18n.t('purDestinationWh')}</th>
                <th class="num-col">${I18n.t('saleGrandTotal')}</th>
                <th class="num-col">${I18n.t('saleRemainingDue')}</th>
                <th>${I18n.t('saleStatus')}</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${bills.map(i => {
                const supplier = S.su.find(s => s.id === i.party) || { name: 'Supplier #' + i.party };
                const whName = S.wh[i.wh] || 'Warehouse ' + i.wh;
                const due = Engine.out(i);
                const status = Engine.stat(i);

                return `
                  <tr>
                    <td><b>${i.num}</b></td>
                    <td>${I18n.fmtDate(i.d)}</td>
                    <td><b>${UI.escapeHtml(supplier.name)}</b></td>
                    <td><small>${UI.escapeHtml(whName)}</small></td>
                    <td class="num-col">${I18n.fmtMoney(i.grand, curr)}</td>
                    <td class="num-col" style="font-weight: 600; color: ${due > 0 ? 'var(--danger-solid)' : 'var(--text-muted)'}">${I18n.fmtMoney(due, curr)}</td>
                    <td>${UI.badge(status)}</td>
                    <td style="text-align: center;">
                      <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.openDocumentDetail(${i.id})">${I18n.t('actionViewDetails')}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Document Detail (Sales Invoice or Purchase Bill) with Print & Return & Cancel
  function renderDocumentDetail(invoice) {
    const S = Store.getState();
    const curr = S.company.currency;
    const isSale = invoice.t === 'S';
    const party = (isSale ? S.cu : S.su).find(p => p.id === invoice.party) || { name: 'Party #' + invoice.party };
    const whName = S.wh[invoice.wh] || 'Warehouse ' + invoice.wh;
    const due = Engine.out(invoice);
    const status = Engine.stat(invoice);
    const role = Store.getRole();

    return `
      <div class="page-header">
        <div class="page-title">
          <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.closeDocumentDetail()" style="margin-bottom: 8px;">← ${I18n.t('actionBack')}</button>
          <h2>${invoice.num} ${UI.badge(status)}</h2>
          <p>${I18n.fmtDate(invoice.d)} • ${UI.escapeHtml(party.name)}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="window.print()">🖨️ ${I18n.t('actionPrint')}</button>
          ${!invoice.x && due > 0 && Engine.can(role, 'pay') ? `
            <button class="btn btn-success" onclick="SmartTradeApp.openPayInvoiceModal(${invoice.id})">💵 ${I18n.t('actionPay')}</button>
          ` : ''}
          ${!invoice.x && Engine.can(role, 'cancel') ? `
            <button class="btn btn-danger" onclick="SmartTradeApp.cancelInvoicePrompt(${invoice.id})">✕ ${I18n.t('actionCancelInvoice')}</button>
          ` : ''}
        </div>
      </div>

      <div class="card print-invoice-sheet" id="invoice-printable-area">
        <div class="card-header print-header">
          <div>
            <div class="print-company-name">${S.company.name}</div>
            <small style="color:var(--text-muted)">${S.company.address} • Tax ID: ${S.company.taxId}</small>
          </div>
          <div style="text-align: end;">
            <h3>${isSale ? 'TAX INVOICE' : 'PURCHASE BILL'}</h3>
            <b>${invoice.num}</b>
          </div>
        </div>

        <div class="card-body">
          <div class="print-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
            <div class="print-meta-box">
              <span class="form-label">${isSale ? I18n.t('saleCustomer') : I18n.t('purSupplier')}</span>
              <h4 style="margin: 4px 0;">${UI.escapeHtml(party.name)}</h4>
              <div>${UI.escapeHtml(party.address || 'Address on file')}</div>
              <small>${party.ph || ''} ${party.taxId ? '• Tax: ' + party.taxId : ''}</small>
            </div>
            <div class="print-meta-box" style="text-align: end;">
              <span class="form-label">${I18n.t('saleWarehouse')}</span>
              <div><b>${UI.escapeHtml(whName)}</b></div>
              <div style="margin-top: 6px;"><span class="form-label">Payment Terms</span> ${invoice.paymentTerms || 'Immediate'}</div>
            </div>
          </div>

          <!-- Lines Table -->
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${I18n.t('prodName')}</th>
                  <th class="num-col">${I18n.t('saleQty')}</th>
                  <th class="num-col">${I18n.t('salePrice')}</th>
                  ${isSale ? `<th class="num-col">${I18n.t('saleDiscount')}</th>` : ''}
                  <th class="num-col">${I18n.t('saleNet')}</th>
                  ${isSale ? `<th>${I18n.t('actionReturn')}</th>` : ''}
                </tr>
              </thead>
              <tbody>
                ${invoice.lines.map((l, idx) => {
                  const prod = Engine.pn(S, l.p) || { name: 'Product #' + l.p };
                  const unitPriceCents = isSale ? l.price : (l.cost * 100);
                  const returnedQty = l.r || 0;
                  const availableToReturn = l.q - returnedQty;

                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td><b>${UI.escapeHtml(prod.name)}</b></td>
                      <td class="num-col">${l.q} ${returnedQty > 0 ? `<small style="color:var(--danger-solid)">(-${returnedQty})</small>` : ''}</td>
                      <td class="num-col">${I18n.fmtMoney(unitPriceCents, curr)}</td>
                      ${isSale ? `<td class="num-col">${l.d || 0}%</td>` : ''}
                      <td class="num-col" style="font-weight: 600;">${I18n.fmtMoney(l.n, curr)}</td>
                      ${isSale ? `
                        <td>
                          ${!invoice.x && availableToReturn > 0 && Engine.can(role, 'sell') ? `
                            <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.openReturnModal(${invoice.id}, ${idx})">↩ ${I18n.t('actionReturn')}</button>
                          ` : '—'}
                        </td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Totals Breakdown -->
          <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
            <div style="width: 320px;">
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
                <span>${I18n.t('saleNet')}</span>
                <span>${I18n.fmtMoney(invoice.net, curr)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
                <span>${I18n.t('saleTaxAmount')} (${S.company.defaultTax}%)</span>
                <span>${I18n.fmtMoney(invoice.tax, curr)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; font-weight: bold; border-bottom: 2px solid var(--border-strong);">
                <span>${I18n.t('saleGrandTotal')}</span>
                <span style="color: var(--primary-600);">${I18n.fmtMoney(invoice.grand, curr)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; color: var(--success-solid);">
                <span>${I18n.t('saleAmountPaid')}</span>
                <span>${I18n.fmtMoney(invoice.paid || 0, curr)}</span>
              </div>
              ${invoice.ret > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; color: var(--danger-solid);">
                  <span>${I18n.t('saleRefunds')}</span>
                  <span>-${I18n.fmtMoney(invoice.ret, curr)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; font-weight: bold; background: var(--bg-subtle); padding: 8px 12px; border-radius: var(--radius-md);">
                <span>${I18n.t('saleRemainingDue')}</span>
                <span style="color: ${due > 0 ? 'var(--danger-solid)' : 'var(--text-muted)'};">${I18n.fmtMoney(due, curr)}</span>
              </div>
            </div>
          </div>

          <div class="print-signatures" style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div class="print-sign-box">Prepared By</div>
            <div class="print-sign-box">Recipient Signature</div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. Partners / CRM View
  function renderPartnersView(S) {
    const isCustomerTab = activeTab !== 'suppliers';
    const parties = isCustomerTab ? S.cu : S.su;
    const curr = S.company.currency;
    const type = isCustomerTab ? 'S' : 'P';

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navPartners')}</h2>
          <p>Customer & Supplier relationships</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="SmartTradeApp.openNewPartnerModal('${type}')">
            + ${isCustomerTab ? I18n.t('partNewCustomer') : I18n.t('partNewSupplier')}
          </button>
        </div>
      </div>

      <div class="tab-nav">
        <button class="tab-btn ${isCustomerTab ? 'active' : ''}" onclick="SmartTradeApp.setActiveTab('customers')">${I18n.t('partCustomers')}</button>
        <button class="tab-btn ${!isCustomerTab ? 'active' : ''}" onclick="SmartTradeApp.setActiveTab('suppliers')">${I18n.t('partSuppliers')}</button>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${I18n.t('partName')}</th>
                <th>${I18n.t('partPhone')}</th>
                <th>${I18n.t('partEmail')}</th>
                <th>${I18n.t('partTaxId')}</th>
                <th class="num-col">${I18n.t('partBalance')}</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${parties.map(p => {
                const balance = S.iv
                  .filter(i => i.t === type && i.party === p.id && !i.x)
                  .reduce((sum, i) => sum + Engine.out(i), 0);

                return `
                  <tr>
                    <td>${p.id}</td>
                    <td><b>${UI.escapeHtml(p.name)}</b><br><small style="color:var(--text-muted)">${UI.escapeHtml(p.address || '')}</small></td>
                    <td>${p.ph || '—'}</td>
                    <td>${p.email || '—'}</td>
                    <td>${p.taxId || '—'}</td>
                    <td class="num-col" style="font-weight: 600; color: ${balance > 0 ? (isCustomerTab ? 'var(--primary-600)' : 'var(--danger-solid)') : 'var(--text-muted)'}">
                      ${I18n.fmtMoney(balance, curr)}
                    </td>
                    <td style="text-align: center;">
                      ${balance > 0 ? `
                        <button class="btn btn-success btn-sm" onclick="SmartTradeApp.openPayPartyModal('${type}', ${p.id}, ${balance})">
                          ${isCustomerTab ? I18n.t('actionCollect') : I18n.t('actionDisburse')}
                        </button>
                      ` : ''}
                      <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.openStatementModal('${type}', ${p.id})">
                        ${I18n.t('partStatement')}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 6. Inventory & Warehouses View
  function renderInventoryView(S) {
    const curr = S.company.currency;
    const role = Store.getRole();

    const whCards = S.wh.map((whName, wIdx) => {
      const val = Engine.stockVal(S, wIdx);
      const totalUnits = S.pr.reduce((sum, p) => sum + Engine.pos(S, p.id, wIdx).q, 0);

      return `
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${UI.escapeHtml(whName)}</span>
            <span class="badge badge-neutral">Wh #${wIdx}</span>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(val, curr)}</div>
          <div class="kpi-footer"><span>${totalUnits} total units on hand</span></div>
        </div>
      `;
    }).join('');

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navInventory')}</h2>
          <p>${S.wh.length} Warehouse locations</p>
        </div>
        <div class="page-actions">
          ${Engine.can(role, 'tr') ? `
            <button class="btn btn-secondary" onclick="SmartTradeApp.openTransferModal()">⇄ ${I18n.t('actionTransfer')}</button>
          ` : ''}
          ${Engine.can(role, 'adj') ? `
            <button class="btn btn-primary" onclick="SmartTradeApp.openAdjustModal()">⚖️ ${I18n.t('actionAdjust')}</button>
          ` : ''}
        </div>
      </div>

      <div class="kpi-grid">
        ${whCards}
      </div>

      <!-- Inventory Stock Valuation Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">${I18n.t('kpiInventoryValue')}</div>
          <button class="btn btn-secondary btn-sm" onclick="SmartTradeApp.exportInventoryCsv()">📥 ${I18n.t('actionExportCsv')}</button>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('prodSku')}</th>
                <th>${I18n.t('prodName')}</th>
                <th>${I18n.t('saleWarehouse')}</th>
                <th class="num-col">${I18n.t('prodStock')}</th>
                <th class="num-col">Average Cost</th>
                <th class="num-col">Total Asset Value</th>
              </tr>
            </thead>
            <tbody>
              ${S.pr.flatMap(p => {
                return S.wh.map((whName, wIdx) => {
                  const s = Engine.pos(S, p.id, wIdx);
                  const lineVal = Engine.val(s.q, s.avg);
                  return `
                    <tr>
                      <td><code>${p.sku}</code></td>
                      <td><b>${UI.escapeHtml(p.name)}</b></td>
                      <td>${UI.escapeHtml(whName)}</td>
                      <td class="num-col" style="font-weight: 600;">${s.q} ${p.unit || 'pcs'}</td>
                      <td class="num-col">${I18n.fmtMoney(s.avg, curr)}</td>
                      <td class="num-col" style="font-weight: 600;">${I18n.fmtMoney(lineVal, curr)}</td>
                    </tr>
                  `;
                });
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Stock Movement History -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">${I18n.t('invMovements')}</div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('invMoveDate')}</th>
                <th>${I18n.t('prodName')}</th>
                <th>${I18n.t('saleWarehouse')}</th>
                <th class="num-col">${I18n.t('saleQty')}</th>
                <th class="num-col">${I18n.t('invMoveCost')}</th>
                <th>${I18n.t('invMoveType')}</th>
                <th>${I18n.t('invMoveRef')}</th>
              </tr>
            </thead>
            <tbody>
              ${S.mv.slice(-15).reverse().map(m => {
                const prod = Engine.pn(S, m.p) || { name: '#' + m.p };
                const whName = S.wh[m.w] || 'Wh ' + m.w;
                return `
                  <tr>
                    <td>${I18n.fmtDate(m.d)}</td>
                    <td><b>${UI.escapeHtml(prod.name)}</b></td>
                    <td>${UI.escapeHtml(whName)}</td>
                    <td class="num-col" style="font-weight: bold; color: ${m.q > 0 ? 'var(--success-solid)' : 'var(--danger-solid)'}">
                      ${m.q > 0 ? '+' : ''}${m.q}
                    </td>
                    <td class="num-col">${I18n.fmtMoney(m.c4, curr)}</td>
                    <td><span class="badge badge-neutral">${m.type}</span></td>
                    <td><small style="color:var(--text-muted)">${UI.escapeHtml(m.ref || '—')}</small></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 7. Cashbox & Operating Expenses View
  function renderCashboxView(S) {
    const curr = S.company.currency;
    const t = Engine.tb(S);
    const cash = t.CASH || 0;
    const bank = t.BANK || 0;
    const role = Store.getRole();

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navCashbox')}</h2>
          <p>Treasury, bank accounts, and operating expenses</p>
        </div>
        <div class="page-actions">
          ${Engine.can(role, 'exp') ? `
            <button class="btn btn-primary" onclick="SmartTradeApp.openNewExpenseModal()">+ ${I18n.t('cashNewExpense')}</button>
          ` : ''}
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('cashCashOnHand')}</span>
            <div class="kpi-icon" style="background: rgba(16,185,129,0.1); color: var(--success-solid)">💵</div>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(cash, curr)}</div>
          <div class="kpi-footer"><span>Physical Company Safe</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">${I18n.t('cashBankBalance')}</span>
            <div class="kpi-icon" style="background: rgba(59,130,246,0.1); color: var(--primary-600)">🏦</div>
          </div>
          <div class="kpi-value">${I18n.fmtMoney(bank, curr)}</div>
          <div class="kpi-footer"><span>Bank Current Operating Account</span></div>
        </div>
      </div>

      <!-- Expense Ledger Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">${I18n.t('cashExpenses')}</div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('saleDate')}</th>
                <th>${I18n.t('cashCategory')}</th>
                <th>${I18n.t('cashAccount')}</th>
                <th>${I18n.t('cashNote')}</th>
                <th class="num-col">${I18n.t('cashAmount')}</th>
              </tr>
            </thead>
            <tbody>
              ${S.ex.slice().reverse().map(x => `
                <tr>
                  <td>${I18n.fmtDate(x.d)}</td>
                  <td><b>${UI.escapeHtml(x.cat)}</b></td>
                  <td><span class="badge badge-neutral">${x.acc || 'CASH'}</span></td>
                  <td>${UI.escapeHtml(x.note || '—')}</td>
                  <td class="num-col" style="font-weight: 600; color: var(--danger-solid);">${I18n.fmtMoney(x.a, curr)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 8. General Accounting Suite View
  function renderAccountingView(S) {
    const curr = S.company.currency;
    const role = Store.getRole();
    const chk = Engine.checks(S);
    const subTab = activeTab.startsWith('acc_') ? activeTab : 'acc_pl';

    let contentHtml = '';

    if (subTab === 'acc_pl') {
      const pl = Reports.generateProfitAndLoss(S);
      contentHtml = `
        <div style="max-width: 650px; margin: 0 auto;">
          <table class="data-table" style="font-size: 14px;">
            <tbody>
              <tr style="background: var(--bg-subtle); font-weight: bold;">
                <td colspan="2">${I18n.t('accRevenue')}</td>
              </tr>
              <tr>
                <td>${I18n.t('kpiTotalRevenue')}</td>
                <td class="num-col">${I18n.fmtMoney(pl.netRevenue, curr)}</td>
              </tr>
              <tr style="background: var(--bg-subtle); font-weight: bold;">
                <td colspan="2">Cost of Goods Sold (COGS)</td>
              </tr>
              <tr>
                <td>Direct Cost of Merchandise Sold</td>
                <td class="num-col" style="color: var(--danger-solid);">(${I18n.fmtMoney(pl.cogs, curr)})</td>
              </tr>
              <tr style="font-weight: bold; background: var(--primary-50);">
                <td>${I18n.t('kpiGrossProfit')}</td>
                <td class="num-col" style="color: var(--primary-600);">${I18n.fmtMoney(pl.grossProfit, curr)} (${pl.grossMarginPct}%)</td>
              </tr>
              <tr style="background: var(--bg-subtle); font-weight: bold;">
                <td colspan="2">${I18n.t('cashExpenses')}</td>
              </tr>
              ${Object.keys(pl.expensesByCategory).map(cat => `
                <tr>
                  <td style="padding-inline-start: 24px;">${UI.escapeHtml(cat)}</td>
                  <td class="num-col" style="color: var(--danger-solid);">(${I18n.fmtMoney(pl.expensesByCategory[cat], curr)})</td>
                </tr>
              `).join('')}
              <tr style="font-weight: 600;">
                <td>Total Operating Expenses</td>
                <td class="num-col" style="color: var(--danger-solid);">(${I18n.fmtMoney(pl.totalOperatingExpenses, curr)})</td>
              </tr>
              <tr style="font-size: 16px; font-weight: bold; background: var(--bg-subtle); border-top: 2px solid var(--border-strong);">
                <td>${I18n.t('kpiNetProfit')}</td>
                <td class="num-col" style="color: ${pl.netOperatingProfit >= 0 ? 'var(--success-solid)' : 'var(--danger-solid)'};">
                  ${I18n.fmtMoney(pl.netOperatingProfit, curr)} (${pl.netMarginPct}%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (subTab === 'acc_bs') {
      const bs = Reports.generateBalanceSheet(S);
      contentHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <h4 style="margin-bottom: 12px; color: var(--primary-600);">${I18n.t('accAssets')}</h4>
            <table class="data-table">
              <tbody>
                <tr><td>Cash on Hand</td><td class="num-col">${I18n.fmtMoney(bs.assets.cash, curr)}</td></tr>
                <tr><td>Bank Operating Account</td><td class="num-col">${I18n.fmtMoney(bs.assets.bank, curr)}</td></tr>
                <tr><td>Accounts Receivable (Customers)</td><td class="num-col">${I18n.fmtMoney(bs.assets.ar, curr)}</td></tr>
                <tr><td>Merchandise Inventory Valuation</td><td class="num-col">${I18n.fmtMoney(bs.assets.inventory, curr)}</td></tr>
                <tr><td>VAT Input Tax Receivable</td><td class="num-col">${I18n.fmtMoney(bs.assets.txr, curr)}</td></tr>
                <tr style="font-weight: bold; background: var(--bg-subtle);">
                  <td>Total Assets</td><td class="num-col">${I18n.fmtMoney(bs.assets.total, curr)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 style="margin-bottom: 12px; color: var(--danger-solid);">${I18n.t('accLiabilities')}</h4>
            <table class="data-table" style="margin-bottom: 20px;">
              <tbody>
                <tr><td>Accounts Payable (Suppliers)</td><td class="num-col">${I18n.fmtMoney(bs.liabilities.ap, curr)}</td></tr>
                <tr><td>VAT Output Tax Payable</td><td class="num-col">${I18n.fmtMoney(bs.liabilities.txp, curr)}</td></tr>
                <tr style="font-weight: bold; background: var(--bg-subtle);">
                  <td>Total Liabilities</td><td class="num-col">${I18n.fmtMoney(bs.liabilities.total, curr)}</td>
                </tr>
              </tbody>
            </table>

            <h4 style="margin-bottom: 12px; color: var(--success-solid);">${I18n.t('accEquity')}</h4>
            <table class="data-table">
              <tbody>
                <tr><td>Owner Capital Injection</td><td class="num-col">${I18n.fmtMoney(bs.equity.capital, curr)}</td></tr>
                <tr><td>Retained Earnings / Current Net Profit</td><td class="num-col">${I18n.fmtMoney(bs.equity.netProfit, curr)}</td></tr>
                <tr style="font-weight: bold; background: var(--bg-subtle);">
                  <td>Total Equity</td><td class="num-col">${I18n.fmtMoney(bs.equity.total, curr)}</td>
                </tr>
                <tr style="font-weight: bold; background: var(--primary-50); font-size: 14px;">
                  <td>Liabilities + Equity</td><td class="num-col">${I18n.fmtMoney(bs.totalLiabilitiesAndEquity, curr)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      // Trial Balance
      const tb = Reports.generateTrialBalance(S);
      contentHtml = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('accCode')}</th>
                <th>${I18n.t('accAccount')}</th>
                <th>Category</th>
                <th class="num-col">${I18n.t('accDebit')}</th>
                <th class="num-col">${I18n.t('accCredit')}</th>
              </tr>
            </thead>
            <tbody>
              ${tb.rows.map(r => `
                <tr>
                  <td><code>${r.code}</code></td>
                  <td><b>${r.name}</b></td>
                  <td><span class="badge badge-neutral">${r.type}</span></td>
                  <td class="num-col">${r.dr > 0 ? I18n.fmtMoney(r.dr, curr) : '—'}</td>
                  <td class="num-col">${r.cr > 0 ? I18n.fmtMoney(r.cr, curr) : '—'}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background: var(--bg-subtle); font-size: 14px;">
                <td colspan="3">Grand Totals</td>
                <td class="num-col">${I18n.fmtMoney(tb.grandDebit, curr)}</td>
                <td class="num-col">${I18n.fmtMoney(tb.grandCredit, curr)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navAccounting')}</h2>
          <p>Financial statements and general ledger</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="window.print()">🖨️ ${I18n.t('actionPrint')}</button>
          ${Engine.can(role, 'post') ? `
            <button class="btn btn-primary" onclick="SmartTradeApp.openManualJournalModal()">+ ${I18n.t('accManualJournal')}</button>
          ` : ''}
        </div>
      </div>

      <!-- Integrity Banner -->
      <div class="card" style="margin-bottom: 20px; border-inline-start: 4px solid ${chk.balanced ? 'var(--success-solid)' : 'var(--danger-solid)'};">
        <div class="card-body" style="padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <b>${I18n.t('kpiIntegrityStatus')}:</b>
            <span>${chk.balanced ? 'All accounts balanced (Debits = Credits)' : 'Warning: Unbalanced accounts detected!'}</span>
          </div>
          <span class="badge ${chk.isClean ? 'badge-success' : 'badge-danger'}">
            ${chk.isClean ? I18n.t('kpiBalanced') : 'Mismatch'}
          </span>
        </div>
      </div>

      <div class="tab-nav">
        <button class="tab-btn ${subTab === 'acc_pl' ? 'active' : ''}" onclick="SmartTradeApp.setActiveTab('acc_pl')">${I18n.t('accProfitLoss')}</button>
        <button class="tab-btn ${subTab === 'acc_bs' ? 'active' : ''}" onclick="SmartTradeApp.setActiveTab('acc_bs')">${I18n.t('accBalanceSheet')}</button>
        <button class="tab-btn ${subTab === 'acc_tb' ? 'active' : ''}" onclick="SmartTradeApp.setActiveTab('acc_tb')">${I18n.t('accTrialBalance')}</button>
      </div>

      <div class="card">
        <div class="card-body">
          ${contentHtml}
        </div>
      </div>
    `;
  }

  // 9. Audit Trail View
  function renderAuditView(S) {
    const logs = (S.au || []).slice(-40).reverse();

    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navAudit')}</h2>
          <p>Immutable system audit trail and compliance activity log</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="SmartTradeApp.exportAuditCsv()">📥 ${I18n.t('actionExportCsv')}</button>
        </div>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18n.t('auditTime')}</th>
                <th>${I18n.t('auditUser')}</th>
                <th>${I18n.t('auditAction')}</th>
                <th>${I18n.t('auditDetails')}</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(a => `
                <tr>
                  <td><code>${a.t} ${a.time || ''}</code></td>
                  <td><span class="badge badge-neutral">${a.u}</span></td>
                  <td><b>${UI.escapeHtml(a.a)}</b></td>
                  <td>${UI.escapeHtml(a.x)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 10. System Settings View
  function renderSettingsView(S) {
    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${I18n.t('navSettings')}</h2>
          <p>Configure company profile and system defaults</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">${I18n.t('setCompanyInfo')}</div>
        </div>
        <div class="card-body">
          <form onsubmit="event.preventDefault(); SmartTradeApp.saveCompanySettings();">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${I18n.t('setCompanyName')}</label>
                <input class="form-control" id="set-name" value="${UI.escapeHtml(S.company.name)}">
              </div>
              <div class="form-group">
                <label class="form-label">${I18n.t('setCompanyTax')}</label>
                <input class="form-control" id="set-tax" value="${UI.escapeHtml(S.company.taxId)}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${I18n.t('setCompanyPhone')}</label>
                <input class="form-control" id="set-phone" value="${UI.escapeHtml(S.company.phone)}">
              </div>
              <div class="form-group">
                <label class="form-label">${I18n.t('setCurrency')}</label>
                <input class="form-control" id="set-curr" value="${UI.escapeHtml(S.company.currency)}">
              </div>
              <div class="form-group">
                <label class="form-label">${I18n.t('setDefaultTax')}</label>
                <input class="form-control" id="set-deftax" type="number" value="${S.company.defaultTax}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('setCompanyAddress')}</label>
              <input class="form-control" id="set-address" value="${UI.escapeHtml(S.company.address)}">
            </div>
            <button type="submit" class="btn btn-primary">${I18n.t('actionSave')}</button>
          </form>
        </div>
      </div>

      <!-- Backup & Data Management -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">${I18n.t('setDataManagement')}</div>
        </div>
        <div class="card-body">
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="SmartTradeStore.exportBackupJson()">
              📥 ${I18n.t('actionDownloadBackup')}
            </button>
            <label class="btn btn-secondary" style="cursor: pointer;">
              📤 ${I18n.t('actionRestoreBackup')}
              <input type="file" accept=".json" style="display:none;" onchange="SmartTradeApp.handleRestoreFile(this)">
            </label>
            <button class="btn btn-danger" onclick="SmartTradeApp.promptResetDemo()">
              ⚠️ ${I18n.t('actionResetDemo')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Modals & Action Handlers
  function openNewSaleModal() {
    const S = Store.getState();
    invoiceCart = [];

    const productOptions = S.pr.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)} (${I18n.fmtMoney(p.sell*100, S.company.currency)})</option>`).join('');
    const customerOptions = S.cu.map(c => `<option value="${c.id}">${UI.escapeHtml(c.name)}</option>`).join('');
    const whOptions = S.wh.map((w, idx) => `<option value="${idx}">${UI.escapeHtml(w)}</option>`).join('');

    const content = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('saleCustomer')}</label>
          <select class="form-select" id="new-sale-party">${customerOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('saleWarehouse')}</label>
          <select class="form-select" id="new-sale-wh">${whOptions}</select>
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px; background: var(--bg-subtle);">
        <div class="card-body" style="padding: 12px;">
          <div class="form-row" style="align-items: flex-end;">
            <div class="form-group" style="flex: 2; margin-bottom: 0;">
              <label class="form-label">${I18n.t('prodName')}</label>
              <select class="form-select" id="cart-add-prod" onchange="SmartTradeApp.updateCartPricePlaceholder()">${productOptions}</select>
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <label class="form-label">${I18n.t('saleQty')}</label>
              <input class="form-control" id="cart-add-qty" type="number" min="1" value="1">
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <label class="form-label">${I18n.t('salePrice')}</label>
              <input class="form-control" id="cart-add-price" type="number" step="0.01" value="${S.pr[0] ? S.pr[0].sell : 0}">
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <label class="form-label">${I18n.t('saleDiscount')}</label>
              <input class="form-control" id="cart-add-disc" type="number" min="0" max="100" value="0">
            </div>
            <button class="btn btn-primary" onclick="SmartTradeApp.addSaleCartLine()">+ ${I18n.t('actionAdd')}</button>
          </div>
        </div>
      </div>

      <div id="new-sale-cart-table">
        ${renderCartTable('S')}
      </div>

      <div class="form-row" style="margin-top: 16px;">
        <div class="form-group">
          <label class="form-label">${I18n.t('saleTaxRate')}</label>
          <input class="form-control" id="new-sale-tax" type="number" value="${S.company.defaultTax}" oninput="SmartTradeApp.refreshCartSummary('S')">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('saleAmountPaid')}</label>
          <input class="form-control" id="new-sale-paid" type="number" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('salePaymentMethod')}</label>
          <select class="form-select" id="new-sale-method">
            <option value="CASH">Cash in Hand</option>
            <option value="BANK">Bank Transfer</option>
          </select>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitSale()">${I18n.t('actionPost')}</button>
    `;

    UI.showModal({
      title: I18n.t('saleNewInvoice'),
      content,
      footer,
      width: '750px'
    });
  }

  function addSaleCartLine() {
    const S = Store.getState();
    const pId = +document.getElementById('cart-add-prod').value;
    const qty = +document.getElementById('cart-add-qty').value;
    const priceVal = parseFloat(document.getElementById('cart-add-price').value || 0);
    const disc = parseFloat(document.getElementById('cart-add-disc').value || 0);

    if (qty <= 0) {
      UI.toast('Quantity must be greater than zero', 'error');
      return;
    }

    const priceInCents = Math.round(priceVal * 100);
    invoiceCart.push({
      p: pId,
      q: qty,
      price: priceInCents,
      d: disc
    });

    document.getElementById('new-sale-cart-table').innerHTML = renderCartTable('S');
  }

  function renderCartTable(type) {
    const S = Store.getState();
    const curr = S.company.currency;
    if (!invoiceCart.length) {
      return `<p style="text-align:center; color:var(--text-muted); padding:16px;">Cart is empty. Add at least one item.</p>`;
    }

    let netTotal = 0;
    const rows = invoiceCart.map((item, idx) => {
      const prod = Engine.pn(S, item.p) || { name: '#' + item.p };
      const gross = item.q * (type === 'S' ? item.price : (item.cost * 100));
      const lineNet = gross - Math.round(gross * (item.d || 0) / 100);
      netTotal += lineNet;

      return `
        <tr>
          <td><b>${UI.escapeHtml(prod.name)}</b></td>
          <td class="num-col">${item.q}</td>
          <td class="num-col">${I18n.fmtMoney(type === 'S' ? item.price : item.cost * 100, curr)}</td>
          ${type === 'S' ? `<td class="num-col">${item.d || 0}%</td>` : ''}
          <td class="num-col">${I18n.fmtMoney(lineNet, curr)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="SmartTradeApp.removeCartLine(${idx}, '${type}')">×</button></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="num-col">Qty</th>
              <th class="num-col">Price</th>
              ${type === 'S' ? '<th class="num-col">Disc %</th>' : ''}
              <th class="num-col">Net Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="font-weight: bold; background: var(--bg-subtle);">
              <td colspan="${type === 'S' ? 4 : 3}">Subtotal Net:</td>
              <td class="num-col">${I18n.fmtMoney(netTotal, curr)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function removeCartLine(idx, type) {
    invoiceCart.splice(idx, 1);
    const container = document.getElementById(type === 'S' ? 'new-sale-cart-table' : 'new-pur-cart-table');
    if (container) container.innerHTML = renderCartTable(type);
  }

  function updateCartPricePlaceholder() {
    const S = Store.getState();
    const select = document.getElementById('cart-add-prod');
    const priceInput = document.getElementById('cart-add-price');
    if (select && priceInput) {
      const prod = Engine.pn(S, select.value);
      if (prod) priceInput.value = prod.sell;
    }
  }

  function submitSale() {
    if (!invoiceCart.length) {
      UI.toast('Please add at least one line item', 'error');
      return;
    }

    const party = document.getElementById('new-sale-party').value;
    const wh = +document.getElementById('new-sale-wh').value;
    const tax = +document.getElementById('new-sale-tax').value;
    const paidInput = parseFloat(document.getElementById('new-sale-paid').value || 0);
    const method = document.getElementById('new-sale-method').value;
    const paidCents = Math.round(paidInput * 100);

    const res = Store.mutate((S, E, role) => {
      return E.sell(S, {
        role,
        party,
        wh,
        tax,
        paid: paidCents,
        paymentMethod: method,
        items: invoiceCart
      });
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Sales Invoice created successfully!', 'success');
      invoiceCart = [];
      navigateTo('sales');
    } else {
      UI.toast(res.error, 'error');
    }
  }

  // Purchases modal
  function openNewPurchaseModal() {
    const S = Store.getState();
    invoiceCart = [];

    const productOptions = S.pr.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)} (Cost: ${I18n.fmtMoney(p.buy*100, S.company.currency)})</option>`).join('');
    const supplierOptions = S.su.map(s => `<option value="${s.id}">${UI.escapeHtml(s.name)}</option>`).join('');
    const whOptions = S.wh.map((w, idx) => `<option value="${idx}">${UI.escapeHtml(w)}</option>`).join('');

    const content = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('purSupplier')}</label>
          <select class="form-select" id="new-pur-party">${supplierOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('purDestinationWh')}</label>
          <select class="form-select" id="new-pur-wh">${whOptions}</select>
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px; background: var(--bg-subtle);">
        <div class="card-body" style="padding: 12px;">
          <div class="form-row" style="align-items: flex-end;">
            <div class="form-group" style="flex: 2; margin-bottom: 0;">
              <label class="form-label">${I18n.t('prodName')}</label>
              <select class="form-select" id="pur-add-prod" onchange="SmartTradeApp.updatePurPricePlaceholder()">${productOptions}</select>
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <label class="form-label">${I18n.t('saleQty')}</label>
              <input class="form-control" id="pur-add-qty" type="number" min="1" value="1">
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <label class="form-label">${I18n.t('prodBuy')}</label>
              <input class="form-control" id="pur-add-cost" type="number" step="0.01" value="${S.pr[0] ? S.pr[0].buy : 0}">
            </div>
            <button class="btn btn-primary" onclick="SmartTradeApp.addPurCartLine()">+ ${I18n.t('actionAdd')}</button>
          </div>
        </div>
      </div>

      <div id="new-pur-cart-table">
        ${renderCartTable('P')}
      </div>

      <div class="form-row" style="margin-top: 16px;">
        <div class="form-group">
          <label class="form-label">${I18n.t('saleTaxRate')}</label>
          <input class="form-control" id="new-pur-tax" type="number" value="${S.company.defaultTax}">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('saleAmountPaid')}</label>
          <input class="form-control" id="new-pur-paid" type="number" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('salePaymentMethod')}</label>
          <select class="form-select" id="new-pur-method">
            <option value="BANK">Bank Transfer</option>
            <option value="CASH">Cash in Hand</option>
          </select>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitPurchase()">${I18n.t('actionPost')}</button>
    `;

    UI.showModal({
      title: I18n.t('purNewBill'),
      content,
      footer,
      width: '750px'
    });
  }

  function addPurCartLine() {
    const pId = +document.getElementById('pur-add-prod').value;
    const qty = +document.getElementById('pur-add-qty').value;
    const costVal = parseFloat(document.getElementById('pur-add-cost').value || 0);

    if (qty <= 0) {
      UI.toast('Quantity must be greater than zero', 'error');
      return;
    }

    invoiceCart.push({
      p: pId,
      q: qty,
      cost: costVal
    });

    document.getElementById('new-pur-cart-table').innerHTML = renderCartTable('P');
  }

  function updatePurPricePlaceholder() {
    const S = Store.getState();
    const select = document.getElementById('pur-add-prod');
    const costInput = document.getElementById('pur-add-cost');
    if (select && costInput) {
      const prod = Engine.pn(S, select.value);
      if (prod) costInput.value = prod.buy;
    }
  }

  function submitPurchase() {
    if (!invoiceCart.length) {
      UI.toast('Please add at least one line item', 'error');
      return;
    }

    const party = document.getElementById('new-pur-party').value;
    const wh = +document.getElementById('new-pur-wh').value;
    const tax = +document.getElementById('new-pur-tax').value;
    const paidInput = parseFloat(document.getElementById('new-pur-paid').value || 0);
    const method = document.getElementById('new-pur-method').value;
    const paidCents = Math.round(paidInput * 100);

    const res = Store.mutate((S, E, role) => {
      return E.buy(S, {
        role,
        party,
        wh,
        tax,
        paid: paidCents,
        paymentMethod: method,
        items: invoiceCart
      });
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Purchase Bill posted successfully!', 'success');
      invoiceCart = [];
      navigateTo('purchases');
    } else {
      UI.toast(res.error, 'error');
    }
  }

  // Invoice Detail View
  function openDocumentDetail(invoiceId) {
    const S = Store.getState();
    const inv = S.iv.find(i => i.id === invoiceId);
    if (inv) {
      openedDetailDoc = inv;
      renderCurrentView();
    }
  }

  function closeDocumentDetail() {
    openedDetailDoc = null;
    renderCurrentView();
  }

  function openPayInvoiceModal(invoiceId) {
    const S = Store.getState();
    const inv = S.iv.find(i => i.id === invoiceId);
    if (!inv) return;

    const due = Engine.out(inv);
    const curr = S.company.currency;

    const content = `
      <p style="margin-bottom: 14px;">Recording payment for <b>${inv.num}</b> (Due: <b>${I18n.fmtMoney(due, curr)}</b>)</p>
      <div class="form-group">
        <label class="form-label">${I18n.t('cashAmount')}</label>
        <input class="form-control" id="pay-inv-amount" type="number" step="0.01" value="${(due/100).toFixed(2)}" max="${(due/100).toFixed(2)}">
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('cashAccount')}</label>
        <select class="form-select" id="pay-inv-acc">
          <option value="CASH">Cash in Hand</option>
          <option value="BANK">Bank Operating Account</option>
        </select>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-success" onclick="SmartTradeApp.submitInvoicePayment(${invoiceId})">${I18n.t('actionPay')}</button>
    `;

    UI.showModal({
      title: I18n.t('actionPay'),
      content,
      footer,
      width: '400px'
    });
  }

  function submitInvoicePayment(invoiceId) {
    const val = parseFloat(document.getElementById('pay-inv-amount').value || 0);
    const acc = document.getElementById('pay-inv-acc').value;
    const cents = Math.round(val * 100);

    const res = Store.mutate((S, E, role) => {
      const inv = S.iv.find(i => i.id === invoiceId);
      return E.pay(S, role, inv, cents, acc);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Payment recorded successfully', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  function openReturnModal(invoiceId, lineIndex) {
    const S = Store.getState();
    const inv = S.iv.find(i => i.id === invoiceId);
    if (!inv) return;
    const line = inv.lines[lineIndex];
    const maxReturn = line.q - (line.r || 0);

    const content = `
      <div class="form-group">
        <label class="form-label">${I18n.t('saleReturnQty')} (Max: ${maxReturn})</label>
        <input class="form-control" id="return-qty-input" type="number" min="1" max="${maxReturn}" value="1">
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-danger" onclick="SmartTradeApp.submitReturn(${invoiceId}, ${lineIndex})">${I18n.t('actionReturn')}</button>
    `;

    UI.showModal({
      title: I18n.t('actionReturn'),
      content,
      footer,
      width: '380px'
    });
  }

  function submitReturn(invoiceId, lineIndex) {
    const qty = +document.getElementById('return-qty-input').value;

    const res = Store.mutate((S, E, role) => {
      const inv = S.iv.find(i => i.id === invoiceId);
      return E.sret(S, role, inv, lineIndex, qty);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Return processed successfully!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  function cancelInvoicePrompt(invoiceId) {
    UI.confirmDialog({
      title: I18n.t('actionCancelInvoice'),
      message: 'Cancelling will reverse all inventory movements and journal entries, restoring stock and refunding any payments. Proceed?',
      confirmText: I18n.t('actionCancelInvoice'),
      confirmClass: 'btn-danger'
    }).then(confirmed => {
      if (!confirmed) return;
      const res = Store.mutate((S, E, role) => {
        const inv = S.iv.find(i => i.id === invoiceId);
        return E.cancel(S, role, inv);
      });
      if (res.success) {
        UI.toast('Invoice cancelled successfully', 'success');
        renderCurrentView();
      } else {
        UI.toast(res.error, 'error');
      }
    });
  }

  // Inter-warehouse stock transfer modal
  function openTransferModal() {
    const S = Store.getState();
    const productOptions = S.pr.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join('');
    const whOptions = S.wh.map((w, idx) => `<option value="${idx}">${UI.escapeHtml(w)}</option>`).join('');

    const content = `
      <div class="form-group">
        <label class="form-label">${I18n.t('prodName')}</label>
        <select class="form-select" id="tr-prod">${productOptions}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('invTransferFrom')}</label>
          <select class="form-select" id="tr-from">${whOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('invTransferTo')}</label>
          <select class="form-select" id="tr-to">${whOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('invTransferQty')}</label>
        <input class="form-control" id="tr-qty" type="number" min="1" value="1">
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitTransfer()">${I18n.t('actionTransfer')}</button>
    `;

    UI.showModal({
      title: I18n.t('invTransferTitle'),
      content,
      footer,
      width: '450px'
    });
  }

  function submitTransfer() {
    const pId = +document.getElementById('tr-prod').value;
    const fromWh = +document.getElementById('tr-from').value;
    const toWh = +document.getElementById('tr-to').value;
    const qty = +document.getElementById('tr-qty').value;

    const res = Store.mutate((S, E, role) => {
      return E.transfer(S, role, pId, fromWh, toWh, qty);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Stock transferred successfully!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  // Stock Adjustment modal
  function openAdjustModal() {
    const S = Store.getState();
    const productOptions = S.pr.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join('');
    const whOptions = S.wh.map((w, idx) => `<option value="${idx}">${UI.escapeHtml(w)}</option>`).join('');

    const content = `
      <div class="form-group">
        <label class="form-label">${I18n.t('prodName')}</label>
        <select class="form-select" id="adj-prod">${productOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('saleWarehouse')}</label>
        <select class="form-select" id="adj-wh">${whOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('invAdjustQty')}</label>
        <input class="form-control" id="adj-qty" type="number" value="-1" step="1">
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('invAdjustReason')}</label>
        <input class="form-control" id="adj-reason" placeholder="e.g. Damaged in shipment / Inventory physical count">
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitAdjust()">${I18n.t('actionAdjust')}</button>
    `;

    UI.showModal({
      title: I18n.t('invAdjustTitle'),
      content,
      footer,
      width: '450px'
    });
  }

  function submitAdjust() {
    const pId = +document.getElementById('adj-prod').value;
    const wh = +document.getElementById('adj-wh').value;
    const qty = +document.getElementById('adj-qty').value;
    const reason = document.getElementById('adj-reason').value;

    const res = Store.mutate((S, E, role) => {
      return E.adjust(S, role, pId, wh, qty, reason);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Inventory adjustment booked to General Ledger!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  // Operating Expense Modal
  function openNewExpenseModal() {
    const categories = ['Facility Rent', 'Utilities & Internet', 'Logistics & Shipping', 'Office Supplies', 'Marketing & Ads', 'Maintenance & Repairs', 'Salaries & Wages', 'Other'];
    const catOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    const content = `
      <div class="form-group">
        <label class="form-label">${I18n.t('cashCategory')}</label>
        <select class="form-select" id="exp-cat">${catOptions}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('cashAmount')}</label>
          <input class="form-control" id="exp-amount" type="number" step="0.01" min="1" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('cashAccount')}</label>
          <select class="form-select" id="exp-acc">
            <option value="CASH">Cash in Hand</option>
            <option value="BANK">Bank Current Account</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('cashNote')}</label>
        <input class="form-control" id="exp-note" placeholder="Receipt number, invoice memo or details">
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitExpense()">${I18n.t('actionPost')}</button>
    `;

    UI.showModal({
      title: I18n.t('cashNewExpense'),
      content,
      footer,
      width: '450px'
    });
  }

  function submitExpense() {
    const cat = document.getElementById('exp-cat').value;
    const amountVal = parseFloat(document.getElementById('exp-amount').value || 0);
    const acc = document.getElementById('exp-acc').value;
    const note = document.getElementById('exp-note').value;
    const amountCents = Math.round(amountVal * 100);

    const res = Store.mutate((S, E, role) => {
      return E.expense(S, role, cat, amountCents, note, acc);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Expense recorded and journalized!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  // Product CRUD Modals
  function openNewProductModal() {
    const content = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('prodSku')}</label>
          <input class="form-control" id="p-sku" placeholder="e.g. LAP-XPS-15">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodBarcode')}</label>
          <input class="form-control" id="p-bar" placeholder="e.g. 6221005555">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('prodName')}</label>
        <input class="form-control" id="p-name" placeholder="Full product description">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('prodCat')}</label>
          <input class="form-control" id="p-cat" placeholder="e.g. Hardware">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodUnit')}</label>
          <input class="form-control" id="p-unit" value="pcs">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('prodBuy')}</label>
          <input class="form-control" id="p-buy" type="number" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodSell')}</label>
          <input class="form-control" id="p-sell" type="number" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodMin')}</label>
          <input class="form-control" id="p-min" type="number" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodReorder')}</label>
          <input class="form-control" id="p-ms" type="number" value="5">
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitNewProduct()">${I18n.t('actionSave')}</button>
    `;

    UI.showModal({
      title: I18n.t('prodNew'),
      content,
      footer,
      width: '600px'
    });
  }

  function submitNewProduct() {
    const sku = document.getElementById('p-sku').value;
    const barcode = document.getElementById('p-bar').value;
    const name = document.getElementById('p-name').value;
    const cat = document.getElementById('p-cat').value || 'General';
    const unit = document.getElementById('p-unit').value || 'pcs';
    const buy = parseFloat(document.getElementById('p-buy').value || 0);
    const sell = parseFloat(document.getElementById('p-sell').value || 0);
    const min = parseFloat(document.getElementById('p-min').value || 0);
    const ms = +document.getElementById('p-ms').value || 5;

    if (!sku || !name) {
      UI.toast('SKU and Name are required', 'error');
      return;
    }

    const res = Store.mutate((S, E, role) => {
      S.seq.PR = (S.seq.PR || S.pr.length) + 1;
      const newProd = {
        id: S.seq.PR,
        sku,
        barcode,
        name,
        cat,
        unit,
        buy,
        sell,
        min: min * 100,
        ms
      };
      S.pr.push(newProd);
      E.log(S, role, 'CREATE_PRODUCT', `${sku} - ${name}`);
      return newProd;
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Product created successfully!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  function openEditProductModal(productId) {
    const S = Store.getState();
    const p = S.pr.find(x => x.id === productId);
    if (!p) return;

    const content = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('prodSku')}</label>
          <input class="form-control" id="pe-sku" value="${UI.escapeHtml(p.sku)}">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodBarcode')}</label>
          <input class="form-control" id="pe-bar" value="${UI.escapeHtml(p.barcode || '')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('prodName')}</label>
        <input class="form-control" id="pe-name" value="${UI.escapeHtml(p.name)}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('prodCat')}</label>
          <input class="form-control" id="pe-cat" value="${UI.escapeHtml(p.cat)}">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodUnit')}</label>
          <input class="form-control" id="pe-unit" value="${UI.escapeHtml(p.unit || 'pcs')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('prodBuy')}</label>
          <input class="form-control" id="pe-buy" type="number" step="0.01" value="${p.buy}">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodSell')}</label>
          <input class="form-control" id="pe-sell" type="number" step="0.01" value="${p.sell}">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodMin')}</label>
          <input class="form-control" id="pe-min" type="number" step="0.01" value="${(p.min/100).toFixed(2)}">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('prodReorder')}</label>
          <input class="form-control" id="pe-ms" type="number" value="${p.ms || 0}">
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitEditProduct(${productId})">${I18n.t('actionSave')}</button>
    `;

    UI.showModal({
      title: I18n.t('prodEdit'),
      content,
      footer,
      width: '600px'
    });
  }

  function submitEditProduct(productId) {
    const sku = document.getElementById('pe-sku').value;
    const barcode = document.getElementById('pe-bar').value;
    const name = document.getElementById('pe-name').value;
    const cat = document.getElementById('pe-cat').value;
    const unit = document.getElementById('pe-unit').value;
    const buy = parseFloat(document.getElementById('pe-buy').value || 0);
    const sell = parseFloat(document.getElementById('pe-sell').value || 0);
    const min = parseFloat(document.getElementById('pe-min').value || 0);
    const ms = +document.getElementById('pe-ms').value;

    const res = Store.mutate((S, E, role) => {
      const prod = S.pr.find(x => x.id === productId);
      if (!prod) throw new Error('Product not found');
      prod.sku = sku;
      prod.barcode = barcode;
      prod.name = name;
      prod.cat = cat;
      prod.unit = unit;
      prod.buy = buy;
      prod.sell = sell;
      prod.min = min * 100;
      prod.ms = ms;
      E.log(S, role, 'UPDATE_PRODUCT', `${sku} updated`);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Product updated successfully!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  // Partner Modals
  function openNewPartnerModal(type) {
    const isCustomer = type === 'S';
    const content = `
      <div class="form-group">
        <label class="form-label">${I18n.t('partName')}</label>
        <input class="form-control" id="part-name" placeholder="Business name or individual">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('partPhone')}</label>
          <input class="form-control" id="part-ph" placeholder="+20 ...">
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('partEmail')}</label>
          <input class="form-control" id="part-email" placeholder="billing@...">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${I18n.t('partTaxId')}</label>
          <input class="form-control" id="part-tax" placeholder="EG-...">
        </div>
        ${isCustomer ? `
          <div class="form-group">
            <label class="form-label">${I18n.t('partCreditLimit')}</label>
            <input class="form-control" id="part-limit" type="number" value="100000">
          </div>
        ` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('partAddress')}</label>
        <input class="form-control" id="part-address" placeholder="Commercial address">
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitNewPartner('${type}')">${I18n.t('actionSave')}</button>
    `;

    UI.showModal({
      title: isCustomer ? I18n.t('partNewCustomer') : I18n.t('partNewSupplier'),
      content,
      footer,
      width: '550px'
    });
  }

  function submitNewPartner(type) {
    const name = document.getElementById('part-name').value;
    const ph = document.getElementById('part-ph').value;
    const email = document.getElementById('part-email').value;
    const taxId = document.getElementById('part-tax').value;
    const address = document.getElementById('part-address').value;
    const creditLimit = document.getElementById('part-limit') ? parseFloat(document.getElementById('part-limit').value || 0) : 0;

    if (!name) {
      UI.toast('Name is required', 'error');
      return;
    }

    const res = Store.mutate((S, E, role) => {
      const list = type === 'S' ? S.cu : S.su;
      const seqKey = type === 'S' ? 'CU' : 'SU';
      S.seq[seqKey] = (S.seq[seqKey] || list.length) + 1;
      const newParty = {
        id: S.seq[seqKey],
        name,
        ph,
        email,
        taxId,
        address,
        creditLimit
      };
      list.push(newParty);
      E.log(S, role, 'CREATE_PARTNER', `${name} (${type === 'S' ? 'Customer' : 'Supplier'})`);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Contact added successfully!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  function openPayPartyModal(type, partyId, balanceCents) {
    const S = Store.getState();
    const isCustomer = type === 'S';
    const party = (isCustomer ? S.cu : S.su).find(p => p.id === partyId);
    const curr = S.company.currency;

    const content = `
      <p style="margin-bottom: 12px;">
        ${isCustomer ? 'Collect payment from' : 'Disburse payment to'} <b>${UI.escapeHtml(party.name)}</b>.<br>
        Current balance due: <b>${I18n.fmtMoney(balanceCents, curr)}</b> (allocated oldest-first)
      </p>
      <div class="form-group">
        <label class="form-label">${I18n.t('cashAmount')}</label>
        <input class="form-control" id="pay-party-amount" type="number" step="0.01" value="${(balanceCents/100).toFixed(2)}" max="${(balanceCents/100).toFixed(2)}">
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('cashAccount')}</label>
        <select class="form-select" id="pay-party-acc">
          <option value="BANK">Bank Current Account</option>
          <option value="CASH">Cash on Hand</option>
        </select>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-success" onclick="SmartTradeApp.submitPayParty('${type}', ${partyId})">${isCustomer ? I18n.t('actionCollect') : I18n.t('actionDisburse')}</button>
    `;

    UI.showModal({
      title: isCustomer ? I18n.t('actionCollect') : I18n.t('actionDisburse'),
      content,
      footer,
      width: '420px'
    });
  }

  function submitPayParty(type, partyId) {
    const val = parseFloat(document.getElementById('pay-party-amount').value || 0);
    const acc = document.getElementById('pay-party-acc').value;
    const cents = Math.round(val * 100);

    const res = Store.mutate((S, E, role) => {
      E.payParty(S, role, type, partyId, cents, acc);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Account payment allocated successfully!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  function openStatementModal(type, partyId) {
    const S = Store.getState();
    const curr = S.company.currency;
    const party = (type === 'S' ? S.cu : S.su).find(p => p.id === partyId);
    const invoices = S.iv.filter(i => i.t === type && i.party === partyId);

    const content = `
      <div style="margin-bottom: 16px;">
        <h3>${UI.escapeHtml(party.name)}</h3>
        <small>${party.address || ''} • Tel: ${party.ph || ''} • Tax: ${party.taxId || 'N/A'}</small>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Doc #</th>
              <th class="num-col">Total</th>
              <th class="num-col">Paid</th>
              <th class="num-col">Balance Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(i => `
              <tr>
                <td>${I18n.fmtDate(i.d)}</td>
                <td><b>${i.num}</b></td>
                <td class="num-col">${I18n.fmtMoney(i.grand, curr)}</td>
                <td class="num-col">${I18n.fmtMoney(i.paid || 0, curr)}</td>
                <td class="num-col" style="font-weight: 600;">${I18n.fmtMoney(Engine.out(i), curr)}</td>
                <td>${UI.badge(Engine.stat(i))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="window.print()">🖨️ ${I18n.t('actionPrint')}</button>
      <button class="btn btn-primary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionClose')}</button>
    `;

    UI.showModal({
      title: I18n.t('partStatement'),
      content,
      footer,
      width: '700px'
    });
  }

  // Manual Journal Entry Modal
  function openManualJournalModal() {
    const S = Store.getState();
    const accountKeys = Object.keys(Engine.TYPE);
    const accOptions = accountKeys.map(a => `<option value="${a}">${a} (${Engine.TYPE[a]})</option>`).join('');

    const content = `
      <div class="form-group">
        <label class="form-label">Memo / Description</label>
        <input class="form-control" id="mj-memo" placeholder="e.g. Month-end depreciation / Partner capital">
      </div>
      <div class="form-group">
        <label class="form-label">Reference #</label>
        <input class="form-control" id="mj-ref" placeholder="JV-2026-001">
      </div>
      <div id="mj-lines-container">
        <div class="form-row" style="margin-bottom: 8px;">
          <div style="flex: 2;">
            <label class="form-label">Account</label>
            <select class="form-select mj-acc">${accOptions}</select>
          </div>
          <div style="flex: 1;">
            <label class="form-label">Debit (Dr)</label>
            <input class="form-control mj-dr" type="number" step="0.01" value="0">
          </div>
          <div style="flex: 1;">
            <label class="form-label">Credit (Cr)</label>
            <input class="form-control mj-cr" type="number" step="0.01" value="0">
          </div>
        </div>
        <div class="form-row" style="margin-bottom: 8px;">
          <div style="flex: 2;">
            <select class="form-select mj-acc">${accOptions}</select>
          </div>
          <div style="flex: 1;">
            <input class="form-control mj-dr" type="number" step="0.01" value="0">
          </div>
          <div style="flex: 1;">
            <input class="form-control mj-cr" type="number" step="0.01" value="0">
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="SmartTradeUI.closeModal()">${I18n.t('actionCancel')}</button>
      <button class="btn btn-primary" onclick="SmartTradeApp.submitManualJournal()">${I18n.t('actionPost')}</button>
    `;

    UI.showModal({
      title: I18n.t('accManualJournal'),
      content,
      footer,
      width: '600px'
    });
  }

  function submitManualJournal() {
    const memo = document.getElementById('mj-memo').value;
    const ref = document.getElementById('mj-ref').value;
    const accEls = document.querySelectorAll('.mj-acc');
    const drEls = document.querySelectorAll('.mj-dr');
    const crEls = document.querySelectorAll('.mj-cr');

    const lines = [];
    for (let i = 0; i < accEls.length; i++) {
      const acc = accEls[i].value;
      const dr = Math.round(parseFloat(drEls[i].value || 0) * 100);
      const cr = Math.round(parseFloat(crEls[i].value || 0) * 100);
      if (dr > 0 || cr > 0) {
        lines.push([acc, dr, cr]);
      }
    }

    const res = Store.mutate((S, E, role) => {
      return E.manualJournal(S, role, lines, memo, ref);
    });

    if (res.success) {
      UI.closeModal();
      UI.toast('Manual journal entry posted successfully!', 'success');
      renderCurrentView();
    } else {
      UI.toast(res.error, 'error');
    }
  }

  // Settings Save
  function saveCompanySettings() {
    const name = document.getElementById('set-name').value;
    const tax = document.getElementById('set-tax').value;
    const phone = document.getElementById('set-phone').value;
    const curr = document.getElementById('set-curr').value;
    const defTax = +document.getElementById('set-deftax').value;
    const address = document.getElementById('set-address').value;

    const res = Store.mutate((S) => {
      S.company.name = name;
      S.company.taxId = tax;
      S.company.phone = phone;
      S.company.currency = curr;
      S.company.defaultTax = defTax;
      S.company.address = address;
    });

    if (res.success) {
      UI.toast('Settings updated successfully', 'success');
      renderNavigation();
      renderHeader();
      renderCurrentView();
    }
  }

  // Backup & Restore
  function handleRestoreFile(inputEl) {
    if (inputEl.files && inputEl.files[0]) {
      Store.importBackupJson(inputEl.files[0])
        .then(() => {
          UI.toast('Backup database restored successfully!', 'success');
          renderNavigation();
          renderHeader();
          renderCurrentView();
        })
        .catch(err => {
          UI.toast('Restore failed: ' + err.message, 'error');
        });
    }
  }

  function promptResetDemo() {
    UI.confirmDialog({
      title: I18n.t('actionResetDemo'),
      message: I18n.t('setResetWarning'),
      confirmText: I18n.t('actionResetDemo'),
      confirmClass: 'btn-danger'
    }).then(confirmed => {
      if (confirmed) {
        Store.resetDemoData();
        UI.toast('System reset to demo data', 'info');
        renderNavigation();
        renderHeader();
        renderCurrentView();
      }
    });
  }

  // CSV Exporters
  function exportProductsCsv() {
    const S = Store.getState();
    const headers = ['ID', 'SKU', 'Barcode', 'Product Name', 'Category', 'Unit', 'Cost Price', 'Selling Price', 'Min Price', 'Stock Level'];
    const rows = S.pr.map(p => {
      const q = S.wh.reduce((s, _, w) => s + Engine.pos(S, p.id, w).q, 0);
      return [p.id, p.sku, p.barcode || '', p.name, p.cat, p.unit || 'pcs', p.buy, p.sell, (p.min/100).toFixed(2), q];
    });
    Export.downloadCsv('products-catalog', headers, rows);
  }

  function exportInvoicesCsv(type) {
    const S = Store.getState();
    const headers = ['Invoice #', 'Type', 'Date', 'Party', 'Warehouse', 'Net Subtotal', 'Tax', 'Grand Total', 'Paid', 'Outstanding Due', 'Status'];
    const invoices = S.iv.filter(i => i.t === type);
    const rows = invoices.map(i => {
      const party = (type === 'S' ? S.cu : S.su).find(p => p.id === i.party) || { name: '#' + i.party };
      return [
        i.num,
        type === 'S' ? 'Sale' : 'Purchase',
        i.d,
        party.name,
        S.wh[i.wh] || i.wh,
        (i.net/100).toFixed(2),
        (i.tax/100).toFixed(2),
        (i.grand/100).toFixed(2),
        ((i.paid||0)/100).toFixed(2),
        (Engine.out(i)/100).toFixed(2),
        Engine.stat(i)
      ];
    });
    Export.downloadCsv(type === 'S' ? 'sales-invoices' : 'purchase-bills', headers, rows);
  }

  function exportInventoryCsv() {
    const S = Store.getState();
    const headers = ['SKU', 'Product', 'Warehouse', 'Stock Quantity', 'Unit Cost', 'Asset Valuation'];
    const rows = [];
    S.pr.forEach(p => {
      S.wh.forEach((wName, wIdx) => {
        const s = Engine.pos(S, p.id, wIdx);
        rows.push([p.sku, p.name, wName, s.q, (s.avg/100).toFixed(2), (Engine.val(s.q, s.avg)/100).toFixed(2)]);
      });
    });
    Export.downloadCsv('inventory-valuation', headers, rows);
  }

  function exportAuditCsv() {
    const S = Store.getState();
    const headers = ['Date', 'Time', 'User Role', 'Action Code', 'Details'];
    const rows = (S.au || []).map(a => [a.t, a.time || '', a.u, a.a, a.x]);
    Export.downloadCsv('audit-trail', headers, rows);
  }

  function setSearch(query) {
    searchQuery = query;
    renderCurrentView();
  }

  function setActiveTab(tab) {
    activeTab = tab;
    renderCurrentView();
  }

  return {
    init: initApp,
    navigateTo,
    setSearch,
    setActiveTab,
    openNewSaleModal,
    addSaleCartLine,
    removeCartLine,
    updateCartPricePlaceholder,
    submitSale,
    openNewPurchaseModal,
    addPurCartLine,
    updatePurPricePlaceholder,
    submitPurchase,
    openDocumentDetail,
    closeDocumentDetail,
    openPayInvoiceModal,
    submitInvoicePayment,
    openReturnModal,
    submitReturn,
    cancelInvoicePrompt,
    openTransferModal,
    submitTransfer,
    openAdjustModal,
    submitAdjust,
    openNewExpenseModal,
    submitExpense,
    openNewProductModal,
    submitNewProduct,
    openEditProductModal,
    submitEditProduct,
    openNewPartnerModal,
    submitNewPartner,
    openPayPartyModal,
    submitPayParty,
    openStatementModal,
    openManualJournalModal,
    submitManualJournal,
    saveCompanySettings,
    handleRestoreFile,
    promptResetDemo,
    exportProductsCsv,
    exportInvoicesCsv,
    exportInventoryCsv,
    exportAuditCsv
  };
})();

window.SmartTradeApp = SmartTradeApp;

function startApp() {
  if (window.SmartTradeApp && window.SmartTradeApp.init) {
    window.SmartTradeApp.init();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
