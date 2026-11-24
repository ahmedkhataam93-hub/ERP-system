# SmartTrade ERP — Enterprise Financial & Resource System

SmartTrade ERP is a high-performance, modular Enterprise Resource Planning (ERP) suite with strict double-entry general ledger accounting, moving weighted average cost (WAC) inventory valuation, and multi-currency bilingual (English & Arabic RTL) support.

---

## 🌟 Key Features

### 1. 💼 Double-Entry General Ledger Accounting
- Strict debit = credit balance validation on every journal entry.
- Real-time automated posting for sales, purchases, customer payments, supplier disbursals, stock adjustments, and operational expenses.
- Accounts: `CASH`, `BANK`, `AR`, `INV`, `TXR`, `AP`, `TXP`, `EQ`, `SAL`, `COGS`, `EXP`.
- Manual journal entries for accountants with debit/credit balance checks.
- Continuous ledger integrity verification (`Assets = Liabilities + Equity` and `Inventory Subledger = General Ledger Asset Balance`).

### 2. 📦 Moving Weighted Average Cost (WAC) Inventory
- Dynamic real-time calculation of moving weighted average unit cost per warehouse on receipts.
- Cost basis preserved on all outgoing sales issues and inter-warehouse stock transfers.
- Negative-stock prevention guardrails.
- Multi-warehouse support with individual warehouse valuations.
- Audited stock adjustments for shrinkage, damaged goods, or inventory physical counts.

### 3. 🛒 Sales Invoicing & Receivables (AR)
- Interactive multi-line sales order & invoice creator with discount percentages and VAT calculations.
- Selling price floor guard: prevents sales below minimum prices without manager/admin authorization.
- Sales return management: automatically returns inventory to stock at original unit cost, reverses revenue and tax, and refunds cash or credits customer account.
- Invoice cancellation with full automated reversal of all inventory movements and ledger entries.
- Oldest-first automatic payment allocation across open customer accounts.

### 4. 🚚 Purchase Bills & Payables (AP)
- Purchase bill recording with supplier destination warehouse tracking.
- Partial and full payment tracking.
- Real-time AP ledger balances.

### 5. 👥 CRM & Contact Management
- Unified customer and supplier directories with tax registration numbers, credit limits, phone, and addresses.
- One-click account statement generation showing historical transactions and remaining balances.
- Direct account payment collections and disbursements.

### 6. 📊 Real-Time Financial Statements & Reports
- **Executive KPI Dashboard**: Revenue, gross profit, net operating profit, liquid cash & bank balances, inventory valuation, receivables, and payables.
- **Profit & Loss Statement (Income Statement)**: Gross sales, returns, net revenue, COGS, gross margin %, categorized operating expenses, and net profit.
- **Balance Sheet**: Current assets, current liabilities, equity, and proof of balance.
- **Trial Balance**: Complete debit and credit totals by account.
- **Stock Valuation Report**: Valuation breakdown by product and warehouse with reorder alerts.
- **Audit Trail**: Security and compliance log tracking every transactional change with role, action code, timestamp, and details.

### 7. 🌍 Enterprise UI/UX & Localization
- Full bilingual interface: English (LTR) and Arabic (RTL) with appropriate date, number, and currency formatting.
- Dark mode and Light mode with persistent state.
- Role-Based Access Control (RBAC) switcher (`admin`, `manager`, `accountant`, `sales`, `warehouse`).
- Clean SVG data visualizations (revenue and purchase trends, stock charts).
- Global keyboard search (`Ctrl+K` or `/`).
- One-click CSV / Excel export for all tables and reports.
- Dedicated print stylesheet (`@media print`) for commercial A4 tax invoices and financial statements.
- Complete offline local persistence with JSON backup export and import.

---

## 📁 Project Architecture

```
ERM/
├── index.html                  # Master Single Page Application entry point
├── css/
│   ├── main.css                # Enterprise design tokens, sidebar, layout, and RTL styling
│   ├── components.css          # Cards, tables, forms, modals, toasts, badges, and charts
│   └── print.css               # Dedicated A4 commercial tax invoice print layout
├── js/
│   ├── engine.js               # Core double-entry ledger & WAC inventory business logic
│   ├── store.js                # State persistence, JSON backup/restore, role switching
│   ├── i18n.js                 # English and Arabic translations and formatters
│   ├── reports.js              # P&L, Balance Sheet, Trial Balance, Stock Valuation
│   ├── export.js               # CSV exporter and print trigger
│   ├── ui.js                   # Modals, toasts, confirm dialogs, and SVG charts
│   └── app.js                  # Master application controller and routing
├── backend/
│   ├── domain/                 # Python domain layer
│   │   ├── money.py            # Precise Decimal monetary math
│   │   ├── wac.py              # Moving weighted average cost calculation
│   │   ├── journal.py          # Double-entry ledger rules
│   │   ├── invoicing.py        # Invoicing calculations and price guards
│   │   └── permissions.py      # Role-permission matrix
│   └── domain/tests/           # Python unit test suite (23 tests passing)
│       ├── test_domain.py
│       └── test_invoicing.py
├── tests/
│   └── engine.test.js          # JavaScript business engine test suite (16 tests passing)
├── engine.test.js              # Node.js test runner alias
├── docker-compose.yml          # PostgreSQL database and daily backup container services
├── DEVELOPMENT_PROGRESS.md     # Changelog and development milestones
└── README.md
```

---

## 🚀 Getting Started

### 1. Running the Web Application
No build tools or external npm packages are required. Simply open `index.html` in any modern web browser, or serve it with Python:

```bash
# Start local static server
python -m http.server 8000
```
Then navigate to: `http://localhost:8000`

### 2. Running Unit Tests

#### Python Domain Layer Tests (23 Tests)
```bash
cd backend
python -m unittest discover -s domain/tests -t . -v
```

#### JavaScript Business Engine Tests (16 Tests)
```bash
node engine.test.js
# or: node tests/engine.test.js
```

---

## 🔒 User Roles & Permissions

| Permission / Action | Admin | Manager | Accountant | Sales | Warehouse |
|---|:---:|:---:|:---:|:---:|:---:|
| Create Sales Invoices | ✅ | ✅ | ❌ | ✅ | ❌ |
| Override Min. Selling Price | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record Payments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Purchase Bills | ✅ | ✅ | ❌ | ❌ | ✅ |
| Stock Adjustments & Transfers | ✅ | ✅ | ❌ | ❌ | ✅ |
| Record Operating Expenses | ✅ | ✅ | ✅ | ❌ | ❌ |
| Post Manual Journals | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Financial Statements | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Products & Catalog | ✅ | ✅ | ❌ | ❌ | ✅ |
| System Settings & Backups | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 💾 Data Backup & Restore
- **Instant Local Storage**: Changes are automatically persisted in the browser.
- **Export Backup**: Navigate to **Settings & Audit** -> **Download Backup (JSON)** to download a complete company snapshot.
- **Restore Backup**: Use **Restore Backup** to load any previously exported `.json` database file.
- **Reset to Demo Data**: Resets all ledgers, products, warehouses, and partners to the curated enterprise sample scenario.
