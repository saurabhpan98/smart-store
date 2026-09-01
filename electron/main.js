// electron/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { initDatabase } = require('./db');

let mainWindow;
let dbInstance, dbLocation;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const { db, dbPath } = initDatabase(app.getPath('userData'));
  dbInstance = db;
  dbLocation = dbPath;

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

// --- IPC HANDLERS ---

// 1. Authentication
ipcMain.handle('auth:login', async (_, { username, password }) => {
  const user = dbInstance.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return { success: false, message: 'Invalid credentials' };
  const valid = bcrypt.compareSync(password, user.password_hash);
  return valid ? { success: true, user: { id: user.id, username: user.username, role: user.role } } 
               : { success: false, message: 'Invalid credentials' };
});

// 2. Inventory Operations
ipcMain.handle('inventory:getAll', async () => {
  return dbInstance.prepare(`
    SELECT items.*, categories.name as category_name 
    FROM items 
    LEFT JOIN categories ON items.category_id = categories.id
    ORDER BY items.name ASC
  `).all();
});

ipcMain.handle('inventory:saveItem', async (_, item) => {
  if (item.id) {
    const stmt = dbInstance.prepare(`
      UPDATE items SET category_id=?, name=?, sku_barcode=?, cost_price=?, 
      selling_price=?, tax_rate=?, stock_qty=?, low_stock_threshold=?, unit=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `);
    stmt.run(item.category_id, item.name, item.sku_barcode, item.cost_price, item.selling_price, 
             item.tax_rate, item.stock_qty, item.low_stock_threshold, item.unit, item.id);
  } else {
    const stmt = dbInstance.prepare(`
      INSERT INTO items (category_id, name, sku_barcode, cost_price, selling_price, tax_rate, stock_qty, low_stock_threshold, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(item.category_id, item.name, item.sku_barcode, item.cost_price, item.selling_price, 
             item.tax_rate, item.stock_qty, item.low_stock_threshold, item.unit);
  }
  return { success: true };
});

ipcMain.handle('inventory:deleteItem', async (_, id) => {
  dbInstance.prepare('DELETE FROM items WHERE id = ?').run(id);
  return { success: true };
});

// 3. Category Operations
ipcMain.handle('categories:getAll', async () => {
  return dbInstance.prepare('SELECT * FROM categories ORDER BY name ASC').all();
});

ipcMain.handle('categories:create', async (_, { name, description }) => {
  dbInstance.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
  return { success: true };
});

// 4. POS Transaction (Atomic Stock Deduction & Invoice Creation)
ipcMain.handle('pos:checkout', async (_, invoiceData) => {
  const checkoutTransaction = dbInstance.transaction((data) => {
    // 1. Insert Invoice
    const invStmt = dbInstance.prepare(`
      INSERT INTO invoices (invoice_number, customer_name, customer_phone, subtotal, discount_total, tax_total, grand_total, payment_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const invResult = invStmt.run(
      data.invoice_number, data.customer_name, data.customer_phone,
      data.subtotal, data.discount_total, data.tax_total, data.grand_total, data.payment_mode
    );
    const invoiceId = invResult.lastInsertRowid;

    // 2. Insert Line Items & Deduct Inventory
    const itemStmt = dbInstance.prepare(`
      INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, unit_cost_price, unit_selling_price, discount_amount, tax_amount, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stockStmt = dbInstance.prepare(`UPDATE items SET stock_qty = stock_qty - ? WHERE id = ?`);

    for (const item of data.items) {
      itemStmt.run(invoiceId, item.id, item.name, item.qty, item.cost_price, item.selling_price, item.discount, item.tax, item.line_total);
      stockStmt.run(item.qty, item.id);
    }

    return { invoiceId, invoiceNumber: data.invoice_number };
  });

  try {
    const res = checkoutTransaction(invoiceData);
    return { success: true, ...res };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 5. Analytics Queries
ipcMain.handle('analytics:getData', async () => {
  const summary = dbInstance.prepare(`
    SELECT 
      COALESCE(SUM(grand_total), 0) as total_revenue,
      COALESCE(SUM(grand_total - (SELECT SUM(unit_cost_price * quantity) FROM invoice_items WHERE invoice_items.invoice_id = invoices.id)), 0) as total_profit,
      (SELECT COUNT(*) FROM invoices) as total_orders
    FROM invoices
  `).get();

  const topSelling = dbInstance.prepare(`
    SELECT item_name, SUM(quantity) as units_sold, SUM(line_total) as revenue 
    FROM invoice_items 
    GROUP BY item_name 
    ORDER BY units_sold DESC LIMIT 5
  `).all();

  const lowStockItems = dbInstance.prepare(`
    SELECT id, name, stock_qty, low_stock_threshold, unit FROM items WHERE stock_qty <= low_stock_threshold
  `).all();

  return { summary, topSelling, lowStockItems };
});

// 6. 1-Click Backup & Restore
ipcMain.handle('db:backup', async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Backup Database',
    defaultPath: `pos_backup_${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'SQLite DB', extensions: ['db', 'sqlite'] }]
  });
  if (filePath) {
    fs.copyFileSync(dbLocation, filePath);
    return { success: true, filePath };
  }
  return { success: false };
});

// --- Reorder / Purchase Orders Handlers ---
ipcMain.handle('orders:getAll', async () => {
  return dbInstance.prepare(`
    SELECT * FROM purchase_orders ORDER BY status ASC, created_at DESC
  `).all();
});

ipcMain.handle('orders:add', async (_, { item_name, suggested_qty, status = 'PENDING' }) => {
  const stmt = dbInstance.prepare(`
    INSERT INTO purchase_orders (item_name, suggested_qty, status)
    VALUES (?, ?, ?)
  `);
  stmt.run(item_name, suggested_qty, status);
  return { success: true };
});

ipcMain.handle('orders:updateStatus', async (_, { id, status }) => {
  dbInstance.prepare(`UPDATE purchase_orders SET status = ? WHERE id = ?`).run(status, id);
  return { success: true };
});

ipcMain.handle('orders:delete', async (_, id) => {
  dbInstance.prepare(`DELETE FROM purchase_orders WHERE id = ?`).run(id);
  return { success: true };
});