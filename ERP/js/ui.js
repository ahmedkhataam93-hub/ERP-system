/**
 * SmartTrade ERP UI Component Library
 * Modals, Toasts, DataTables, Status Badges & Interactive SVG Charts
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exported = factory(require('./i18n.js'));
    module.exports = exported;
    if (root) root.SmartTradeUI = exported;
  } else {
    root.SmartTradeUI = factory(root.SmartTradeI18n);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  // 1. Toast Notification System
  function toast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('smarttrade-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'smarttrade-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toastEl.innerHTML = `
      <span class="toast-icon">${iconMap[type] || '•'}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toastEl);

    // Trigger enter animation
    setTimeout(() => toastEl.classList.add('show'), 10);

    // Auto dismiss
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  }

  // 2. Modal Dialog System
  function showModal({ title, content, footer = '', width = '600px' }) {
    let backdrop = document.getElementById('smarttrade-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'smarttrade-modal-backdrop';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-dialog" id="smarttrade-modal-dialog">
          <div class="modal-header">
            <h3 id="smarttrade-modal-title"></h3>
            <button class="modal-close" id="smarttrade-modal-close-btn">&times;</button>
          </div>
          <div class="modal-body" id="smarttrade-modal-body"></div>
          <div class="modal-footer" id="smarttrade-modal-footer"></div>
        </div>
      `;
      document.body.appendChild(backdrop);

      // Close handlers
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
      document.getElementById('smarttrade-modal-close-btn').addEventListener('click', closeModal);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && backdrop.classList.contains('active')) {
          closeModal();
        }
      });
    }

    const dialog = document.getElementById('smarttrade-modal-dialog');
    dialog.style.maxWidth = width;
    document.getElementById('smarttrade-modal-title').textContent = title;
    document.getElementById('smarttrade-modal-body').innerHTML = content;
    document.getElementById('smarttrade-modal-footer').innerHTML = footer;

    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const backdrop = document.getElementById('smarttrade-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function confirmDialog({ title = 'Confirm Action', message, confirmText = 'Confirm', confirmClass = 'btn-primary' }) {
    return new Promise((resolve) => {
      const footer = `
        <button class="btn btn-secondary" id="confirm-cancel-btn">${I18n.t('actionCancel')}</button>
        <button class="btn ${confirmClass}" id="confirm-ok-btn">${confirmText}</button>
      `;
      showModal({
        title,
        content: `<p class="confirm-message">${escapeHtml(message)}</p>`,
        footer,
        width: '420px'
      });

      document.getElementById('confirm-cancel-btn').onclick = () => {
        closeModal();
        resolve(false);
      };
      document.getElementById('confirm-ok-btn').onclick = () => {
        closeModal();
        resolve(true);
      };
    });
  }

  // 3. Status Badges
  function badge(statusKey) {
    const clean = String(statusKey).toUpperCase();
    const map = {
      PAID: { label: I18n.t('statusPaid'), cls: 'badge-success' },
      PARTIAL: { label: I18n.t('statusPartial'), cls: 'badge-warning' },
      POSTED: { label: I18n.t('statusPosted'), cls: 'badge-info' },
      CANCELLED: { label: I18n.t('statusCancelled'), cls: 'badge-danger' },
      IN_STOCK: { label: I18n.t('prodInStock'), cls: 'badge-success' },
      LOW_STOCK: { label: I18n.t('prodLowStock'), cls: 'badge-warning' },
      OUT_OF_STOCK: { label: I18n.t('prodOutOfStock'), cls: 'badge-danger' }
    };

    const item = map[clean] || { label: statusKey, cls: 'badge-neutral' };
    return `<span class="badge ${item.cls}">${escapeHtml(item.label)}</span>`;
  }

  // 4. Interactive SVG Charts
  function renderSalesPurchaseChart(S) {
    const dailySales = {};
    const dailyPurchases = {};

    S.iv.forEach(i => {
      if (i.x) return;
      if (i.t === 'S') {
        dailySales[i.d] = (dailySales[i.d] || 0) + i.net;
      } else {
        dailyPurchases[i.d] = (dailyPurchases[i.d] || 0) + i.net;
      }
    });

    const allDates = Array.from(new Set([...Object.keys(dailySales), ...Object.keys(dailyPurchases)])).sort().slice(-8);

    if (allDates.length === 0) {
      return `<div class="empty-state">${I18n.t('emptyList')}</div>`;
    }

    const maxVal = Math.max(1, ...allDates.map(d => Math.max(dailySales[d] || 0, dailyPurchases[d] || 0)));

    const width = allDates.length * 80;
    const height = 180;
    const chartHeight = 120;

    let svgBars = '';
    allDates.forEach((date, idx) => {
      const x = idx * 80 + 15;
      const saleVal = dailySales[date] || 0;
      const purchVal = dailyPurchases[date] || 0;

      const saleH = Math.round((saleVal / maxVal) * chartHeight);
      const purchH = Math.round((purchVal / maxVal) * chartHeight);

      // Sale Bar (Indigo/Primary)
      if (saleH > 0) {
        svgBars += `
          <rect x="${x}" y="${140 - saleH}" width="22" height="${saleH}" rx="4" class="chart-bar-sale">
            <title>${date} Sales: ${I18n.fmtMoney(saleVal, S.company.currency)}</title>
          </rect>
        `;
      }
      // Purchase Bar (Amber/Secondary)
      if (purchH > 0) {
        svgBars += `
          <rect x="${x + 26}" y="${140 - purchH}" width="22" height="${purchH}" rx="4" class="chart-bar-purch">
            <title>${date} Purchases: ${I18n.fmtMoney(purchVal, S.company.currency)}</title>
          </rect>
        `;
      }

      // Date Label
      const shortDate = date.slice(5);
      svgBars += `
        <text x="${x + 24}" y="160" font-size="11" text-anchor="middle" fill="var(--text-muted)">${shortDate}</text>
      `;
    });

    return `
      <div class="chart-container">
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot dot-sale"></span> ${I18n.t('kpiTotalRevenue')}</span>
          <span class="legend-item"><span class="legend-dot dot-purch"></span> ${I18n.t('kpiPurchases')}</span>
        </div>
        <div class="chart-svg-wrapper">
          <svg viewBox="0 0 ${width} ${height}" class="interactive-svg-chart">
            <line x1="0" y1="140" x2="${width}" y2="140" stroke="var(--border-subtle)" stroke-width="1" />
            ${svgBars}
          </svg>
        </div>
      </div>
    `;
  }

  // Helper escape
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  return {
    toast,
    showModal,
    closeModal,
    confirmDialog,
    badge,
    renderSalesPurchaseChart,
    escapeHtml
  };
}));
