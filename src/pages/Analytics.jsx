// src/pages/Analytics.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Database, PackageCheck, ShoppingCart, IndianRupee, RefreshCw, CalendarX2, Receipt } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await window.api.analytics.getData();
      setData(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackup = async () => {
    const res = await window.api.backup.exportDb();
    if (res.success) alert(`Database backed up successfully to:\n${res.filePath}`);
  };

  if (!data) return <div className="p-6 text-sm text-slate-500">Loading Store Analytics...</div>;

  const { summary, topSelling, lowStockItems, expiringItems } = data;

  return (
    <div className="p-6 bg-slate-50 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Reports & Expiry Alerts</h1>
          <p className="text-sm text-slate-500">Realized profits, daily operating expenses, and batch alerts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAnalytics} className="p-2 border rounded-lg bg-white hover:bg-slate-100 text-slate-600 shadow-xs">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={handleBackup} className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 shadow-xs">
            <Database className="h-4 w-4" /> Backup Database (.db)
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs uppercase font-semibold text-slate-500">Inventory Cost</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">₹{summary.total_inventory_cost.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{summary.total_stock_units} items in stock</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs uppercase font-semibold text-slate-500">Net Sales Revenue</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">₹{summary.net_sales_revenue.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Excl. GST | Gross: ₹{summary.gross_revenue.toFixed(2)}</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-xs uppercase font-semibold text-rose-800">Total Store Expenses</span>
          <h3 className="text-xl font-bold text-rose-600 mt-1">₹{summary.total_expenses.toFixed(2)}</h3>
          <p className="text-[11px] text-rose-500 mt-1">Rent, wages & tea costs</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-xs uppercase font-semibold text-emerald-800">Real Pocket Profit</span>
          <h3 className="text-xl font-bold text-emerald-700 mt-1">₹{summary.net_pocket_profit.toFixed(2)}</h3>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">(Gross Profit - Expenses)</p>
        </div>
      </div>

      {/* Near Expiry Alerts Widget (Feature 1) */}
      <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/10 shadow-xs">
        <h3 className="font-bold text-sm text-amber-900 mb-2 flex items-center gap-2">
          <CalendarX2 className="h-4 w-4 text-amber-600" /> Expired or Near-Expiry Stock (Within 45 Days)
        </h3>
        <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
          {!expiringItems || expiringItems.length === 0 ? (
            <p className="text-slate-400 py-3">No products nearing expiry.</p>
          ) : (
            expiringItems.map((item) => (
              <div key={item.id} className="py-2 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-slate-400 ml-2 font-mono">B:{item.batch_no || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">{item.stock_qty} {item.unit}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    new Date(item.expiry_date) < new Date() ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {new Date(item.expiry_date) < new Date() ? 'EXPIRED' : `Exp: ${item.expiry_date}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Charts & Low Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-800 mb-4">Top 5 Selling Items</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSelling} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="item_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="units_sold" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Units" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" /> Low Stock Alerts
          </h3>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
            {lowStockItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">All inventory healthy.</div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{item.name}</span>
                    <span className="text-[11px] text-slate-400">Cost: ₹{item.cost_price} / {item.unit}</span>
                  </div>
                  <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                    {item.stock_qty} {item.unit} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}