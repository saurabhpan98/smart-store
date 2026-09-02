# Smart Store - Retail POS & Inventory Management System

A robust, standalone, and 100% offline Windows Desktop Point of Sale (POS) and Inventory Management Application built for retail shopkeepers and store owners.

---

## Key Features

- **Point of Sale (POS) Billing:**
  - Fast barcode scanning and live product search.
  - Automatic inventory deduction upon checkout.
  - Line-item discounts, flat bill discounts, and tax/GST calculation.
  - Instant 80mm thermal receipt PDF generation.
  - 1-Click WhatsApp invoice link generation (`wa.me`).
- **Inventory & Category Management:**
  - Create, view, update, and delete items with categories, SKU/barcodes, cost prices, selling prices, and units.
  - Configurable low-stock alert thresholds.
- **Smart Reorder & Purchase List:**
  - Automated "To-Order" tracking for items reaching low stock levels.
  - Export vendor replenishment purchase order sheets directly to PDF.
- **Sales Analytics & Reports:**
  - Real-time KPI cards: Total Revenue, Net Profit, Total Orders.
  - Top 5 best-selling products chart using Recharts.
  - Low-stock warning widget.
- **Security & Offline Reliability:**
  - Local authentication with encrypted credentials (`bcryptjs`).
  - Embedded high-speed SQLite database engine (`better-sqlite3` with WAL mode enabled).
  - 1-Click full database export/backup (`.db` format).
  - Zero external server or active internet connection required.

---

## Tech Stack

- **Frontend:** React 18 (Vite), Tailwind CSS, Lucide Icons, Recharts
- **Desktop Runtime:** Electron.js (Context Isolation & Secure IPC Architecture)
- **Local Storage Engine:** SQLite via `better-sqlite3`
- **PDF Engine:** `jsPDF` & `jspdf-autotable`
- **CI/CD & Packaging:** GitHub Actions + `electron-builder`

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
│   │   ├── Analytics.jsx         # Sales dashboard & Recharts visualization
│   │   ├── CustomerKhata.jsx     # Borrowed (Udhaar) customers section
│   │   ├── Inventory.jsx         # Stock management & Add Category modal
│   │   ├── Login.jsx             # Admin authentication portal
│   │   ├── POS.jsx               # Table list billing, barcode, Cart, PDF, WhatsApp & Done
│   │   ├── ReorderList.jsx       # Vendor list with custom item addition
│   │   └── Settings.jsx          # Shop name, owner details, GSTIN & receipt setup
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
  * Uninstall Retail POS & Inventory via Windows Settings > Installed Apps (or Control Panel).
  * Open Windows Run (Win + R), type %appdata%, and press Enter.
  * Permanently delete the retail-pos-inventory directory.

---

## License
This project is licensed under the MIT License.

