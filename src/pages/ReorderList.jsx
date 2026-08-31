import React, { useEffect, useState } from 'react';
import { ShoppingBag, RefreshCw, CheckCircle2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReorderList() {
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    loadReorderItems();
  }, []);

  const loadReorderItems = async () => {
    const res = await window.api.analytics.getData();
    setLowStockItems(res.lowStockItems || []);
  };

  const exportPurchaseOrderPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Vendor Purchase Reorder List', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableRows = lowStockItems.map((item, idx) => [
      idx + 1,
      item.name,
      `${item.stock_qty} ${item.unit}`,
      `${item.low_stock_threshold} ${item.unit}`,
      '_________'
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Item Name', 'Current Stock', 'Alert Threshold', 'Order Quantity']],
      body: tableRows,
    });

    doc.save(`Reorder_List_${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">To-Order Purchase List</h1>
          <p className="text-sm text-slate-500">Items that hit low-stock threshold and need vendor replenishment.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReorderItems} className="p-2 border rounded-lg bg-white hover:bg-slate-100">
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={exportPurchaseOrderPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <FileDown className="h-4 w-4" /> Export Vendor List (PDF)
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0">
            <tr>
              <th className="p-3">Product Name</th>
              <th className="p-3">Current Remaining Stock</th>
              <th className="p-3">Minimum Alert Level</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lowStockItems.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  All inventory items are currently above threshold.
                </td>
              </tr>
            ) : (
              lowStockItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="p-3 font-bold text-rose-600">{item.stock_qty} {item.unit}</td>
                  <td className="p-3">{item.low_stock_threshold} {item.unit}</td>
                  <td className="p-3">
                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-semibold">
                      REORDER REQUIRED
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}