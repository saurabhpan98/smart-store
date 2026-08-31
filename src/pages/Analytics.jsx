// src/pages/Analytics.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, AlertCircle, Database } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const res = await window.api.analytics.getData();
    setData(res);
  };

  const handleBackup = async () => {
    const res = await window.api.backup.exportDb();
    if (res.success) alert(`Database backed up successfully to:\n${res.filePath}`);
  };

  if (!data) return <div className="p-6">Loading Analytics...</div>;

  return (
    <div className="p-6 bg-slate-50 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Business Analytics</h1>
          <p className="text-sm text-slate-500">Real-time revenue, profit, and fast-moving items.</p>
        </div>
        <button onClick={handleBackup} className="flex items-center gap-2 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-900">
          <Database className="h-4 w-4" /> Backup Database (.db)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full"><DollarSign /></div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Total Revenue</p>
            <h3 className="text-xl font-bold">₹{data.summary.total_revenue.toFixed(2)}</h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full"><TrendingUp /></div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Net Profit</p>
            <h3 className="text-xl font-bold">₹{data.summary.total_profit.toFixed(2)}</h3>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-full"><ShoppingBag /></div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Total Invoices</p>
            <h3 className="text-xl font-bold">{data.summary.total_orders}</h3>
          </div>
        </div>
      </div>

      {/* Visual Charts & Low Stock Alerts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-bold text-slate-800 mb-4">Top 5 Best-Selling Items</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topSelling}>
                <XAxis dataKey="item_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="units_sold" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border flex flex-col">
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-500" /> Low Stock Alerts
          </h3>
          <div className="flex-1 overflow-y-auto divide-y">
            {data.lowStockItems.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">All stock levels healthy.</p>
            ) : (
              data.lowStockItems.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-xs">
                    {item.stock_qty} {item.unit} remaining (Min: {item.low_stock_threshold})
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