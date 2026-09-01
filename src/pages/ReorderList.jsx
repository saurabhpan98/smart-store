// src/pages/ReorderList.jsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, FileDown, Plus, Trash2, Check, X, AlertCircle, ShoppingBag } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReorderList() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    item_name: '',
    category_id: '',
    sku_barcode: '',
    cost_price: 0,
    selling_price: 0,
    tax_rate: 0,
    suggested_qty: 1,
    low_stock_threshold: 5,
    unit: 'pcs'
  });

  useEffect(() => {
    loadAllOrders();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await window.api.categories.getAll();
      setCategories(cats || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllOrders = async () => {
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        window.api.analytics.getData(),
        window.api.orders?.getAll ? window.api.orders.getAll() : []
      ]);
      setLowStockItems(analyticsRes.lowStockItems || []);
      setCustomOrders(ordersRes || []);
    } catch (err) {
      console.error('Failed to load reorder list:', err);
    }
  };

  const handleAddCustomOrder = async (e) => {
    e.preventDefault();
    if (!formData.item_name.trim()) return;

    if (window.api.orders?.add) {
      await window.api.orders.add({
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        suggested_qty: parseFloat(formData.suggested_qty) || 1,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        low_stock_threshold: parseFloat(formData.low_stock_threshold) || 5
      });
      setIsModalOpen(false);
      resetForm();
      loadAllOrders();
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category_id: '',
      sku_barcode: '',
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      suggested_qty: 1,
      low_stock_threshold: 5,
      unit: 'pcs'
    });
  };

  const handleMarkAsReceived = async (orderId) => {
    if (confirm('Mark this item as received? It will be added into your active Inventory Stock.')) {
      if (window.api.orders?.moveToInventory) {
        const res = await window.api.orders.moveToInventory(orderId);
        if (res.success) {
          alert('Item successfully added to Inventory Stock!');
          loadAllOrders();
        } else {
          alert('Failed to transfer item: ' + res.error);
        }
      }
    }
  };

  const handleDeleteOrder = async (id) => {
    if (confirm('Delete this item from the order list?')) {
      if (window.api.orders?.delete) {
        await window.api.orders.delete(id);
        loadAllOrders();
      }
    }
  };

  const exportPurchaseOrderPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Smart Store - Vendor Purchase Reorder List', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const rows = [];
    let index = 1;

    lowStockItems.forEach((item) => {
      rows.push([
        index++,
        item.name,
        item.category_name || 'General',
        'Auto (Low Stock)',
        `${item.stock_qty} ${item.unit || 'pcs'}`,
        '_________'
      ]);
    });

    customOrders.forEach((order) => {
      rows.push([
        index++,
        order.item_name,
        order.category_name || 'General',
        'Custom To-Order',
        `${order.suggested_qty} ${order.unit || 'pcs'}`,
        '_________'
      ]);
    });

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Item Name', 'Category', 'Source', 'Current / Needed', 'Order Qty']],
      body: rows
    });

    doc.save(`Reorder_List_${Date.now()}.pdf`);
  };

  const totalToOrderItems = lowStockItems.length + customOrders.length;

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">To-Order Purchase List</h1>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs">
              Total Pending: {totalToOrderItems} Items
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Track low-stock items and custom vendor orders. Mark received items to add them into Inventory.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAllOrders} className="p-2 border rounded-lg bg-white hover:bg-slate-100">
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Custom Item
          </button>
          <button
            onClick={exportPurchaseOrderPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 shadow-xs"
          >
            <FileDown className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Product / Item Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Type</th>
              <th className="p-3">Required / Current Qty</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {totalToOrderItems === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  All inventory healthy. No pending reorder items.
                </td>
              </tr>
            ) : (
              <>
                {/* 1. Low stock auto items */}
                {lowStockItems.map((item, idx) => (
                  <tr key={`auto-${item.id}`} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 inline shrink-0" />
                      {item.name}
                    </td>
                    <td className="p-3 text-slate-500">{item.category_name || 'General'}</td>
                    <td className="p-3">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-medium">
                        Auto (Low Stock)
                      </span>
                    </td>
                    <td className="p-3 font-bold text-rose-600">
                      {item.stock_qty} {item.unit || 'pcs'} left (Min: {item.low_stock_threshold})
                    </td>
                    <td className="p-3 text-right text-xs text-slate-400">In Active Inventory</td>
                  </tr>
                ))}

                {/* 2. Custom manual orders */}
                {customOrders.map((order, idx) => (
                  <tr key={`custom-${order.id}`} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-xs font-semibold text-slate-400">{lowStockItems.length + idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-900">{order.item_name}</td>
                    <td className="p-3 text-slate-500">{order.category_name || 'General'}</td>
                    <td className="p-3">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                        Custom To-Order
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{order.suggested_qty} {order.unit || 'pcs'}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleMarkAsReceived(order.id)}
                        title="Mark as Received (Add to Inventory)"
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded text-xs font-semibold transition"
                      >
                        <Check className="h-3.5 w-3.5 inline mr-1" /> Add to Stock
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-rose-600 hover:text-rose-900 p-1"
                        title="Delete from list"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form
            onSubmit={handleAddCustomOrder}
            className="bg-white p-6 rounded-xl w-[520px] shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Add Item to Order List</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
                <input
                  required
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g., Basmati Rice 5kg"
                  value={formData.item_name || ''}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  className="w-full border p-2 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">General / None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Barcode / SKU</label>
                <input
                  className="w-full border p-2 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Scan or enter code"
                  value={formData.sku_barcode || ''}
                  onChange={(e) => setFormData({ ...formData, sku_barcode: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cost Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.cost_price || ''}
                  placeholder="0"
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Price (₹) *</label>
                <input
                  required
                  type="number"
                  step="any"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-900"
                  value={formData.selling_price || ''}
                  placeholder="0"
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity Needed *</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.suggested_qty || ''}
                  placeholder="1"
                  onChange={(e) => setFormData({ ...formData, suggested_qty: parseFloat(e.target.value) || 1 })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                <input
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="pcs, kg, packet, litre"
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Low-Stock Alert Limit</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.low_stock_threshold || ''}
                  placeholder="5"
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tax / GST Rate (%)</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.tax_rate || ''}
                  placeholder="0"
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                Add to To-Order List
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}