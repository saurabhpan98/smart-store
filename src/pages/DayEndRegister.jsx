// src/pages/DayEndRegister.jsx
import React, { useState, useEffect } from 'react';
import { Landmark, CheckCircle2, AlertCircle, Save, Clock, ArrowRight } from 'lucide-react';

export default function DayEndRegister() {
  const [data, setData] = useState(null);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    loadRegister();
  }, []);

  const loadRegister = async () => {
    try {
      const res = await window.api.register.getToday();
      if (res) {
        setData(res);
        setOpeningCash(res.register.opening_cash || 0);
        setClosingCash(res.register.closing_cash || 0);
        setStatus(res.register.status || 'OPEN');
        setNotes(res.register.notes || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await window.api.register.update({
      opening_cash: parseFloat(openingCash) || 0,
      closing_cash: parseFloat(closingCash) || 0,
      status,
      notes
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
    loadRegister();
  };

  if (!data) return <div className="p-6 text-sm text-slate-500">Loading Cash Register...</div>;

  const { cashSales, upiSales, expenses, expectedCash } = data;
  const cashDifference = (parseFloat(closingCash) || 0) - expectedCash;

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Cash Register & Shift Closing</h1>
          <p className="text-sm text-slate-500">Reconcile physical cash in drawer with today's sales and expenses.</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          status === 'CLOSED' ? 'bg-slate-200 text-slate-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          Shift Status: {status}
        </span>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Shift details saved successfully!
        </div>
      )}

      {/* Today's Cash Flow Breakdown */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-xs">
          <span className="text-xs uppercase font-semibold text-slate-500">Opening Drawer Cash</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">₹{parseFloat(openingCash || 0).toFixed(2)}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-xs">
          <span className="text-xs uppercase font-semibold text-slate-500">Today Cash Sales</span>
          <h3 className="text-xl font-bold text-emerald-700 mt-1">+ ₹{cashSales.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-xs">
          <span className="text-xs uppercase font-semibold text-slate-500">Today Store Expenses</span>
          <h3 className="text-xl font-bold text-rose-600 mt-1">- ₹{expenses.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <span className="text-xs uppercase font-semibold text-indigo-900">Expected Drawer Cash</span>
          <h3 className="text-xl font-bold text-indigo-700 mt-1">₹{expectedCash.toFixed(2)}</h3>
        </div>
      </div>

      {/* Shift Form */}
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 border-b pb-3">
          <Landmark className="h-5 w-5 text-indigo-600" /> End of Day Register Reconcile
        </h3>

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Morning Opening Cash (₹)</label>
              <input
                type="number"
                step="any"
                className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Night Counted Closing Cash (₹)</label>
              <input
                type="number"
                step="any"
                className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
              />
            </div>
          </div>

          {/* Cash Difference Indicator */}
          {closingCash !== '' && (
            <div className={`p-3 rounded-lg border text-xs font-semibold flex justify-between items-center ${
              Math.abs(cashDifference) < 1 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <span>Difference (Counted vs Expected):</span>
              <span className="text-sm font-bold">
                {cashDifference >= 0 ? `+ ₹${cashDifference.toFixed(2)} (Excess)` : `- ₹${Math.abs(cashDifference).toFixed(2)} (Shortage)`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Shift Closing Notes</label>
            <textarea
              rows="2"
              placeholder="e.g. Handover to night staff, extra 500 kept for change..."
              className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-600">Register State:</label>
              <select
                className="border p-1.5 rounded-lg bg-white outline-none"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="OPEN">Keep Register OPEN</option>
                <option value="CLOSED">CLOSE Daily Shift</option>
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1.5 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-slate-800 shadow-xs"
            >
              <Save className="h-4 w-4" /> Save Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}