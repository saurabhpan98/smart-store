// electron/db.js
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

function initDatabase(userDataPath) {
  const dbPath = path.join(userDataPath, 'pos_inventory.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 1. Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count === 0) {
    const defaultHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', defaultHash);
  }

  // 2. Categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      sku_barcode TEXT UNIQUE,
      cost_price REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      stock_qty REAL DEFAULT 0,
      low_stock_threshold REAL DEFAULT 5,
      unit TEXT DEFAULT 'pcs',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Invoices (With Udhaar Ledger & GST toggle fields)
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      subtotal REAL NOT NULL,
      discount_total REAL DEFAULT 0,
      tax_total REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      is_credit INTEGER DEFAULT 0,
      is_gst_bill INTEGER DEFAULT 0,
      payment_mode TEXT CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'CREDIT', 'SPLIT')),
      status TEXT DEFAULT 'COMPLETED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Invoice Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES items(id),
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost_price REAL NOT NULL,
      unit_selling_price REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      line_total REAL NOT NULL
    );
  `);

  // 6. Purchase Reorder List
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      item_name TEXT NOT NULL,
      sku_barcode TEXT,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      suggested_qty REAL DEFAULT 1,
      low_stock_threshold REAL DEFAULT 5,
      unit TEXT DEFAULT 'pcs',
      status TEXT CHECK(status IN ('PENDING', 'ORDERED', 'RECEIVED')) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Store Settings (GSTIN support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT DEFAULT 'Smart Store',
      owner_name TEXT DEFAULT 'Store Owner',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      gstin TEXT DEFAULT '',
      receipt_footer TEXT DEFAULT 'Thank you for shopping with us!'
    );
  `);

  const settingsCount = db.prepare('SELECT count(*) as count FROM store_settings').get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO store_settings (id, shop_name, owner_name, phone, address, gstin, receipt_footer)
      VALUES (1, 'Smart Store', 'Store Owner', '', '', '', 'Thank you for shopping with us!')
    `).run();
  }

  return { db, dbPath };
}

module.exports = { initDatabase };