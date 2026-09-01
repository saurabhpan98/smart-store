// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- Browser / Codespaces Mock Fallback ---
if (!window.api) {
  let mockCategories = [
    { id: 1, name: 'Grocery', description: 'Daily grocery items' },
    { id: 2, name: 'Cosmetics', description: 'Skincare and beauty' },
    { id: 3, name: 'Beverages', description: 'Cold drinks and juices' }
  ];

  let mockItems = [
    {
      id: 1,
      name: 'Face Wash',
      category_id: 2,
      category_name: 'Cosmetics',
      sku_barcode: '8901030383011',
      cost_price: 45,
      selling_price: 60,
      tax_rate: 18,
      stock_qty: 8,
      low_stock_threshold: 5,
      unit: 'pcs'
    },
    {
      id: 2,
      name: 'Shampoo 180ml',
      category_id: 2,
      category_name: 'Cosmetics',
      sku_barcode: '8901030383022',
      cost_price: 90,
      selling_price: 120,
      tax_rate: 18,
      stock_qty: 10,
      low_stock_threshold: 5,
      unit: 'pcs'
    },
    {
      id: 3,
      name: 'Basmati Rice 5kg',
      category_id: 1,
      category_name: 'Grocery',
      sku_barcode: '8901030383033',
      cost_price: 350,
      selling_price: 450,
      tax_rate: 5,
      stock_qty: 3,
      low_stock_threshold: 5,
      unit: 'packet'
    }
  ];

  let mockOrders = [
    { id: 101, item_name: 'Packaging Tape 2-inch', suggested_qty: 5, status: 'PENDING' }
  ];

  let mockInvoices = [];

  window.api = {
    // 1. Authentication
    auth: {
      login: async ({ username, password }) => {
        if (username === 'admin' && password === 'admin123') {
          return { success: true, user: { id: 1, username: 'admin', role: 'admin' } };
        }
        return { success: false, message: 'Invalid username or password' };
      }
    },

    // 2. Inventory Management
    inventory: {
      getAll: async () => [...mockItems],
      saveItem: async (item) => {
        const category = mockCategories.find((c) => c.id === item.category_id);
        const categoryName = category ? category.name : 'General';

        if (item.id) {
          mockItems = mockItems.map((i) =>
            i.id === item.id ? { ...item, category_name: categoryName } : i
          );
        } else {
          mockItems.push({
            ...item,
            id: Date.now(),
            category_name: categoryName
          });
        }
        return { success: true };
      },
      deleteItem: async (id) => {
        mockItems = mockItems.filter((i) => i.id !== id);
        return { success: true };
      }
    },

    // 3. Category Management
    categories: {
      getAll: async () => [...mockCategories],
      create: async ({ name, description }) => {
        if (mockCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          return { success: false, error: 'Category already exists' };
        }
        mockCategories.push({ id: Date.now(), name, description });
        return { success: true };
      }
    },

    // 4. POS Checkout
    pos: {
      checkout: async (invoice) => {
        mockInvoices.push(invoice);
        // Deduct inventory quantities
        for (const lineItem of invoice.items) {
          mockItems = mockItems.map((i) =>
            i.id === lineItem.id
              ? { ...i, stock_qty: Math.max(0, i.stock_qty - lineItem.qty) }
              : i
          );
        }
        return { success: true, invoiceNumber: invoice.invoice_number };
      }
    },

    // 5. Custom Orders & Reorder List
    orders: {
      getAll: async () => [...mockOrders],
      add: async (order) => {
        mockOrders.push({ id: Date.now(), ...order });
        return { success: true };
      },
      updateStatus: async ({ id, status }) => {
        mockOrders = mockOrders.map((o) => (o.id === id ? { ...o, status } : o));
        return { success: true };
      },
      delete: async (id) => {
        mockOrders = mockOrders.filter((o) => o.id !== id);
        return { success: true };
      }
    },

    // 6. Reports & Analytics
    analytics: {
      getData: async () => {
        const totalRevenue = mockInvoices.reduce((acc, inv) => acc + inv.grand_total, 0);
        const totalProfit = mockInvoices.reduce(
          (acc, inv) =>
            acc +
            inv.items.reduce(
              (itemAcc, item) => itemAcc + (item.selling_price - (item.cost_price || 0)) * item.qty,
              0
            ),
          0
        );

        const lowStockItems = mockItems.filter((i) => i.stock_qty <= i.low_stock_threshold);

        return {
          summary: {
            total_revenue: totalRevenue || 540.0,
            total_profit: totalProfit || 180.0,
            total_orders: mockInvoices.length || 3
          },
          topSelling: [
            { item_name: 'Face Wash', units_sold: 14 },
            { item_name: 'Shampoo 180ml', units_sold: 8 },
            { item_name: 'Basmati Rice 5kg', units_sold: 5 }
          ],
          lowStockItems
        };
      }
    },

    // 7. Database Backup
    backup: {
      exportDb: async () => ({
        success: true,
        filePath: 'C:\\Users\\MockUser\\Downloads\\pos_backup.db'
      })
    }
  };
}

// --- React Mount ---
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);