// src/pages/Inventory.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, FolderPlus, X, Package, AlertCircle, Layers } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState({ message: '', type: '' });
  
  // Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category_id: '',
    salts: [''],
    sku_barcode: '',
    cost_price: 0,
    selling_price: 0,
    tax_rate: 0,
    stock_qty: 0,
    low_stock_threshold: 5,
    unit: 'pcs'
  });

  // Category Manager Modal
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [catEditing, setCatEditing] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (message, type = 'error') => {
    setNotice({ message, type });
    setTimeout(() => setNotice({ message: '', type: '' }), 4000);
  };

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

  // Helper to check if current selected category is Medicine
  const isMedicineCategory = (catId) => {
    const cat = categories.find((c) => c.id === parseInt(catId));
    return cat && cat.name.toLowerCase().includes('medicine');
  };

  // Salt Array Helpers
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

  // Item Form Submit
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const isMed = isMedicineCategory(formData.category_id);
    const cleanedSalts = isMed ? formData.salts.filter((s) => s.trim() !== '') : [];

    const payload = {
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      salts: cleanedSalts,
      cost_price: parseFloat(formData.cost_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      tax_rate: parseFloat(formData.tax_rate) || 0,
      stock_qty: parseFloat(formData.stock_qty) || 0,
      low_stock_threshold: parseFloat(formData.low_stock_threshold) || 5,
      unit: formData.unit?.trim() || 'pcs'
    };

    const res = await window.api.inventory.saveItem(payload);
    if (res.success) {
      setIsItemModalOpen(false);
      resetItemForm();
      showNotice(formData.id ? 'Item updated successfully!' : 'Item added to stock!', 'success');
      loadData();
    } else {
      showNotice(res.error || 'Failed to save product.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Delete this product permanently from inventory?')) {
      await window.api.inventory.deleteItem(id);
      showNotice('Product deleted.', 'success');
      loadData();
    }
  };

  const handleEditItem = (item) => {
    let saltsList = [''];
    if (item.salts) {
      saltsList = item.salts.split('+').map((s) => s.trim()).filter(Boolean);
      if (!saltsList.length) saltsList = [''];
    }
    setFormData({
      ...item,
      category_id: item.category_id || '',
      salts: saltsList
    });
    setIsItemModalOpen(true);
  };

  const resetItemForm = () => {
    setFormData({
      id: null,
      name: '',
      category_id: '',
      salts: [''],
      sku_barcode: '',
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      stock_qty: 0,
      low_stock_threshold: 5,
      unit: 'pcs'
    });
  };

  // Category Actions
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    if (catEditing) {
      const res = await window.api.categories.update({ id: catEditing.id, ...catForm });
      if (res.success) {
        showNotice('Category updated successfully!', 'success');
        setCatEditing(null);
        setCatForm({ name: '', description: '' });
        loadData();
      } else {
        showNotice(res.error || 'Failed to update category.');
      }
    } else {
      const res = await window.api.categories.create(catForm);
      if (res.success) {
        showNotice('Category created successfully!', 'success');
        setCatForm({ name: '', description: '' });
        loadData();
      } else {
        showNotice(res.error || 'Failed to create category.');
      }
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (window.confirm(`Delete category "${cat.name}"? Products under this category will automatically be unassigned.`)) {
      const res = await window.api.categories.delete(cat.id);
      if (res.success) {
        showNotice('Category deleted.', 'success');
        loadData();
      } else {
        showNotice(res.error || 'Failed to delete category.');
      }
    }
  };

  // Filter with Salt Matching
  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(q);
    const barcodeMatch = item.sku_barcode?.toLowerCase().includes(q);
    const categoryMatch = item.category_name?.toLowerCase().includes(q);
    const saltsMatch = item.salts?.toLowerCase().includes(q);
    return nameMatch || barcodeMatch || categoryMatch || saltsMatch;
  });

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Inventory Stock</h1>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-xs">
              Total: {items.length} Products
            </span>
          </div>
          <p className="text-sm text-slate-500">Manage products, medicine salts, and synchronized categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCatEditing(null); setCatForm({ name: '', description: '' }); setIsCatManagerOpen(true); }}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition shadow-xs"
          >
            <Layers className="h-4 w-4 text-indigo-600" /> Manage Categories ({categories.length})
          </button>
          <button
            onClick={() => { resetItemForm(); setIsItemModalOpen(true); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add New Item
          </button>
        </div>
      </div>

      {notice.message && (
        <div className={`mb-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {notice.message}
        </div>
      )}

      {/* Live Search by Product Name OR Salt */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Product Name, Medicine Salt Composition, Barcode, or Category..."
          className="w-full border border-slate-200 bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Inventory Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Product Name & Composition</th>
              <th className="p-3">Barcode / SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Cost Price</th>
              <th className="p-3">Selling Price</th>
              <th className="p-3">Stock Available</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No products found.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900 block">{item.name}</span>
                    {item.salts && (
                      <span className="text-xs text-slate-500 font-normal lowercase italic block">
                        ({item.salts})
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-500">{item.sku_barcode || '—'}</td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                      {item.category_name || 'General / None'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">
                    ₹{item.cost_price} <span className="text-xs text-slate-400">/ {item.unit || 'pcs'}</span>
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    ₹{item.selling_price} <span className="text-xs font-normal text-slate-500">/ {item.unit || 'pcs'}</span>
                  </td>
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

      {/* --- ADD / EDIT ITEM MODAL WITH MEDICINE SALTS --- */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={handleItemSubmit} className="bg-white p-6 rounded-xl w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-slate-100">
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
                  placeholder="e.g., Cilnep-T 40 or Paracetamol 500"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.stock_qty || ''}
                  placeholder="0"
                  onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit of Measure *</label>
                <input
                  required
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="strip, tab, pcs, bottle, box"
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

      {/* --- CATEGORY MANAGER MODAL (View, Edit, Delete with Auto-Cascade) --- */}
      {isCatManagerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-[540px] shadow-2xl space-y-4 border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" /> Categories Manager
              </h3>
              <button type="button" onClick={() => setIsCatManagerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCategory} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  placeholder="Category Name (e.g. Medicine, Syrups, General)"
                  className="flex-1 border border-slate-300 p-2 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  {catEditing ? 'Update' : 'Add Category'}
                </button>
                {catEditing && (
                  <button
                    type="button"
                    onClick={() => { setCatEditing(null); setCatForm({ name: '', description: '' }); }}
                    className="px-2.5 py-1.5 border bg-white text-slate-600 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Optional short description..."
                className="w-full border border-slate-300 p-1.5 rounded-lg text-xs outline-none bg-white"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              />
            </form>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{cat.name}</h4>
                    <p className="text-[11px] text-slate-400">{cat.description || 'No description'} • {cat.item_count || 0} active items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setCatEditing(cat); setCatForm({ name: cat.name, description: cat.description || '' }); }}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Edit Category Name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}