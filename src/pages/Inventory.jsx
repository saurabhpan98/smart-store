// src/pages/Inventory.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, X, Package, AlertCircle, Layers, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState({ message: '', type: '' });
  const fileInputRef = useRef(null);
  
  // Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    brand: '',
    category_id: '',
    salts: [''],
    batch_no: '',
    expiry_date: '',
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

  const isMedicineCategory = (catId) => {
    const cat = categories.find((c) => c.id === parseInt(catId));
    return cat && cat.name.toLowerCase().includes('medicine');
  };

  const handleAddSalt = () => setFormData({ ...formData, salts: [...formData.salts, ''] });
  const handleSaltChange = (index, value) => {
    const updated = [...formData.salts];
    updated[index] = value;
    setFormData({ ...formData, salts: updated });
  };
  const handleRemoveSalt = (index) => {
    const updated = formData.salts.filter((_, i) => i !== index);
    setFormData({ ...formData, salts: updated.length ? updated : [''] });
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const isMed = isMedicineCategory(formData.category_id);
    const cleanedSalts = isMed ? formData.salts.filter((s) => s.trim() !== '') : [];

    const payload = {
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      brand: formData.brand?.trim() || '',
      salts: cleanedSalts,
      batch_no: formData.batch_no || '',
      expiry_date: formData.expiry_date || '',
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
      brand: item.brand || '',
      category_id: item.category_id || '',
      salts: saltsList,
      batch_no: item.batch_no || '',
      expiry_date: item.expiry_date || ''
    });
    setIsItemModalOpen(true);
  };

  const resetItemForm = () => {
    setFormData({
      id: null,
      name: '',
      brand: '',
      category_id: '',
      salts: [''],
      batch_no: '',
      expiry_date: '',
      sku_barcode: '',
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      stock_qty: 0,
      low_stock_threshold: 5,
      unit: 'pcs'
    });
  };

  // Bulk Import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        if (rawData.length === 0) {
          showNotice('Uploaded spreadsheet is empty.');
          return;
        }

        const itemsToImport = rawData.map((row) => ({
          name: row['Item Name'] || row['name'] || row['Product'],
          brand: row['Brand'] || row['brand'] || row['Company'] || '',
          sku_barcode: row['Barcode'] || row['sku_barcode'] || row['SKU'] ? String(row['Barcode'] || row['sku_barcode'] || row['SKU']) : null,
          salts: row['Salts'] || row['salts'] || '',
          batch_no: row['Batch'] || row['batch_no'] || '',
          expiry_date: row['Expiry'] || row['expiry_date'] || '',
          cost_price: parseFloat(row['Cost Price'] || row['cost_price'] || 0),
          selling_price: parseFloat(row['Selling Price'] || row['selling_price'] || 0),
          stock_qty: parseFloat(row['Stock'] || row['stock_qty'] || 0),
          low_stock_threshold: parseFloat(row['Min Alert'] || row['low_stock_threshold'] || 5),
          unit: row['Unit'] || row['unit'] || 'pcs',
          tax_rate: parseFloat(row['GST'] || row['tax_rate'] || 0)
        }));

        const res = await window.api.inventory.bulkImport(itemsToImport);
        if (res.success) {
          showNotice(`Successfully imported ${res.count} products from Excel!`, 'success');
          loadData();
        } else {
          showNotice('Bulk import failed: ' + res.error);
        }
      } catch (err) {
        showNotice('Invalid Excel or CSV file format.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleExportToExcel = () => {
    if (items.length === 0) {
      showNotice('No items in stock to export.');
      return;
    }
    const exportData = items.map((i, idx) => ({
      '#': idx + 1,
      'Item Name': i.name,
      'Brand / Company': i.brand || '',
      'Composition/Salts': i.salts || '',
      'Category': i.category_name || 'General',
      'Barcode': i.sku_barcode || '',
      'Batch No': i.batch_no || '',
      'Expiry Date': i.expiry_date || '',
      'Cost Price (Rs)': i.cost_price,
      'Selling Price (Rs)': i.selling_price,
      'Stock Qty': i.stock_qty,
      'Unit': i.unit,
      'Tax Rate (%)': i.tax_rate
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'InventoryStock');
    XLSX.writeFile(wb, `SmartStore_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotice('Inventory exported to Excel!', 'success');
  };

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
    if (window.confirm(`Delete category "${cat.name}"?`)) {
      const res = await window.api.categories.delete(cat.id);
      if (res.success) {
        showNotice('Category deleted.', 'success');
        loadData();
      } else {
        showNotice(res.error || 'Failed to delete category.');
      }
    }
  };

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.sku_barcode?.toLowerCase().includes(q) ||
      item.category_name?.toLowerCase().includes(q) ||
      item.salts?.toLowerCase().includes(q) ||
      item.batch_no?.toLowerCase().includes(q)
    );
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
          <p className="text-sm text-slate-500">Manage brands, batches, expiry alerts, and stock data.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Import Excel
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 shadow-xs"
          >
            <Download className="h-4 w-4 text-indigo-600" /> Export Excel
          </button>
          <button
            onClick={() => { setCatEditing(null); setCatForm({ name: '', description: '' }); setIsCatManagerOpen(true); }}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 shadow-xs"
          >
            <Layers className="h-4 w-4 text-indigo-600" /> Categories ({categories.length})
          </button>
          <button
            onClick={() => { resetItemForm(); setIsItemModalOpen(true); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Item
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

      {/* Live Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Product Name, Brand / Company, Salt Composition, or Batch No..."
          className="w-full border border-slate-200 bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Product Name & Brand</th>
              <th className="p-3">Batch & Expiry</th>
              <th className="p-3">Category</th>
              <th className="p-3">Cost Price</th>
              <th className="p-3">Selling Price</th>
              <th className="p-3">Stock</th>
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
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      {item.brand && (
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                          {item.brand}
                        </span>
                      )}
                    </div>
                    {item.salts && (
                      <span className="text-xs text-slate-500 font-normal lowercase italic block">
                        ({item.salts})
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    <span className="font-mono text-slate-700 block">B: {item.batch_no || '—'}</span>
                    <span className={`text-[11px] font-medium ${item.expiry_date && new Date(item.expiry_date) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                      Exp: {item.expiry_date || '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                      {item.category_name || 'General'}
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

      {/* --- ADD / EDIT MODAL --- */}
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
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
                <input
                  required
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g., Cilnep-T 40"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Feature 1: Brand / Company Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Brand / Company Name</label>
                <input
                  type="text"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g., Cipla, Sun Pharma, Nestle"
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
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
                  placeholder="Scan or enter barcode"
                  value={formData.sku_barcode || ''}
                  onChange={(e) => setFormData({ ...formData, sku_barcode: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g., BTH-9021"
                  className="w-full border p-2 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.batch_no || ''}
                  onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.expiry_date || ''}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              {isMedicineCategory(formData.category_id) && (
                <div className="col-span-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-indigo-900">Medicine Salt Compositions:</label>
                    <button
                      type="button"
                      onClick={handleAddSalt}
                      className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700 shadow-xs font-medium"
                    >
                      <Plus className="h-3 w-3" /> Add Salt
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {formData.salts.map((salt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          className="flex-1 bg-white border border-slate-200 p-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., Cilnidipine 10mg"
                          value={salt}
                          onChange={(e) => handleSaltChange(idx, e.target.value)}
                        />
                        {formData.salts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSalt(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit *</label>
                <input
                  required
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="pcs, strip, kg, bottle"
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

      {/* Categories Manager Modal */}
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

            <form onSubmit={handleSaveCategory} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  placeholder="Category Name"
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