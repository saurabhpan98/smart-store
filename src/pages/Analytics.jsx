// src/pages/Analytics.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingBag, TrendingUp, AlertCircle, Database, PackageCheck, ShoppingCart, IndianRupee, RefreshCw } from 'lucide-react';

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
      console.error('Analytics load error:', err);
    }
  };

  const handleBackup = async () => {
    const res = await window.api.backup.exportDb();
    if (res.success) alert(`Database backed up successfully to:\n${res.filePath}`);
  };

  if (!data) {
    return (
      <div className="p-6 h-full flex items-center justify-center text-slate-500 text-sm">
        Loading Store Analytics...
      </div>
    );
  }

  const { summary, topSelling, lowStockItems } = data;

  return (
    <div className="p-6 bg-slate-50 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Business Analytics & Financials</h1>
          <p className="text-sm text-slate-500">
            Track purchase investment, sales turnover, GST, and true realized profit.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAnalytics}
            className="p-2 border rounded-lg bg-white hover:bg-slate-100 text-slate-600 shadow-xs"
            title="Refresh Numbers"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 shadow-xs"
          >
            <Database className="h-4 w-4" /> Backup Database (.db)
          </button>
        </div>
      </div>

      {/* Primary Financial KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Stock Cost (Wholesaler Paid) */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-slate-500">Inventory Cost</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{summary.total_inventory_cost.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Paid to Wholesaler ({summary.total_stock_units} items in stock)
          </p>
        </div>

        {/* Total Net Sales Revenue */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-slate-500">Sales Turnover</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{summary.net_sales_revenue.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Excl. Tax | Gross: ₹{summary.gross_revenue.toFixed(2)}
          </p>
        </div>

        {/* Sold Goods Cost */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-slate-500">Cost of Sold Items</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{summary.sold_goods_cost.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Purchase cost of billed products</p>
        </div>

        {/* Real Net Profit */}
        <div className="p-4 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-emerald-800">Net Realized Profit</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-emerald-700">₹{summary.total_profit.toFixed(2)}</h3>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            (Sales - Cost of Sold Goods)
          </p>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">Total Completed Invoices:</span>
          <span className="font-bold text-slate-800 text-sm">{summary.total_orders} Bills</span>
        </div>
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">GST Collected (Payable to Govt):</span>
          <span className="font-bold text-indigo-700 text-sm">₹{summary.total_tax_collected.toFixed(2)}</span>
        </div>
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">Total Udhaar / Pending Balance:</span>
          <span className="font-bold text-rose-600 text-sm">₹{summary.total_udhaar_pending.toFixed(2)}</span>
        </div>
      </div>

      {/* Visual Analytics & Low Stock Alerts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top 5 Products Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-800 mb-4">Top 5 Selling Items (Units Sold)</h3>
          <div className="h-64">
            {topSelling.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No products sold yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSelling} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="item_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="units_sold" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" /> Low Stock Alerts
          </h3>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
            {lowStockItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                All inventory levels are healthy.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{item.name}</span>
                    <span className="text-[11px] text-slate-400">Cost: ₹{item.cost_price} / {item.unit}</span>
                  </div>
                  <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                    {item.stock_qty} {item.unit} left (Alert: {item.low_stock_threshold})
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