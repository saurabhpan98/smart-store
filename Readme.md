# Smart Store - Retail POS & Inventory Management System

A robust, standalone, and 100% offline Windows Desktop Point of Sale (POS) and Inventory Management Application built for retail shopkeepers and store owners.

---

## Key Features

- **Point of Sale (POS) Billing:**
  - Fast barcode scanning and live search by product name, medicine salt composition, or brand name.
  - Automatic inventory deduction upon checkout.
  - Granular line-item discounts, overall bill discounts (flat ₹ or % off), and GST/Non-GST compliance toggle.
  - Dynamic **UPI Scan-to-Pay QR Code** generated directly on receipts and screen for instant payment verification.
  - Full payment vs. **Udhaar (Credit)** split with custom due balance tracking.
  - 80mm thermal receipt PDF generation with item units, batches, brand tags, and centered footer notes.
  - 1-Click WhatsApp invoice link generation (`wa.me`) opened directly in the default system browser.

- **Inventory, Brand & Medicine Management:**
  - Product tracking with Brand/Company names, categories, SKU/barcodes, cost prices, selling rates, and units (e.g., ₹/kg, ₹/strip, ₹/pcs).
  - **Dynamic Medicine Salts:** Multi-salt composition support with dynamic inputs for pharmaceuticals.
  - **Batch & Expiry Management:** Batch number tracking with automated 45-day near-expiry and expired stock alerts.
  - **Bulk Excel Import/Export:** 1-Click batch import from `.xlsx`/`.csv` spreadsheets and full catalog export to Excel.

- **Customer Khata (Udhaar Ledger):**
  - Dedicated customer credit tracking ledger.
  - Real-time view of customer dues, partial payment settlement, and 1-click WhatsApp payment reminders.

- **Daily Cash Register & Shift Closing:**
  - Counter cash reconciliation: Opening drawer cash, counted closing cash, and expected drawer total based on cash sales and expenses.
  - Discrepancy (shortage/excess) detection and shift closing notes.

- **Store Expense Tracker:**
  - Track shop rent, staff wages, electricity, packaging, and tea/refreshments.
  - Direct integration into reports for accurate pocket profit computation.

- **Category Management with Cascading Sync:**
  - Centralized category CRUD modal.
  - Cascading auto-unassign/sync across active inventory and reorder lists on category removal or modification.

- **Smart Reorder & Purchase List:**
  - Automated "To-Order" tracking for low-stock items.
  - Custom procurement item entries with full specifications (Brand, Salts, Batch, Prices).
  - 1-Click transfer from received list directly into active inventory.
  - Export vendor replenishment purchase order sheets directly to PDF.

- **Business Analytics & Financials:**
  - Real-time KPI cards: Total Revenue, Gross Profit, Total Expenses, and Real Net Pocket Profit (`Gross Profit - Expenses`).
  - True financial separation: GST collected is strictly segregated from store profits.
  - Total Wholesaler Purchase Investment valuation vs. current retail stock valuation.
  - Top 5 best-selling products chart using Recharts.
  - Low-stock and near-expiry warning widgets.

- **Security & Offline Reliability:**
  - Local authentication with independent username and password update controls (`bcryptjs`).
  - Embedded high-speed SQLite database engine (`better-sqlite3` with WAL mode enabled).
  - 1-Click full database export/backup (`.db` format).
  - Zero external server or active internet connection required.

---

## Tech Stack

- **Frontend:** React 18 (Vite), Tailwind CSS, Lucide Icons, Recharts[cite: 1]
- **Desktop Runtime:** Electron.js (Context Isolation, Non-blocking UI, & Secure IPC Architecture)[cite: 1]
- **Local Storage Engine:** SQLite via `better-sqlite3`[cite: 1]
- **PDF & QR Engine:** `jsPDF`, `jspdf-autotable`, & `qrcode`[cite: 1]
- **Spreadsheet Processing:** `xlsx` (SheetJS)
- **CI/CD & Packaging:** GitHub Actions + `@electron/rebuild` + `electron-builder`[cite: 1]

---

## Project Directory Structure

