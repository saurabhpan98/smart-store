// src/pages/Inventory.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category_id: '',
    sku_barcode: '',
    cost_price: 0,
    selling_price: 0,
    tax_rate: 0,
    stock_qty: 0,
    low_stock_threshold: 5,
    unit: 'pcs'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [fetchedItems, fetchedCategories] = await Promise.all([
      window.api.inventory.getAll(),
      window.api.categories.getAll()
    ]);
    setItems(fetchedItems);
    setCategories(fetchedCategories);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await window.api.inventory.saveItem(formData);
    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await window.api.inventory.deleteItem(id);
      loadData();
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      category_id: '',
      sku_barcode: '',
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      stock_qty: 0,
      low_stock_threshold: 5,
      unit: 'pcs'
    });
  };

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Stock</h1>
          <p className="text-sm text-slate-500">Manage products, pricing, units, and inventory thresholds.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add New Item
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0">
            <tr>
              <th className="p-3">Item Name</th>
              <th className="p-3">Barcode / SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Cost Price</th>
              <th className="p-3">Selling Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">{item.name}</td>
                <td className="p-3 font-mono text-xs">{item.sku_barcode || '—'}</td>
                <td className="p-3">{item.category_name || 'Uncategorized'}</td>
                <td className="p-3">₹{item.cost_price}</td>
                <td className="p-3 font-semibold text-slate-900">₹{item.selling_price}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full text-xs ${
                    item.stock_qty <= item.low_stock_threshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.stock_qty <= item.low_stock_threshold && <AlertTriangle className="h-3 w-3" />}
                    {item.stock_qty} {item.unit}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900">
                    <Edit2 className="h-4 w-4 inline" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-rose-600 hover:text-rose-900">
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg w-[500px] shadow-xl space-y-4">
            <h3 className="font-bold text-lg">{formData.id ? 'Edit Item' : 'New Inventory Item'}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1">Item Name</label>
                <input required className="w-full border p-2 rounded" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Category</label>
                <select className="w-full border p-2 rounded" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                  <option value="">Select Category</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Barcode / SKU</label>
                <input className="w-full border p-2 rounded font-mono" value={formData.sku_barcode} onChange={(e) => setFormData({ ...formData, sku_barcode: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Cost Price (₹)</label>
                <input type="number" className="w-full border p-2 rounded" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Selling Price (₹)</label>
                <input required type="number" className="w-full border p-2 rounded" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Current Stock</label>
                <input type="number" className="w-full border p-2 rounded" value={formData.stock_qty} onChange={(e) => setFormData({ ...formData, stock_qty: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Low-Stock Alert Limit</label>
                <input type="number" className="w-full border p-2 rounded" value={formData.low_stock_threshold} onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Save Product</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}