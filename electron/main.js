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
    console.error('Database init error:', err);
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

// --- IPC HANDLERS ---

// Auth
ipcMain.handle('auth:login', async (_, { username, password }) => {
  const user = dbInstance.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return { success: false, message: 'Invalid credentials' };
  const valid = bcrypt.compareSync(password, user.password_hash);
  return valid ? { success: true, user: { id: user.id, username: user.username, role: user.role } } 
               : { success: false, message: 'Invalid credentials' };
});

ipcMain.handle('auth:changeCredentials', async (_, { currentPassword, newUsername, newPassword }) => {
  const adminUser = dbInstance.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get('admin');
  if (!adminUser) return { success: false, message: 'Admin user not found' };

  const valid = bcrypt.compareSync(currentPassword, adminUser.password_hash);
  if (!valid) return { success: false, message: 'Current password is incorrect' };

  const updatedUsername = newUsername && newUsername.trim() ? newUsername.trim() : adminUser.username;
  const updatedHash = newPassword && newPassword.trim() ? bcrypt.hashSync(newPassword.trim(), 10) : adminUser.password_hash;

  dbInstance.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?')
    .run(updatedUsername, updatedHash, adminUser.id);

  return { success: true, message: 'Credentials updated successfully', username: updatedUsername };
});

// Inventory
ipcMain.handle('inventory:getAll', async () => {
  return dbInstance.prepare(`
    SELECT items.*, categories.name as category_name 
    FROM items 
    LEFT JOIN categories ON items.category_id = categories.id
    ORDER BY items.name ASC
  `).all();
});

