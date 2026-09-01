// src/pages/ReorderList.jsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, FileDown, Plus, Trash2, Check, X, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReorderList() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ item_name: '', suggested_qty: 1 });

  useEffect(() => {
    loadAllOrders();
  }, []);

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
    if (!newOrder.item_name.trim()) return;

    if (window.api.orders?.add) {
      await window.api.orders.add({
        item_name: newOrder.item_name,
        suggested_qty: parseFloat(newOrder.suggested_qty) || 1,
        status: 'PENDING'
      });
      setIsModalOpen(false);
      setNewOrder({ item_name: '', suggested_qty: 1 });
      loadAllOrders();
    }
  };

  const handleUpdateStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'RECEIVED' ? 'PENDING' : 'RECEIVED';
    if (window.api.orders?.updateStatus) {
      await window.api.orders.updateStatus({ id, status: nextStatus });
      loadAllOrders();
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
    doc.text('Vendor Purchase Reorder List', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const rows = [];
    let index = 1;

    // 1. Low stock auto items
    lowStockItems.forEach((item) => {
      rows.push([
        index++,
        item.name,
        'Auto (Low Stock)',
        `${item.stock_qty} ${item.unit || 'pcs'}`,
        '_________'
      ]);
    });

    // 2. Custom added items
    customOrders
      .filter((o) => o.status !== 'RECEIVED')
      .forEach((order) => {
        rows.push([
          index++,
          order.item_name,
          'Custom Required',
          `${order.suggested_qty} units`,
          '_________'
        ]);
      });

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Item Name', 'Source', 'Current / Needed', 'Order Quantity']],
      body: rows
    });

    doc.save(`Reorder_List_${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">To-Order Purchase List</h1>
          <p className="text-sm text-slate-500">
            Track low-stock products and custom items needed from vendors.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAllOrders} className="p-2 border rounded-lg bg-white hover:bg-slate-100">
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
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
              <th className="p-3">Product / Item Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Stock / Required Qty</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lowStockItems.length === 0 && customOrders.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  All inventory healthy. No pending reorder items.
                </td>
              </tr>
            ) : (
              <>
                {/* 1. Low stock auto items */}
                {lowStockItems.map((item) => (
                  <tr key={`auto-${item.id}`} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 inline shrink-0" />
                      {item.name}
                    </td>
                    <td className="p-3">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-medium">
                        Auto (Low Stock)
                      </span>
                    </td>
                    <td className="p-3 font-bold text-rose-600">
                      {item.stock_qty} {item.unit || 'pcs'} left (Min: {item.low_stock_threshold})
                    </td>
                    <td className="p-3">
                      <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-semibold">
                        REORDER REQUIRED
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs text-slate-400">Inventory Item</td>
                  </tr>
                ))}

                {/* 2. Custom manual orders */}
                {customOrders.map((order) => (
                  <tr
                    key={`custom-${order.id}`}
                    className={`hover:bg-slate-50 ${order.status === 'RECEIVED' ? 'opacity-50 bg-slate-50/50' : ''}`}
                  >
                    <td className="p-3 font-semibold text-slate-900">{order.item_name}</td>
                    <td className="p-3">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                        Custom Added
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{order.suggested_qty} units</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          order.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(order.id, order.status)}
                        title="Toggle Received Status"
                        className={`p-1 rounded ${
                          order.status === 'RECEIVED'
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Check className="h-4 w-4 inline" />
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

      {/* --- ADD CUSTOM REORDER ITEM MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form
            onSubmit={handleAddCustomOrder}
            className="bg-white p-6 rounded-xl w-96 shadow-2xl space-y-4 border border-slate-100"
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

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Item / Product Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Packaging Boxes, Brand X Oil 1L"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newOrder.item_name}
                  onChange={(e) => setNewOrder({ ...newOrder, item_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Quantity Needed
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newOrder.suggested_qty}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, suggested_qty: parseFloat(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
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
                Add to List
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}