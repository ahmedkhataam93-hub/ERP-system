/**
 * SmartTrade ERP Data Export & Printing Utility
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exported = factory();
    module.exports = exported;
    if (root) root.SmartTradeExport = exported;
  } else {
    root.SmartTradeExport = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function downloadCsv(filename, headers, rows) {
    if (!rows || !rows.length) {
      alert('No data available to export');
      return;
    }

    // Escape CSV cell value
    const escapeCell = cell => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 Byte Order Mark for Excel Arabic support
    csvContent += headers.map(escapeCell).join(',') + '\r\n';

    for (const row of rows) {
      csvContent += row.map(escapeCell).join(',') + '\r\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function printDocument(targetElementId = null) {
    if (targetElementId) {
      const el = document.getElementById(targetElementId);
      if (el) {
        el.classList.add('print-focus-area');
      }
    }
    window.print();
    if (targetElementId) {
      const el = document.getElementById(targetElementId);
      if (el) {
        el.classList.remove('print-focus-area');
      }
    }
  }

  return {
    downloadCsv,
    printDocument
  };
}));
