/**
 * SmartTrade ERP Internationalization (i18n) & Formatting
 * Full English & Arabic (RTL) Localization
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exported = factory();
    module.exports = exported;
    if (root) root.SmartTradeI18n = exported;
  } else {
    root.SmartTradeI18n = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let currentLang = 'en';

  const translations = {
    en: {
      appName: 'SmartTrade ERP',
      appSubtitle: 'Enterprise Resource Planning & Financial Ledger',
      // Nav & Groups
      navMain: 'Overview',
      navOperations: 'Operations',
      navFinance: 'Finance & Treasury',
      navReports: 'Financial Reports',
      navManagement: 'Administration',
      navDashboard: 'Dashboard',
      navProducts: 'Products & Catalog',
      navSales: 'Sales & Invoicing',
      navPurchases: 'Purchases & Bills',
      navPartners: 'Contacts & CRM',
      navInventory: 'Inventory & Warehouses',
      navCashbox: 'Cash & Expenses',
      navAccounting: 'General Accounting',
      navAudit: 'Audit Trail',
      navSettings: 'System Settings',

      // Actions
      actionNew: 'New',
      actionAdd: 'Add',
      actionEdit: 'Edit',
      actionDelete: 'Delete',
      actionSave: 'Save Changes',
      actionCancel: 'Cancel',
      actionClose: 'Close',
      actionPrint: 'Print',
      actionExportCsv: 'Export CSV',
      actionSearch: 'Search...',
      actionFilter: 'Filter',
      actionReset: 'Reset',
      actionConfirm: 'Confirm',
      actionPay: 'Record Payment',
      actionReturn: 'Process Return',
      actionCancelInvoice: 'Cancel Invoice',
      actionTransfer: 'Transfer Stock',
      actionAdjust: 'Adjust Stock',
      actionPost: 'Post Entry',
      actionAddLine: 'Add Item Line',
      actionClear: 'Clear',
      actionBack: 'Back',
      actionViewDetails: 'View Details',
      actionCollect: 'Collect Payment',
      actionDisburse: 'Disburse Payment',
      actionDownloadBackup: 'Download Backup (JSON)',
      actionRestoreBackup: 'Restore Backup',
      actionResetDemo: 'Reset to Sample Data',

      // Dashboard KPIs
      kpiTotalRevenue: 'Total Revenue',
      kpiPurchases: 'Total Purchases',
      kpiGrossProfit: 'Gross Profit',
      kpiNetProfit: 'Net Profit',
      kpiInventoryValue: 'Stock Valuation',
      kpiCashBank: 'Liquid Cash & Bank',
      kpiReceivables: 'Accounts Receivable (AR)',
      kpiPayables: 'Accounts Payable (AP)',
      kpiLowStockAlerts: 'Low Stock Alerts',
      kpiSalesTrend: 'Sales Revenue & Purchase Costs',
      kpiRecentTransactions: 'Recent Ledger Entries',
      kpiTopProducts: 'Top Selling Products',
      kpiIntegrityStatus: 'Ledger Integrity',
      kpiBalanced: 'Perfectly Balanced',

      // Products
      prodSku: 'SKU Code',
      prodBarcode: 'Barcode',
      prodName: 'Product Name',
      prodCat: 'Category',
      prodBuy: 'Purchase Cost',
      prodSell: 'Selling Price',
      prodMin: 'Min. Price Guard',
      prodStock: 'Available Stock',
      prodReorder: 'Min. Alert Level',
      prodUnit: 'Unit',
      prodStatus: 'Stock Status',
      prodNew: 'Create New Product',
      prodEdit: 'Edit Product',
      prodAllCats: 'All Categories',
      prodInStock: 'In Stock',
      prodLowStock: 'Low Stock',
      prodOutOfStock: 'Out of Stock',

      // Sales & Invoicing
      saleNewInvoice: 'Create Sales Invoice',
      saleInvoiceNo: 'Invoice #',
      saleCustomer: 'Customer',
      saleDate: 'Date',
      saleDueDate: 'Due Date',
      saleWarehouse: 'Source Warehouse',
      saleItems: 'Line Items',
      saleQty: 'Quantity',
      salePrice: 'Unit Price',
      saleDiscount: 'Discount %',
      saleNet: 'Net Subtotal',
      saleTaxRate: 'Tax Rate %',
      saleTaxAmount: 'Tax Amount',
      saleGrandTotal: 'Grand Total',
      saleAmountPaid: 'Paid Amount',
      saleRemainingDue: 'Remaining Due',
      salePaymentMethod: 'Payment Method',
      salePaymentTerms: 'Payment Terms',
      saleNotes: 'Notes & Terms',
      saleStatus: 'Status',
      saleDetails: 'Invoice Details',
      saleCash: 'Cash',
      saleBank: 'Bank Transfer',
      saleRefunds: 'Refunds & Returns',
      saleReturnQty: 'Return Qty',
      saleOverpaymentRefunded: 'Overpayment Refunded',

      // Status Labels
      statusPaid: 'PAID',
      statusPartial: 'PARTIAL',
      statusPosted: 'UNPAID',
      statusCancelled: 'CANCELLED',
      statusDraft: 'DRAFT',

      // Purchases
      purNewBill: 'Create Purchase Bill',
      purBillNo: 'Bill #',
      purSupplier: 'Supplier',
      purDestinationWh: 'Destination Warehouse',

      // Partners / CRM
      partCustomers: 'Customers',
      partSuppliers: 'Suppliers',
      partName: 'Party Name',
      partPhone: 'Phone',
      partEmail: 'Email',
      partTaxId: 'Tax / VAT ID',
      partAddress: 'Address',
      partBalance: 'Current Balance',
      partCreditLimit: 'Credit Limit',
      partNewCustomer: 'New Customer',
      partNewSupplier: 'New Supplier',
      partStatement: 'Account Statement',

      // Inventory
      invWarehouses: 'Warehouse Locations',
      invTransferTitle: 'Inter-Warehouse Stock Transfer',
      invTransferFrom: 'From Warehouse',
      invTransferTo: 'To Warehouse',
      invTransferQty: 'Transfer Quantity',
      invAdjustTitle: 'Inventory Stock Adjustment',
      invAdjustQty: 'Quantity Delta (+ / -)',
      invAdjustReason: 'Reason for Adjustment',
      invMovements: 'Stock Movement Ledger',
      invMoveDate: 'Date',
      invMoveType: 'Movement Type',
      invMoveRef: 'Reference',
      invMoveCost: 'Cost Basis',

      // Cashbox & Expenses
      cashAccounts: 'Treasury Accounts',
      cashAccount: 'Account',
      cashCashOnHand: 'Cash in Hand (Safe)',
      cashBankBalance: 'Bank Account Balance',
      cashExpenses: 'Operating Expenses',
      cashNewExpense: 'Record Operating Expense',
      cashCategory: 'Expense Category',
      cashAmount: 'Amount',
      cashNote: 'Description / Receipt #',

      // Accounting & Reports
      accTrialBalance: 'Trial Balance',
      accProfitLoss: 'Profit & Loss Statement (Income)',
      accBalanceSheet: 'Balance Sheet',
      accGeneralLedger: 'General Ledger',
      accManualJournal: 'Manual Journal Entry',
      accAccount: 'Account Name',
      accCode: 'Account Code',
      accDebit: 'Debit (Dr)',
      accCredit: 'Credit (Cr)',
      accBalance: 'Net Balance',
      accAssets: 'Assets',
      accLiabilities: 'Liabilities',
      accEquity: 'Equity',
      accRevenue: 'Revenues',
      accExpenses: 'Expenses',
      accGrossMargin: 'Gross Profit Margin',
      accNetMargin: 'Net Profit Margin',
      accCheckEquation: 'Accounting Equation Check',

      // Audit & Settings
      auditTime: 'Timestamp',
      auditUser: 'Role / User',
      auditAction: 'Action Code',
      auditDetails: 'Details & Impact',
      setCompanyInfo: 'Company Information',
      setCompanyName: 'Company Name',
      setCompanyPhone: 'Phone Number',
      setCompanyEmail: 'Email Address',
      setCompanyAddress: 'Physical Address',
      setCompanyTax: 'Tax Registration #',
      setCurrency: 'Currency Symbol',
      setDefaultTax: 'Default Tax Rate %',
      setAllowNegative: 'Allow Negative Stock',
      setDataManagement: 'Database & Backup Management',
      setResetWarning: 'Resetting will replace all current data with fresh sample enterprise data. Continue?',

      // Alerts & Common
      emptyList: 'No records found',
      confirmDelete: 'Are you sure you want to proceed?',
      operationSuccess: 'Operation completed successfully',
      operationFailed: 'Operation failed: '
    },

    ar: {
      appName: 'سمارت تريد ERP',
      appSubtitle: 'نظام إدارة موارد المؤسسات ودفتر الأستاذ المالي',
      // Nav & Groups
      navMain: 'نظرة عامة',
      navOperations: 'العمليات التشغيلية',
      navFinance: 'المالية والخزينة',
      navReports: 'التقارير المالية',
      navManagement: 'الإدارة والنظام',
      navDashboard: 'لوحة التحكم',
      navProducts: 'المنتجات والكتالوج',
      navSales: 'المبيعات والفواتير',
      navPurchases: 'المشتريات وفواتير الشراء',
      navPartners: 'العملاء والموردين',
      navInventory: 'المخازن والمستودعات',
      navCashbox: 'الخزينة والمصروفات',
      navAccounting: 'المحاسبة العامة',
      navAudit: 'سجل التدقيق والمراقبة',
      navSettings: 'إعدادات النظام',

      // Actions
      actionNew: 'جديد',
      actionAdd: 'إضافة',
      actionEdit: 'تعديل',
      actionDelete: 'حذف',
      actionSave: 'حفظ التعديلات',
      actionCancel: 'إلغاء',
      actionClose: 'إغلاق',
      actionPrint: 'طباعة',
      actionExportCsv: 'تصدير إكسيل (CSV)',
      actionSearch: 'بحث سريع...',
      actionFilter: 'تصفية',
      actionReset: 'إعادة تعيين',
      actionConfirm: 'تأكيد',
      actionPay: 'تسجيل سداد',
      actionReturn: 'إرجاع أصناف',
      actionCancelInvoice: 'إلغاء الفاتورة',
      actionTransfer: 'تحويل بضاعة',
      actionAdjust: 'تسوية رصيد المخزون',
      actionPost: 'ترحيل القيد',
      actionAddLine: 'إضافة بند جديد',
      actionClear: 'مسح',
      actionBack: 'رجوع',
      actionViewDetails: 'عرض التفاصيل',
      actionCollect: 'تحصيل من عميل',
      actionDisburse: 'سداد لمورد',
      actionDownloadBackup: 'تنزيل نسخة احتياطية (JSON)',
      actionRestoreBackup: 'استعادة نسخة احتياطية',
      actionResetDemo: 'استعادة البيانات التجريبية',

      // Dashboard KPIs
      kpiTotalRevenue: 'إجمالي المبيعات',
      kpiPurchases: 'إجمالي المشتريات',
      kpiGrossProfit: 'إجمالي الربح التجاري',
      kpiNetProfit: 'صافي الأرباح التشغيلية',
      kpiInventoryValue: 'قيمة بضاعة المخازن',
      kpiCashBank: 'السيولة النقدية والبنكية',
      kpiReceivables: 'مستحقات العملاء (مدينون)',
      kpiPayables: 'مستحقات الموردين (دائنون)',
      kpiLowStockAlerts: 'تنبيهات نواقص المخزون',
      kpiSalesTrend: 'مقارنة المبيعات وتكلفة المشتريات',
      kpiRecentTransactions: 'أحدث قيود دفتر اليومية',
      kpiTopProducts: 'المنتجات الأكثر مبيعاً',
      kpiIntegrityStatus: 'سلامة الدفاتر المحاسبية',
      kpiBalanced: 'مطابق وموزون تماماً 100%',

      // Products
      prodSku: 'كود الصنف (SKU)',
      prodBarcode: 'الباركود',
      prodName: 'اسم الصنف والمنتج',
      prodCat: 'التصنيف',
      prodBuy: 'سعر التكلفة',
      prodSell: 'سعر البيع',
      prodMin: 'الحد الأدنى للبيع',
      prodStock: 'الرصيد المتاح',
      prodReorder: 'حد إعادة الطلب',
      prodUnit: 'الوحدة',
      prodStatus: 'حالة الصنف',
      prodNew: 'إضافة منتج جديد',
      prodEdit: 'تعديل بيانات المنتج',
      prodAllCats: 'جميع الأقسام والتصنيفات',
      prodInStock: 'متوفر',
      prodLowStock: 'منخفض',
      prodOutOfStock: 'منتهي من المخزن',

      // Sales & Invoicing
      saleNewInvoice: 'إنشاء فاتورة مبيعات جديدة',
      saleInvoiceNo: 'رقم الفاتورة',
      saleCustomer: 'العميل',
      saleDate: 'تاريخ الفاتورة',
      saleDueDate: 'تاريخ الاستحقاق',
      saleWarehouse: 'المخزن المصدر',
      saleItems: 'أصناف الفاتورة',
      saleQty: 'الكمية',
      salePrice: 'سعر الوحدة',
      saleDiscount: 'نسبة الخصم %',
      saleNet: 'المجموع قبل الضريبة',
      saleTaxRate: 'نسبة الضريبة %',
      saleTaxAmount: 'قيمة الضريبة المضافة',
      saleGrandTotal: 'الإجمالي النهائي',
      saleAmountPaid: 'المبلغ المدفوع',
      saleRemainingDue: 'المتبقي المستحق',
      salePaymentMethod: 'طريقة السداد',
      salePaymentTerms: 'شروط الدفع',
      saleNotes: 'شروط وملاحظات الفاتورة',
      saleStatus: 'حالة الفاتورة',
      saleDetails: 'تفاصيل الفاتورة',
      saleCash: 'نقداً (خزينة)',
      saleBank: 'تحويل بنكي',
      saleRefunds: 'المرتجعات والتسويات',
      saleReturnQty: 'كمية المرتجع',
      saleOverpaymentRefunded: 'استرداد المبلغ الفائض',

      // Status Labels
      statusPaid: 'مسددة بالكامل',
      statusPartial: 'سداد جزئي',
      statusPosted: 'مرحلة (غير مسددة)',
      statusCancelled: 'ملغاة تماماً',
      statusDraft: 'مسودة',

      // Purchases
      purNewBill: 'تسجيل فاتورة مشتريات (توريد)',
      purBillNo: 'رقم فاتورة الشراء',
      purSupplier: 'المورد',
      purDestinationWh: 'مستودع الاستلام',

      // Partners / CRM
      partCustomers: 'سجل العملاء',
      partSuppliers: 'سجل الموردين',
      partName: 'الاسم أو الشركة',
      partPhone: 'الهاتف',
      partEmail: 'البريد الإلكتروني',
      partTaxId: 'الرقم الضريبي',
      partAddress: 'العنوان',
      partBalance: 'الرصيد الحالي',
      partCreditLimit: 'الحد الائتماني المسموح',
      partNewCustomer: 'إضافة عميل جديد',
      partNewSupplier: 'إضافة مورد جديد',
      partStatement: 'كشف حساب تفصيلي',

      // Inventory
      invWarehouses: 'قائمة المستودعات والفروع',
      invTransferTitle: 'تحويل بضاعة بين المخازن',
      invTransferFrom: 'من مستودع',
      invTransferTo: 'إلى مستودع',
      invTransferQty: 'الكمية المحولة',
      invAdjustTitle: 'تسوية مخزنية (جرد / هالك / تلف)',
      invAdjustQty: 'الفرق بالزيادة أو النقص (+ / -)',
      invAdjustReason: 'سبب التسوية المحاسبية',
      invMovements: 'سجل حركات المخزون والمستودعات',
      invMoveDate: 'التاريخ',
      invMoveType: 'نوع الحركة',
      invMoveRef: 'المرجع',
      invMoveCost: 'سعر التكلفة',

      // Cashbox & Expenses
      cashAccounts: 'حسابات الخزينة والبنوك',
      cashAccount: 'الحساب المالي',
      cashCashOnHand: 'الخزينة النقدية الرئيسية',
      cashBankBalance: 'رصيد الحساب البنكي',
      cashExpenses: 'المصروفات التشغيلية والعمومية',
      cashNewExpense: 'تسجيل سند صرف مصروفات',
      cashCategory: 'بند المصروف',
      cashAmount: 'القيمة',
      cashNote: 'البيان / رقم الإيصال',

      // Accounting & Reports
      accTrialBalance: 'ميزان المراجعة بالمجاميع والأرصدة',
      accProfitLoss: 'قائمة الدخل (الأرباح والخسائر)',
      accBalanceSheet: 'الميزانية العمومية والمركز المالي',
      accGeneralLedger: 'دفتر الأستاذ العام',
      accManualJournal: 'قيد يومية يدوي',
      accAccount: 'اسم الحساب',
      accCode: 'رمز الحساب',
      accDebit: 'مدين (+)',
      accCredit: 'دائن (-)',
      accBalance: 'الرصيد الصافي',
      accAssets: 'الأصول (الموجودات)',
      accLiabilities: 'الالتزامات (الخصوم)',
      accEquity: 'حقوق الملكية ورأس المال',
      accRevenue: 'الإيرادات والمبيعات',
      accExpenses: 'المصروفات وتكلفة البضاعة',
      accGrossMargin: 'هامش الربح الإجمالي',
      accNetMargin: 'هامش صافي الربح',
      accCheckEquation: 'مطابقة المعادلة المحاسبية',

      // Audit & Settings
      auditTime: 'الوقت والتاريخ',
      auditUser: 'المستخدم / الصلاحية',
      auditAction: 'رمز الإجراء',
      auditDetails: 'تفاصيل وأثر العملية',
      setCompanyInfo: 'بيانات المؤسسة والمنشأة',
      setCompanyName: 'اسم المنشأة التجاري',
      setCompanyPhone: 'رقم الهاتف',
      setCompanyEmail: 'البريد الإلكتروني الرسمي',
      setCompanyAddress: 'العنوان التجاري',
      setCompanyTax: 'رقم التسجيل الضريبي',
      setCurrency: 'رمز العملة الرسمية',
      setDefaultTax: 'نسبة ضريبة القيمة المضافة الافتراضية %',
      setAllowNegative: 'السماح بالبيع بالسالب دون رصيد',
      setDataManagement: 'إدارة قاعدة البيانات والنسخ الاحتياطي',
      setResetWarning: 'إعادة التعيين ستحذف البيانات الحالية وتستبدلها ببيانات نموذجية للمؤسسة. هل ترغب بالاستمرار؟',

      // Alerts & Common
      emptyList: 'لا توجد سجلات مسجلة حتى الآن',
      confirmDelete: 'هل أنت متأكد من تنفيذ هذا الإجراء؟',
      operationSuccess: 'تم تنفيذ العملية بنجاح',
      operationFailed: 'تعذر تنفيذ العملية: '
    }
  };

  function setLanguage(lang) {
    if (translations[lang]) {
      currentLang = lang;
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      try {
        localStorage.setItem('smarttrade_lang', lang);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('smarttrade:language-changed', { detail: { lang } }));
    }
  }

  function getLanguage() {
    return currentLang;
  }

  function t(key, fallback = '') {
    const langObj = translations[currentLang] || translations.en;
    if (langObj && langObj[key] !== undefined) {
      return langObj[key];
    }
    const fallbackObj = translations.en;
    if (fallbackObj && fallbackObj[key] !== undefined) {
      return fallbackObj[key];
    }
    return fallback || key;
  }

  // Format currency from cents
  function fmtMoney(cents, currency = 'EGP') {
    const num = (cents || 0) / 100;
    const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
    const formattedNum = num.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return currentLang === 'ar' ? `${formattedNum} ${currency}` : `${currency} ${formattedNum}`;
  }

  // Parse user input decimal string into integer cents
  function parseCents(input) {
    if (typeof input === 'number') {
      return Math.round(input * 100);
    }
    const cleanStr = String(input || '0').replace(/[^0-9.-]/g, '');
    const floatVal = parseFloat(cleanStr);
    return isNaN(floatVal) ? 0 : Math.round(floatVal * 100);
  }

  function fmtQty(qty, unit = 'pcs') {
    const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
    const val = (qty || 0).toLocaleString(locale);
    return `${val} ${unit}`;
  }

  function fmtDate(isoDateStr) {
    if (!isoDateStr) return '—';
    try {
      const parts = isoDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      return isoDateStr;
    } catch (e) {
      return isoDateStr;
    }
  }

  return {
    setLanguage,
    getLanguage,
    t,
    fmtMoney,
    parseCents,
    fmtQty,
    fmtDate,
    translations
  };
}));
