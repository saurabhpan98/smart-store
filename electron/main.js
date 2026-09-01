// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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
    title: 'Smart Store',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  try {
    const { db, dbPath } = initDatabase(app.getPath('userData'));
    dbInstance = db;
    dbLocation = dbPath;
  } catch (err) {
    console.error('Database initialization error:', err);
  }

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
    stmt.run(item.category_id || null, item.name, item.sku_barcode || null, item.cost_price || 0, item.selling_price || 0, 
             item.tax_rate || 0, item.stock_qty || 0, item.low_stock_threshold || 5, item.unit || 'pcs', item.id);
  } else {
    const stmt = dbInstance.prepare(`
      INSERT INTO items (category_id, name, sku_barcode, cost_price, selling_price, tax_rate, stock_qty, low_stock_threshold, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(item.category_id || null, item.name, item.sku_barcode || null, item.cost_price || 0, item.selling_price || 0, 
             item.tax_rate || 0, item.stock_qty || 0, item.low_stock_threshold || 5, item.unit || 'pcs');
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

// 4. POS Transaction (Checkout)
ipcMain.handle('pos:checkout', async (_, invoiceData) => {
  const checkoutTransaction = dbInstance.transaction((data) => {
    const invStmt = dbInstance.prepare(`
      INSERT INTO invoices (invoice_number, customer_name, customer_phone, subtotal, discount_total, tax_total, grand_total, payment_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const invResult = invStmt.run(
      data.invoice_number, data.customer_name || '', data.customer_phone || '',
      data.subtotal, data.discount_total || 0, data.tax_total || 0, data.grand_total, data.payment_mode
    );
    const invoiceId = invResult.lastInsertRowid;

    const itemStmt = dbInstance.prepare(`
      INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, unit_cost_price, unit_selling_price, discount_amount, tax_amount, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stockStmt = dbInstance.prepare(`UPDATE items SET stock_qty = stock_qty - ? WHERE id = ?`);

    for (const item of data.items) {
      itemStmt.run(invoiceId, item.id, item.name, item.qty, item.cost_price || 0, item.selling_price, item.discount || 0, item.tax || 0, item.line_total);
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
    SELECT items.*, categories.name as category_name FROM items 
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE stock_qty <= low_stock_threshold
  `).all();

  return { summary, topSelling, lowStockItems };
});

// 6. Database Backup
ipcMain.handle('db:backup', async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Backup Database',
    defaultPath: `smart_store_backup_${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'SQLite DB', extensions: ['db', 'sqlite'] }]
  });
  if (filePath) {
    fs.copyFileSync(dbLocation, filePath);
    return { success: true, filePath };
  }
  return { success: false };
});

// 7. Orders & Custom Reorder Handling
ipcMain.handle('orders:getAll', async () => {
  return dbInstance.prepare(`
    SELECT purchase_orders.*, categories.name as category_name
    FROM purchase_orders 
    LEFT JOIN categories ON purchase_orders.category_id = categories.id
    ORDER BY purchase_orders.status ASC, purchase_orders.created_at DESC
  `).all();
});

ipcMain.handle('orders:add', async (_, order) => {
  const stmt = dbInstance.prepare(`
    INSERT INTO purchase_orders (category_id, item_name, sku_barcode, cost_price, selling_price, tax_rate, suggested_qty, low_stock_threshold, unit, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `);
  stmt.run(
    order.category_id || null,
    order.item_name,
    order.sku_barcode || null,
    order.cost_price || 0,
    order.selling_price || 0,
    order.tax_rate || 0,
    order.suggested_qty || 1,
    order.low_stock_threshold || 5,
    order.unit || 'pcs'
  );
  return { success: true };
});

// Transfer completed custom order into Inventory Items table and delete from reorder list
ipcMain.handle('orders:moveToInventory', async (_, orderId) => {
  const transferTx = dbInstance.transaction((id) => {
    const order = dbInstance.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    if (!order) throw new Error('Order not found');

    const insertStmt = dbInstance.prepare(`
      INSERT INTO items (category_id, name, sku_barcode, cost_price, selling_price, tax_rate, stock_qty, low_stock_threshold, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      order.category_id || null,
      order.item_name,
      order.sku_barcode || null,
      order.cost_price || 0,
      order.selling_price || 0,
      order.tax_rate || 0,
      order.suggested_qty || 0,
      order.low_stock_threshold || 5,
      order.unit || 'pcs'
    );

    dbInstance.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
  });

  try {
    transferTx(orderId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('orders:delete', async (_, id) => {
  dbInstance.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
  return { success: true };
});

// 8. Store Settings Handlers
ipcMain.handle('settings:get', async () => {
  return dbInstance.prepare('SELECT * FROM store_settings WHERE id = 1').get();
});

ipcMain.handle('settings:update', async (_, settings) => {
  const stmt = dbInstance.prepare(`
    UPDATE store_settings 
    SET shop_name=?, owner_name=?, phone=?, address=?, gstin=?, receipt_footer=?
    WHERE id = 1
  `);
  stmt.run(
    settings.shop_name,
    settings.owner_name,
    settings.phone,
    settings.address,
    settings.gstin,
    settings.receipt_footer
  );
  return { success: true };
});

// 9. External Browser Link Opener (WhatsApp Web in Chrome/Edge)
ipcMain.handle('shell:openExternal', async (_, url) => {
  await shell.openExternal(url);
  return { success: true };
});