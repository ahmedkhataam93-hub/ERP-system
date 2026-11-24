/**
 * SmartTrade ERP State Manager & Persistence Store
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exported = factory(require('./engine.js'), require('./i18n.js'));
    module.exports = exported;
    if (root) root.SmartTradeStore = exported;
  } else {
    root.SmartTradeStore = factory(root.SmartTradeEngine, root.SmartTradeI18n);
  }
}(typeof self !== 'undefined' ? self : this, function (Engine, I18n) {
  'use strict';

  const STORAGE_KEY = 'smarttrade_erp_state';
  const ROLE_KEY = 'smarttrade_user_role';
  const THEME_KEY = 'smarttrade_theme';

  let S = null;
  let currentRole = 'admin';
  let saveDebounceTimer = null;

  function init() {
    // 1. Language init
    try {
      const savedLang = localStorage.getItem('smarttrade_lang');
      if (savedLang) {
        I18n.setLanguage(savedLang);
      }
    } catch (e) {}

    // 2. Role init
    try {
      const savedRole = localStorage.getItem(ROLE_KEY);
      if (savedRole && ['admin', 'manager', 'accountant', 'sales', 'warehouse'].includes(savedRole)) {
        currentRole = savedRole;
      }
    } catch (e) {}

    // 3. Theme init
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
      document.documentElement.dataset.theme = savedTheme;
    } catch (e) {}

    // 4. Data State init
    try {
      const savedJson = localStorage.getItem(STORAGE_KEY);
      if (savedJson) {
        const parsed = JSON.parse(savedJson);
        if (parsed && Array.isArray(parsed.je) && parsed.je.length > 0 && Array.isArray(parsed.pr)) {
          if (!parsed.company) {
            parsed.company = {
              name: 'SmartTrade Enterprise Ltd.',
              taxId: 'EG-948-283-11',
              phone: '+20 2 2795 4321',
              email: 'info@smarttrade-erp.com',
              address: '42 Smart Business Park, New Cairo, Egypt',
              currency: 'EGP',
              defaultTax: 14,
              allowNegativeStock: false
            };
          }
          S = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved state from localStorage, falling back to seed.', e);
    }

    if (!S) {
      S = Engine.seed();
      saveNow();
    }

    return S;
  }

  function getState() {
    if (!S) init();
    return S;
  }

  function getRole() {
    return currentRole;
  }

  function setRole(newRole) {
    if (['admin', 'manager', 'accountant', 'sales', 'warehouse'].includes(newRole)) {
      currentRole = newRole;
      try {
        localStorage.setItem(ROLE_KEY, newRole);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('smarttrade:role-changed', { detail: { role: newRole } }));
      notifyUpdate();
    }
  }

  function saveNow() {
    if (!S) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    } catch (e) {
      console.error('LocalStorage save failed:', e);
    }
  }

  function scheduleSave() {
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      saveNow();
    }, 200);
    notifyUpdate();
  }

  function notifyUpdate() {
    window.dispatchEvent(new CustomEvent('smarttrade:state-updated', { detail: { state: S } }));
  }

  function mutate(actionFn) {
    try {
      const result = actionFn(S, Engine, currentRole);
      scheduleSave();
      return { success: true, result };
    } catch (err) {
      console.error('Action error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  function resetDemoData() {
    S = Engine.seed();
    saveNow();
    notifyUpdate();
    return S;
  }

  function clearAllData() {
    S = Engine.mk();
    saveNow();
    notifyUpdate();
    return S;
  }

  function exportBackupJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(S, null, 2));
    const downloadAnchor = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `smarttrade-erp-backup-${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function importBackupJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.pr || !parsed.je || !parsed.wh) {
            throw new Error('Invalid ERP backup file structure');
          }
          S = parsed;
          saveNow();
          notifyUpdate();
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('smarttrade:theme-changed', { detail: { theme: newTheme } }));
    return newTheme;
  }

  return {
    init,
    getState,
    getRole,
    setRole,
    mutate,
    saveNow,
    resetDemoData,
    clearAllData,
    exportBackupJson,
    importBackupJson,
    toggleTheme
  };
}));