ipcMain.handle('inventory:saveItem', async (_, item) => {
  try {
    if (item.sku_barcode && item.sku_barcode.trim()) {
      const existing = dbInstance.prepare('SELECT id FROM items WHERE sku_barcode = ? AND id != ?')
        .get(item.sku_barcode.trim(), item.id || 0);
      if (existing) return { success: false, error: `Barcode '${item.sku_barcode}' already exists for another product.` };
    }

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
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('inventory:deleteItem', async (_, id) => {
  dbInstance.prepare('DELETE FROM items WHERE id = ?').run(id);
  return { success: true };
});

// Categories
ipcMain.handle('categories:getAll', async () => {
  return dbInstance.prepare('SELECT * FROM categories ORDER BY name ASC').all();
});

ipcMain.handle('categories:create', async (_, { name, description }) => {
  try {
    dbInstance.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Category already exists' };
  }
});

// POS Checkout (Handles Full Payment & Udhaar / Due amounts)
ipcMain.handle('pos:checkout', async (_, invoiceData) => {
  const checkoutTransaction = dbInstance.transaction((data) => {
    const invStmt = dbInstance.prepare(`
      INSERT INTO invoices (
        invoice_number, customer_name, customer_phone, subtotal, discount_total, tax_total, 
        grand_total, paid_amount, due_amount, is_credit, is_gst_bill, payment_mode
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const invResult = invStmt.run(
      data.invoice_number,
      data.customer_name || 'Walk-in Customer',
      data.customer_phone || '',
      data.subtotal,
      data.discount_total || 0,
      data.tax_total || 0,
      data.grand_total,
      data.paid_amount !== undefined ? data.paid_amount : data.grand_total,
      data.due_amount || 0,
      data.is_credit ? 1 : 0,
      data.is_gst_bill ? 1 : 0,
      data.payment_mode
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

// Udhaar / Khata Ledger Operations
ipcMain.handle('credit:getAll', async () => {
  return dbInstance.prepare(`
    SELECT * FROM invoices 
    WHERE is_credit = 1 AND due_amount > 0 
    ORDER BY created_at DESC
  `).all();
});

ipcMain.handle('credit:settlePayment', async (_, { invoiceId, paymentAmount }) => {
  try {
    const invoice = dbInstance.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) return { success: false, error: 'Invoice not found' };

    const newPaid = invoice.paid_amount + paymentAmount;
    const newDue = Math.max(0, invoice.grand_total - newPaid);
    const isCreditStill = newDue > 0 ? 1 : 0;

    dbInstance.prepare(`
      UPDATE invoices 
      SET paid_amount = ?, due_amount = ?, is_credit = ? 
      WHERE id = ?
    `).run(newPaid, newDue, isCreditStill, invoiceId);

    return { success: true, remainingDue: newDue };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Analytics
// electron/main.js
ipcMain.handle('analytics:getData', async () => {
  // 1. Invoices & Sales Metrics (Excluding GST from Net Profit)
  const salesSummary = dbInstance.prepare(`
    SELECT 
      COALESCE(SUM(grand_total), 0) as gross_revenue,
      COALESCE(SUM(grand_total - tax_total), 0) as net_sales_revenue,
      COALESCE(SUM(tax_total), 0) as total_tax_collected,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COALESCE(SUM(due_amount), 0) as total_udhaar_pending,
      COALESCE(
        SUM(
          (SELECT SUM(unit_cost_price * quantity) 
           FROM invoice_items 
           WHERE invoice_items.invoice_id = invoices.id)
        ), 
        0
      ) as sold_goods_cost,
      COALESCE(
        SUM(
          (grand_total - tax_total) - (
            SELECT SUM(unit_cost_price * quantity) 
            FROM invoice_items 
            WHERE invoice_items.invoice_id = invoices.id
          )
        ), 
        0
      ) as total_profit,
      (SELECT COUNT(*) FROM invoices) as total_orders
    FROM invoices
  `).get();

  // 2. Current Inventory Valuation (Total Wholesaler Cost Paid)
  const inventorySummary = dbInstance.prepare(`
    SELECT 
      COALESCE(SUM(cost_price * stock_qty), 0) as total_inventory_cost,
      COALESCE(SUM(selling_price * stock_qty), 0) as total_inventory_retail_value,
      COALESCE(SUM(stock_qty), 0) as total_stock_units
    FROM items
  `).get();

  // 3. Top 5 Best Selling Items
  const topSelling = dbInstance.prepare(`
    SELECT item_name, SUM(quantity) as units_sold, SUM(line_total) as revenue 
    FROM invoice_items 
    GROUP BY item_name 
    ORDER BY units_sold DESC LIMIT 5
  `).all();

  // 4. Low Stock Alerts
  const lowStockItems = dbInstance.prepare(`
    SELECT items.*, categories.name as category_name 
    FROM items 
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE stock_qty <= low_stock_threshold
  `).all();

  return {
    summary: {
      ...salesSummary,
      ...inventorySummary
    },
    topSelling,
    lowStockItems
  };
});

// Database Backup
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

// Orders & Custom Reorder
ipcMain.handle('orders:getAll', async () => {
  return dbInstance.prepare(`
    SELECT purchase_orders.*, categories.name as category_name
    FROM purchase_orders 
    LEFT JOIN categories ON purchase_orders.category_id = categories.id
    ORDER BY purchase_orders.status ASC, purchase_orders.created_at DESC
  `).all();
});

ipcMain.handle('orders:save', async (_, order) => {
  if (order.id) {
    const stmt = dbInstance.prepare(`
      UPDATE purchase_orders 
      SET category_id=?, item_name=?, sku_barcode=?, cost_price=?, selling_price=?, tax_rate=?, suggested_qty=?, low_stock_threshold=?, unit=?
      WHERE id=?
    `);
    stmt.run(
      order.category_id || null, order.item_name, order.sku_barcode || null,
      order.cost_price || 0, order.selling_price || 0, order.tax_rate || 0,
      order.suggested_qty || 1, order.low_stock_threshold || 5, order.unit || 'pcs',
      order.id
    );
  } else {
    const stmt = dbInstance.prepare(`
      INSERT INTO purchase_orders (category_id, item_name, sku_barcode, cost_price, selling_price, tax_rate, suggested_qty, low_stock_threshold, unit, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);
    stmt.run(
      order.category_id || null, order.item_name, order.sku_barcode || null,
      order.cost_price || 0, order.selling_price || 0, order.tax_rate || 0,
      order.suggested_qty || 1, order.low_stock_threshold || 5, order.unit || 'pcs'
    );
  }
  return { success: true };
});

ipcMain.handle('orders:moveToInventory', async (_, orderId) => {
  try {
    const order = dbInstance.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(orderId);
    if (!order) return { success: false, error: 'Order not found' };

    if (order.sku_barcode && order.sku_barcode.trim()) {
      const conflict = dbInstance.prepare('SELECT id, name FROM items WHERE sku_barcode = ?').get(order.sku_barcode.trim());
      if (conflict) {
        return { 
          success: false, 
          error: `Barcode '${order.sku_barcode}' is already assigned to item '${conflict.name}'.` 
        };
      }
    }

    const transferTx = dbInstance.transaction(() => {
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

      dbInstance.prepare('DELETE FROM purchase_orders WHERE id = ?').run(orderId);
    });

    transferTx();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('orders:delete', async (_, id) => {
  dbInstance.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
  return { success: true };
});

// Settings
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

// Shell External
ipcMain.handle('shell:openExternal', async (_, url) => {
  await shell.openExternal(url);
  return { success: true };
});