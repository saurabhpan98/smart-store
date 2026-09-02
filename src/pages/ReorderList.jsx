// src/pages/ReorderList.jsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, FileDown, Plus, Trash2, Check, X, AlertCircle, Edit2, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReorderList() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState({ message: '', type: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    item_name: '',
    category_id: '',
    salts: [''],
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

  const showNotice = (message, type = 'error') => {
    setNotice({ message, type });
    setTimeout(() => setNotice({ message: '', type: '' }), 4000);
  };

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

  const isMedicineCategory = (catId) => {
    const cat = categories.find((c) => c.id === parseInt(catId));
    return cat && cat.name.toLowerCase().includes('medicine');
  };

  const handleAddSalt = () => {
    setFormData({ ...formData, salts: [...formData.salts, ''] });
  };

  const handleSaltChange = (index, value) => {
    const updated = [...formData.salts];
    updated[index] = value;
    setFormData({ ...formData, salts: updated });
  };

  const handleRemoveSalt = (index) => {
    const updated = formData.salts.filter((_, i) => i !== index);
    setFormData({ ...formData, salts: updated.length ? updated : [''] });
  };

  const handleSaveCustomOrder = async (e) => {
    e.preventDefault();
    if (!formData.item_name.trim()) return;

    const isMed = isMedicineCategory(formData.category_id);
    const cleanedSalts = isMed ? formData.salts.filter((s) => s.trim() !== '') : [];

    if (window.api.orders?.save) {
      const res = await window.api.orders.save({
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        salts: cleanedSalts,
        suggested_qty: parseFloat(formData.suggested_qty) || 1,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        low_stock_threshold: parseFloat(formData.low_stock_threshold) || 5,
        unit: formData.unit?.trim() || 'pcs'
      });

      if (res.success) {
        setIsModalOpen(false);
        resetForm();
        showNotice(formData.id ? 'Order item updated!' : 'Custom item added to To-Order list!', 'success');
        loadAllOrders();
      } else {
        showNotice(res.error || 'Failed to save order item.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      item_name: '',
      category_id: '',
      salts: [''],
      sku_barcode: '',
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      suggested_qty: 1,
      low_stock_threshold: 5,
      unit: 'pcs'
    });
  };

  const handleEditCustomOrder = (order) => {
    let saltsList = [''];
    if (order.salts) {
      saltsList = order.salts.split('+').map((s) => s.trim()).filter(Boolean);
      if (!saltsList.length) saltsList = [''];
    }
    setFormData({
      id: order.id,
      item_name: order.item_name,
      category_id: order.category_id || '',
      salts: saltsList,
      sku_barcode: order.sku_barcode || '',
      cost_price: order.cost_price || 0,
      selling_price: order.selling_price || 0,
      tax_rate: order.tax_rate || 0,
      suggested_qty: order.suggested_qty || 1,
      low_stock_threshold: order.low_stock_threshold || 5,
      unit: order.unit || 'pcs'
    });
    setIsModalOpen(true);
  };

  const handleMarkAsReceived = async (orderId) => {
    if (window.confirm('Mark this item as received? It will be added into your active Inventory Stock.')) {
      if (window.api.orders?.moveToInventory) {
        const res = await window.api.orders.moveToInventory(orderId);
        if (res.success) {
          showNotice('Item successfully moved into Inventory Stock!', 'success');
          loadAllOrders();
        } else {
          showNotice(res.error || 'Failed to transfer item.');
        }
      }
    }
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm('Delete this item from the order list?')) {
      if (window.api.orders?.delete) {
        await window.api.orders.delete(id);
        showNotice('Item removed from To-Order list.', 'success');
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
      const displayName = item.salts ? `${item.name} (${item.salts})` : item.name;
      rows.push([
        index++,
        displayName,
        item.category_name || 'General',
        'Auto (Low Stock)',
        `${item.stock_qty} ${item.unit || 'pcs'}`,
        `Rs.${item.cost_price || 0} / ${item.unit || 'pcs'}`,
        '_________'
      ]);
    });

    customOrders.forEach((order) => {
      const displayName = order.salts ? `${order.item_name} (${order.salts})` : order.item_name;
      rows.push([
        index++,
        displayName,
        order.category_name || 'General',
        'Custom To-Order',
        `${order.suggested_qty} ${order.unit || 'pcs'}`,
        `Rs.${order.cost_price || 0} / ${order.unit || 'pcs'}`,
        '_________'
      ]);
    });

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Item Name & Composition', 'Category', 'Source', 'Required / Current', 'Estimated Cost Rate', 'Order Qty']],
      body: rows
    });

    doc.save(`Reorder_List_${Date.now()}.pdf`);
    showNotice('Vendor Reorder PDF downloaded!', 'success');
  };

  // Filter matching both Name and Medicine Salt Composition
  const matchesSearch = (name, salts, barcode, category) => {
    const q = search.toLowerCase();
    return (
      (name && name.toLowerCase().includes(q)) ||
      (salts && salts.toLowerCase().includes(q)) ||
      (barcode && barcode.toLowerCase().includes(q)) ||
      (category && category.toLowerCase().includes(q))
    );
  };

  const filteredLowStock = lowStockItems.filter((i) =>
    matchesSearch(i.name, i.salts, i.sku_barcode, i.category_name)
  );

  const filteredCustomOrders = customOrders.filter((o) =>
    matchesSearch(o.item_name, o.salts, o.sku_barcode, o.category_name)
  );

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
          <button onClick={loadAllOrders} className="p-2 border rounded-lg bg-white hover:bg-slate-100 shadow-xs" title="Refresh List">
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

      {notice.message && (
        <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {notice.message}
        </div>
      )}

      {/* Live Search by Product Name OR Salt */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Product Name, Medicine Salt Composition, Barcode, or Category..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 border-b">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Product Name & Composition</th>
              <th className="p-3">Category</th>
              <th className="p-3">Type</th>
              <th className="p-3">Estimated Cost Price</th>
              <th className="p-3">Required / Current Qty</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLowStock.length === 0 && filteredCustomOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  {search ? `No items found matching "${search}"` : 'All inventory healthy. No pending reorder items.'}
                </td>
              </tr>
            ) : (
              <>
                {/* 1. Low stock auto items */}
                {filteredLowStock.map((item, idx) => (
                  <tr key={`auto-${item.id}`} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                      {item.salts && (
                        <span className="text-[11px] text-slate-500 font-normal lowercase italic block ml-5">
                          ({item.salts})
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{item.category_name || 'General'}</td>
                    <td className="p-3">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-medium">
                        Auto (Low Stock)
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">₹{item.cost_price} <span className="text-xs text-slate-400">/ {item.unit || 'pcs'}</span></td>
                    <td className="p-3 font-bold text-rose-600">
                      {item.stock_qty} {item.unit || 'pcs'} left (Min: {item.low_stock_threshold})
                    </td>
                    <td className="p-3 text-right text-xs text-slate-400">In Active Inventory</td>
                  </tr>
                ))}

                {/* 2. Custom manual orders */}
                {filteredCustomOrders.map((order, idx) => (
                  <tr key={`custom-${order.id}`} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-xs font-semibold text-slate-400">{filteredLowStock.length + idx + 1}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-900 block">{order.item_name}</span>
                      {order.salts && (
                        <span className="text-[11px] text-slate-500 font-normal lowercase italic block">
                          ({order.salts})
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{order.category_name || 'General'}</td>
                    <td className="p-3">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                        Custom To-Order
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">₹{order.cost_price || 0} <span className="text-xs text-slate-400">/ {order.unit || 'pcs'}</span></td>
                    <td className="p-3 font-medium text-slate-700">{order.suggested_qty} {order.unit || 'pcs'}</td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleEditCustomOrder(order)}
                        title="Edit Custom Item Details"
                        className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                      >
                        <Edit2 className="h-4 w-4 inline" />
                      </button>
                      <button
                        onClick={() => handleMarkAsReceived(order.id)}
                        title="Mark as Received (Add to Inventory)"
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded text-xs font-semibold transition"
                      >
                        <Check className="h-3.5 w-3.5 inline mr-1" /> Add to Stock
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-rose-600 hover:text-rose-900 p-1 hover:bg-rose-50 rounded"
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

      {/* --- ADD / EDIT CUSTOM ITEM MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form
            onSubmit={handleSaveCustomOrder}
            className="bg-white p-6 rounded-xl w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">
                {formData.id ? 'Edit To-Order Item' : 'Add Item to Order List'}
              </h3>
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
                  placeholder="e.g., Cilnep-T 40 or Basmati Rice 5kg"
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

              {/* Dynamic Medicine Salts Section */}
              {isMedicineCategory(formData.category_id) && (
                <div className="col-span-2 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-indigo-900">
                      Medicine Salt Compositions:
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSalt}
                      className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md hover:bg-indigo-700 shadow-xs font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Another Salt
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.salts.map((salt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={idx === 0 ? "e.g., Cilnidipine 10mg" : "e.g., Telmisartan 40mg"}
                          value={salt}
                          onChange={(e) => handleSaltChange(idx, e.target.value)}
                        />
                        {formData.salts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSalt(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cost Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.cost_price || ''}
                  placeholder="0"
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, suggested_qty: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit of Measure *</label>
                <input
                  required
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="strip, tab, bottle, pcs, kg"
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
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tax / GST Rate (%)</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.tax_rate || ''}
                  placeholder="0"
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-xs"
              >
                {formData.id ? 'Update Order Item' : 'Add to To-Order List'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}