// src/pages/CustomerKhata.jsx
import React, { useState, useEffect } from 'react';
import { BookOpen, RefreshCw, CheckCircle2, Phone, Search, IndianRupee, AlertCircle, X, Send } from 'lucide-react';

export default function CustomerKhata() {
  const [credits, setCredits] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [notice, setNotice] = useState({ message: '', type: '' });

  useEffect(() => {
    loadCredits();
  }, []);

  const showNotice = (message, type = 'error') => {
    setNotice({ message, type });
    setTimeout(() => setNotice({ message: '', type: '' }), 4000);
  };

  const loadCredits = async () => {
    try {
      const data = await window.api.credit.getAll();
      setCredits(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    const amount = parseFloat(settleAmount);
    if (!amount || amount <= 0) {
      showNotice('Please enter a valid settlement amount.');
      return;
    }

    try {
      const res = await window.api.credit.settlePayment({
        invoiceId: selectedInvoice.id,
        paymentAmount: amount
      });

      if (res.success) {
        showNotice(`Payment recorded! Remaining Due: ₹${res.remainingDue.toFixed(2)}`, 'success');
        setSelectedInvoice(null);
        setSettleAmount('');
        loadCredits();
      } else {
        showNotice(res.error || 'Failed to settle payment.');
      }
    } catch (err) {
      showNotice('Error settling credit.');
    }
  };

  const sendReminderWhatsApp = (item) => {
    if (!item.customer_phone) {
      showNotice('No phone number recorded for this customer.');
      return;
    }
    const cleanPhone = item.customer_phone.replace(/[^0-9]/g, '');
    const message = `*PAYMENT REMINDER*%0A` +
      `Dear ${item.customer_name},%0A` +
      `This is a gentle reminder regarding your pending balance of *Rs. ${item.due_amount.toFixed(2)}* for Invoice #${item.invoice_number}.%0A%0A` +
      `Please clear the due amount at your convenience. Thank you!`;

    const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;
    if (window.api?.shell?.openExternal) {
      window.api.shell.openExternal(waUrl);
    } else {
      window.open(waUrl, '_blank');
    }
  };

  const filteredCredits = credits.filter(
    (c) =>
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_phone?.includes(search) ||
      c.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUdhaarSum = credits.reduce((acc, curr) => acc + (curr.due_amount || 0), 0);

  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Customer Khata (Udhaar Ledger)</h1>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs">
              Total Udhaar: ₹{totalUdhaarSum.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-slate-500">Track pending customer dues, record partial payments, and send reminders.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadCredits} className="p-2 border rounded-lg bg-white hover:bg-slate-100 shadow-xs">
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </button>
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

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          placeholder="Search by Customer Name, Phone, or Invoice No..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Ledger Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 border-b">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Customer Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Invoice No</th>
              <th className="p-3">Total Bill</th>
              <th className="p-3">Paid So Far</th>
              <th className="p-3">Pending Udhaar</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCredits.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  No pending Udhaar / Credit orders!
                </td>
              </tr>
            ) : (
              filteredCredits.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-900">{item.customer_name}</td>
                  <td className="p-3 font-mono text-xs">{item.customer_phone || '—'}</td>
                  <td className="p-3 font-mono text-xs text-indigo-600 font-medium">{item.invoice_number}</td>
                  <td className="p-3 font-medium">₹{item.grand_total.toFixed(2)}</td>
                  <td className="p-3 text-emerald-600 font-medium">₹{(item.paid_amount || 0).toFixed(2)}</td>
                  <td className="p-3 font-bold text-rose-600">₹{item.due_amount.toFixed(2)}</td>
                  <td className="p-3 text-right space-x-2">
                    {item.customer_phone && (
                      <button
                        onClick={() => sendReminderWhatsApp(item)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded text-xs font-semibold transition inline-flex items-center gap-1"
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="h-3 w-3" /> Remind
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedInvoice(item); setSettleAmount(item.due_amount); }}
                      className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-xs font-semibold transition"
                    >
                      Receive Payment
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Settle Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSettle} className="bg-white p-6 rounded-xl w-96 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Receive Udhaar Payment</h3>
              <button type="button" onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm bg-slate-50 p-3 rounded-lg border">
              <p className="text-xs text-slate-500">Customer: <b className="text-slate-800">{selectedInvoice.customer_name}</b></p>
              <p className="text-xs text-slate-500">Invoice: <b className="text-slate-800">{selectedInvoice.invoice_number}</b></p>
              <p className="text-xs text-slate-500">Current Due: <b className="text-rose-600 font-bold">₹{selectedInvoice.due_amount.toFixed(2)}</b></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Receiving Now (₹) *</label>
              <input
                required
                type="number"
                step="any"
                max={selectedInvoice.due_amount}
                min="1"
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-xs"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}