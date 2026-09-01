// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Mock window.api if running directly in a standard browser
if (!window.api) {
  let mockCategories = [{ id: 1, name: 'Grocery' }, { id: 2, name: 'Beverages' }];
  let mockItems = [
    { id: 1, name: 'Sample Item A', category_id: 1, category_name: 'Grocery', sku_barcode: '1001', cost_price: 50, selling_price: 80, stock_qty: 20, low_stock_threshold: 5, unit: 'pcs', tax_rate: 5 },
    { id: 2, name: 'Sample Item B', category_id: 2, category_name: 'Beverages', sku_barcode: '1002', cost_price: 100, selling_price: 150, stock_qty: 3, low_stock_threshold: 5, unit: 'pcs', tax_rate: 18 }
  ];
  let mockOrders = [];

  window.api = {
    auth: { login: async () => ({ success: true, user: { username: 'admin' } }) },
    inventory: {
      getAll: async () => mockItems,
      saveItem: async (item) => {
        if (!item.id) {
          mockItems.push({ ...item, id: Date.now(), category_name: mockCategories.find(c => c.id === item.category_id)?.name || 'General' });
        } else {
          mockItems = mockItems.map(i => i.id === item.id ? { ...item, category_name: mockCategories.find(c => c.id === item.category_id)?.name || 'General' } : i);
        }
        return { success: true };
      },
      deleteItem: async (id) => {
        mockItems = mockItems.filter(i => i.id !== id);
        return { success: true };
      }
    },
    categories: {
      getAll: async () => mockCategories,
      create: async ({ name, description }) => {
        mockCategories.push({ id: Date.now(), name, description });
        return { success: true };
      }
    },
    pos: { checkout: async () => ({ success: true }) },
    analytics: {
      getData: async () => ({
        summary: { total_revenue: 1250, total_profit: 450, total_orders: 8 },
        topSelling: [{ item_name: 'Sample Item A', units_sold: 12 }],
        lowStockItems: mockItems.filter(i => i.stock_qty <= i.low_stock_threshold)
      })
    },
	orders = {
	  getAll: async () => mockOrders,
	  add: async (order) => { mockOrders.push({ id: Date.now(), ...order }); return { success: true }; },
	  updateStatus: async ({ id, status }) => {
		mockOrders = mockOrders.map(o => o.id === id ? { ...o, status } : o);
		return { success: true };
	  },
	  delete: async (id) => {
		mockOrders = mockOrders.filter(o => o.id !== id);
		return { success: true };
	  }
	},
    backup: { exportDb: async () => ({ success: true, filePath: 'mock/path' }) }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);