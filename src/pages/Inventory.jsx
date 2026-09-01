// src/pages/Inventory.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, FolderPlus, X, Package } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
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

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catFormData, setCatFormData] = useState({ name: '', description: '' });
  const [catError, setCatError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fetchedItems, fetchedCategories] = await Promise.all([
        window.api.inventory.getAll(),
        window.api.categories.getAll()
      ]);
      setItems(fetchedItems || []);
      setCategories(fetchedCategories || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id) : null
    };
    await window.api.inventory.saveItem(payload);
    setIsItemModalOpen(false);
    resetItemForm();
    loadData();
  };

  const handleDeleteItem = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await window.api.inventory.deleteItem(id);
      loadData();
    }
  };

  const handleEditItem = (item) => {
    setFormData({ ...item, category_id: item.category_id || '' });
    setIsItemModalOpen(true);
  };

  const resetItemForm = () => {
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

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setCatError('');
    if (!catFormData.name.trim()) {
      setCatError('Category name is required.');
      return;
    }
    try {
      const res = await window.api.categories.create(catFormData);
      if (res.success) {
        setIsCatModalOpen(false);
        setCatFormData({ name: '', description: '' });
        await loadData();
      } else {
        setCatError(res.error || 'Failed to add category.');
      }
    } catch (err) {
      setCatError('Error creating category.');
    }
  };

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Inventory Stock</h1>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-xs">
              Total: {items.length} Products
            </span>
          </div>
          <p className="text-sm text-slate-500">Manage stock, categories, prices and low-stock alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCatError(''); setCatFormData({ name: '', description: '' }); setIsCatModalOpen(true); }}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition shadow-xs"
          >
            <FolderPlus className="h-4 w-4 text-indigo-600" /> Add Category
          </button>
          <button
            onClick={() => { resetItemForm(); setIsItemModalOpen(true); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add New Item
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Item Name</th>
              <th className="p-3">Barcode / SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Cost Price</th>
              <th className="p-3">Selling Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No products in inventory yet. Click <b>"Add New Item"</b> to begin.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-medium text-slate-900">{item.name}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{item.sku_barcode || '—'}</td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                      {item.category_name || 'General'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">₹{item.cost_price}</td>
                  <td className="p-3 font-semibold text-slate-900">₹{item.selling_price}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full text-xs ${
                      item.stock_qty <= item.low_stock_threshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.stock_qty <= item.low_stock_threshold && <AlertTriangle className="h-3 w-3" />}
                      {item.stock_qty} {item.unit || 'pcs'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => handleEditItem(item)} className="text-indigo-600 hover:text-indigo-900 p-1">
                      <Edit2 className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-rose-600 hover:text-rose-900 p-1">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={handleItemSubmit} className="bg-white p-6 rounded-xl w-[520px] shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
              <button type="button" onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600">Category</label>
                  <button
                    type="button"
                    onClick={() => { setCatError(''); setIsCatModalOpen(true); }}
                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3 inline" /> New
                  </button>
                </div>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.stock_qty || ''}
                  placeholder="0"
                  onChange={(e) => setFormData({ ...formData, stock_qty: parseFloat(e.target.value) || 0 })}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Low-Stock Alert Threshold</label>
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
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={handleCategorySubmit} className="bg-white p-6 rounded-xl w-96 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-indigo-600" /> Add New Category
              </h3>
              <button type="button" onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {catError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{catError}</p>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Grocery, Cosmetics, Dairy"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={catFormData.name || ''}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Short description..."
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={catFormData.description || ''}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}