```text
inventory-app/
├── .github/
│   └── workflows/
│       └── release-windows.yml   # Automated GitHub Actions Windows .exe builder
├── certs/                        # (Optional) Self-signed or code-signing certificates
│   └── pos_cert.pfx              # Windows code signing certificate
├── electron/
│   ├── db.js                     # SQLite schema (Tables: Users, Items, Orders, Settings)
│   ├── main.js                   # Electron main process & IPC handlers
│   └── preload.js                # Secure ContextBridge API exposure
├── public/                       # Static app assets & executable icons
│   ├── icon.ico                  # Windows app & setup installer icon
│   ├── icon.png                  # High-resolution PNG app icon
│   └── icon.svg                  # Vector SVG application logo
├── src/
│   ├── components/
│   │   ├── InvoiceModal.jsx      # Order summary & receipt preview modal
│   │   ├── Sidebar.jsx           # Sidebar navigation (with Shop Name & Settings link)
│   │   └── StatCard.jsx          # Analytics metric card
│   ├── pages/
│   │   ├── Analytics.jsx         # Financial analytics, true profit & near-expiry alerts
│   │   ├── CustomerKhata.jsx     # Customer credit / Udhaar ledger & settlement
│   │   ├── DayEndRegister.jsx    # Cash drawer reconciliation & daily shift closing
│   │   ├── Expenses.jsx          # Store operational expense tracker
│   │   ├── Inventory.jsx         # Products, brands, medicine salts, categories & Excel import/export
│   │   ├── Login.jsx             # Admin authentication portal
│   │   ├── POS.jsx               # Billing, GST toggle, dynamic UPI QR, cart & Udhaar options
│   │   ├── ReorderList.jsx       # Vendor procurement list with custom item-to-stock transfer
│   │   └── Settings.jsx          # Shop name, owner details, GSTIN, UPI ID & admin security
│   ├── utils/
│   │   ├── invoicePdf.js         # Thermal receipt PDF generator
│   │   └── whatsapp.js           # WhatsApp invoice link generator
│   ├── App.jsx                   # Tab routing, session state & global shop name state
│   ├── index.css                 # Tailwind CSS entry directives & input focus fixes
│   └── main.jsx                  # React DOM mount & updated browser fallback mocks
├── index.html                    # Root HTML template
├── package.json                  # App metadata, dependencies & electron-builder config
├── package-lock.json             # Exact dependency tree lockfile for GitHub Actions
├── postcss.config.js             # PostCSS Tailwind plugins
├── tailwind.config.js            # Tailwind CSS content paths
└── vite.config.js                # Vite build configuration (base: './')
```

---

## Local Development Setup

### Prerequisites
* Node.js (v18 or v20 LTS recommended)
* Git

### 1. Clone & Install Dependencies 
```
git clone [https://github.com/](https://github.com/)<your-username>/<your-repo-name>.git
cd <your-repo-name>
npm install
```

### 2. Run in Development Mode
```
# Starts Vite dev server + launches Electron window concurrently
npm run dev
```

### 3. Run Web Preview (Optional - UI Only)
```
npm run dev:react
```
---

## How to Build & Download Windows Executable (.exe)
This repository includes a GitHub Actions workflow that automatically compiles and packages a single-click Windows setup installer (.exe) whenever a version tag is pushed.


### Step-by-Step Release Workflow
1. **Ensure GitHub Actions permissions are enabled:**
    * In your repository, go to Settings > Actions > General.
    * Under Workflow permissions, select Read and write permissions and save.

2. **Stage and commit your changes:**
```
git add .
git commit -m "feat: updated POS layout and styles"
git push origin main
```

3. **Tag a new version and push to GitHub:**
```
git tag v1.0.0
git push origin v1.0.0
```

4. **Download the compiled .exe:**
   * Go to your repository's **Releases** page on GitHub.
   * Under release **v1.0.0**, download the setup executable from the Assets section.

---

## Default Login Credentials
When launching the application for the first time, a default administrator account is automatically seeded into the local SQLite database:
  * Username: admin
  * Password: admin123
  
---

## Data Storage Location
All store data (inventory items, prices, bills, transactions, and user credentials) is stored locally on the client machine inside an SQLite file:

```
%AppData%\\retail-pos-inventory\\pos_inventory.db
```
(Path: C:\\Users\\<YourUsername>\\AppData\\Roaming\\retail-pos-inventory\\)

  * **Persistence:** Updating the application to a newer version will not overwrite or delete your store database.
  * **Backups:** You can create instant database snapshots using the **Backup Database (.db)** button located on the **Reports & Analytics** screen.

--- 

## Complete Uninstallation
To cleanly remove the application and wipe all local databases and caches:
  * Uninstall Smart Store via Windows Settings > Installed Apps (or Control Panel).
  * Open Windows Run (Win + R), type %appdata%, and press Enter.
  * Permanently delete the retail-pos-inventory directory.

---

## License
This project is licensed under the MIT License.

