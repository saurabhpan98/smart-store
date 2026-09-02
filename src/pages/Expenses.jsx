// src/pages/Expenses.jsx
import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Trash2, IndianRupee, AlertCircle, Calendar } from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: 'Rent', amount: '', notes: '', expense_date: new Date().toISOString().slice(0, 10) });
  const [notice, setNotice] = useState({ message: '', type: '' });

  useEffect(() => {
    loadExpenses();
  }, []);

  const showNotice = (message, type = 'error') => {
    setNotice({ message, type });
    setTimeout(() => setNotice({ message: '', type: '' }), 4000);
  };

  const loadExpenses = async () => {
    try {
      const data = await window.api.expenses.getAll();
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      showNotice('Please enter a valid expense amount.');
      return;
    }

    const res = await window.api.expenses.add(form);
    if (res.success) {
      showNotice('Expense recorded successfully!', 'success');
      setForm({ category: 'Tea & Snacks', amount: '', notes: '', expense_date: new Date().toISOString().slice(0, 10) });
      loadExpenses();
    } else {
      showNotice('Failed to record expense.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this expense entry?')) {
      await window.api.expenses.delete(id);
      showNotice('Expense entry removed.', 'success');
      loadExpenses();
    }
  };

  const totalExpenseSum = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Store Expense Tracker</h1>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-xs">
              Total Recorded: ₹{totalExpenseSum.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-slate-500">Record shop rent, staff wages, electricity, tea, and operational costs.</p>
        </div>
      </div>

      {notice.message && (
        <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {notice.message}
        </div>
      )}

      {/* Add Expense Form Card */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex gap-3 items-end text-xs">
        <div className="w-44">
          <label className="block font-semibold text-slate-600 mb-1">Expense Category *</label>
          <select
            className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="Rent">Shop Rent</option>
            <option value="Electricity">Electricity Bill</option>
            <option value="Salary/Wages">Staff Salary / Wages</option>
            <option value="Tea & Snacks">Tea / Refreshments</option>
            <option value="Packaging">Packaging / Bags</option>
            <option value="Maintenance">Shop Maintenance</option>
            <option value="Other">Other Operational</option>
          </select>
        </div>

        <div className="w-36">
          <label className="block font-semibold text-slate-600 mb-1">Amount (₹) *</label>
          <input
            required
            type="number"
            step="any"
            placeholder="0"
            className="w-full border p-2 rounded-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>

        <div className="w-40">
          <label className="block font-semibold text-slate-600 mb-1">Date</label>
          <input
            type="date"
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          />
        </div>

        <div className="flex-1">
          <label className="block font-semibold text-slate-600 mb-1">Notes / Description</label>
          <input
            type="text"
            placeholder="e.g. Paid cash to helper"
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-1 h-9"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </form>

      {/* Expenses Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Category</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
              <th className="p-3">Notes</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  No expense records found.
                </td>
              </tr>
            ) : (
              expenses.map((exp, idx) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-900">{exp.category}</td>
                  <td className="p-3 font-bold text-rose-600">₹{exp.amount.toFixed(2)}</td>
                  <td className="p-3 font-mono text-xs">{exp.expense_date}</td>
                  <td className="p-3 text-slate-500 text-xs">{exp.notes || '—'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-rose-600 hover:text-rose-900 p-1"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
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