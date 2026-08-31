import React from 'react';
import { X, Printer, Send } from 'lucide-react';
import { generateInvoicePDF } from '../utils/invoicePdf';
import { sendWhatsAppInvoice } from '../utils/whatsapp';

export default function InvoiceModal({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">Invoice Summary</h3>
            <p className="text-xs text-slate-500">{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Customer: <b>{invoice.customer_name || 'Walk-in Customer'}</b></span>
            <span>Phone: <b>{invoice.customer_phone || 'N/A'}</b></span>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 border-b">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2">{item.name}</td>
                    <td className="p-2 text-center">{item.qty}</td>
                    <td className="p-2 text-right">₹{item.selling_price}</td>
                    <td className="p-2 text-right font-medium">₹{item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-xs text-slate-600 pt-2 border-t">
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{invoice.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>GST/Tax:</span><span>₹{invoice.tax_total.toFixed(2)}</span></div>
            <div className="flex justify-between text-rose-600"><span>Discount:</span><span>-₹{invoice.discount_total.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t">
              <span>Grand Total:</span>
              <span>₹{invoice.grand_total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex gap-2">
          <button
            onClick={() => generateInvoicePDF(invoice)}
            className="flex-1 flex justify-center items-center gap-2 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" /> Download PDF
          </button>
          {invoice.customer_phone && (
            <button
              onClick={() => sendWhatsAppInvoice(invoice.customer_phone, invoice)}
              className="flex-1 flex justify-center items-center gap-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" /> Send WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}