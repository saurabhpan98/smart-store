// src/pages/POS.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, ShoppingCart, Send, FileDown, Plus, Package, CheckCircle2 } from 'lucide-react';
import { sendWhatsAppInvoice } from '../utils/whatsapp';
import { generateInvoicePDF } from '../utils/invoicePdf';

export default function POS() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    loadInventory();
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await window.api.inventory.getAll();
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load inventory items:', err);
    }
  };

  const handleBarcodeOrSearch = (e) => {
    if (e.key === 'Enter') {
      const match = items.find(
        (i) => i.sku_barcode === search || i.name.toLowerCase().includes(search.toLowerCase())
      );
      if (match) {
        addToCart(match);
        setSearch('');
      }
    }
  };

  const addToCart = (product) => {
    if (product.stock_qty <= 0) {
      alert('This item is currently out of stock.');
      return;
    }
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock_qty) {
        alert(`Cannot exceed available stock of ${product.stock_qty} ${product.unit || 'pcs'}.`);
        return;
      }
      setCart(
        cart.map((i) =>
          i.id === product.id
            ? { ...i, qty: i.qty + 1, line_total: (i.qty + 1) * i.selling_price }
            : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          qty: 1,
          discount: 0,
          tax: product.selling_price * ((product.tax_rate || 0) / 100),
          line_total: product.selling_price
        }
      ]);
    }
  };

  const updateCartQty = (id, newQty) => {
    const product = items.find((i) => i.id === id);
    if (product && newQty > product.stock_qty) {
      alert(`Max available stock: ${product.stock_qty} ${product.unit || 'pcs'}`);
      return;
    }
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.id !== id));
      return;
    }
    setCart(
      cart.map((i) =>
        i.id === id ? { ...i, qty: newQty, line_total: newQty * i.selling_price } : i
      )
    );
  };

  // Totals calculations
  const subtotal = cart.reduce((acc, curr) => acc + curr.line_total, 0);
  const totalTax = cart.reduce((acc, curr) => acc + (curr.tax * curr.qty), 0);
  const grandTotal = Math.max(0, subtotal + totalTax - billDiscount);

  const handleCheckout = async (actionType = 'done') => {
    if (cart.length === 0) {
      alert('Cart is empty. Please add items to bill.');
      return;
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoicePayload = {
      invoice_number: invoiceNumber,
      customer_name: customer.name,
      customer_phone: customer.phone,
      subtotal,
      discount_total: billDiscount,
      tax_total: totalTax,
      grand_total: grandTotal,
      payment_mode: paymentMode,
      items: cart
    };

    try {
      const res = await window.api.pos.checkout(invoicePayload);
      if (res.success) {
        if (actionType === 'print') {
          generateInvoicePDF(invoicePayload);
        } else if (actionType === 'whatsapp') {
          if (customer.phone) {
            sendWhatsAppInvoice(customer.phone, invoicePayload);
          } else {
            alert('Please provide a WhatsApp number for the customer.');
          }
        } else if (actionType === 'done') {
          // Simple silent completion confirmation
          alert(`Order Completed Successfully! Invoice #${invoiceNumber}`);
        }

        // Reset POS Form
        setCart([]);
        setCustomer({ name: '', phone: '' });
        setBillDiscount(0);
        loadInventory();
      } else {
        alert('Checkout Failed: ' + (res.error || 'Database error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error processing transaction.');
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku_barcode?.toLowerCase().includes(search.toLowerCase()) ||
      i.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full gap-4 p-4 bg-slate-100 overflow-hidden box-border">
      {/* Left Pane: Items List View */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Search by Item Name, Category, or Scan Barcode & press Enter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleBarcodeOrSearch}
            />
          </div>
        </div>

        {/* Structured List View */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 border-b z-10">
              <tr>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Barcode / SKU</th>
                <th className="py-2.5 px-4">Stock</th>
                <th className="py-2.5 px-4 text-right">Price</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No items found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = item.stock_qty <= item.low_stock_threshold;
                  const isOutOfStock = item.stock_qty <= 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => !isOutOfStock && addToCart(item)}
                      className={`hover:bg-indigo-50/50 cursor-pointer transition ${
                        isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-slate-900">{item.name}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {item.category_name || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {item.sku_barcode || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.stock_qty} {item.unit || 'pcs'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{item.selling_price}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded text-xs font-semibold transition disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5 inline mr-0.5" /> Add
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Pane: Cart & Invoice Checkout */}
      <div className="w-[400px] flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 p-4 h-full">
        <h3 className="font-bold text-base flex items-center gap-2 mb-3 text-slate-800 pb-2 border-b">
          <ShoppingCart className="h-5 w-5 text-indigo-600" /> Current Bill
        </h3>

        {/* Customer Information */}
        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Customer Name (Optional)"
            className="w-full text-xs border border-slate-200 p-2 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="WhatsApp Number (e.g., 9876543210)"
            className="w-full text-xs border border-slate-200 p-2 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 overflow-y-auto space-y-2 border-y border-slate-100 py-2 pr-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
              <ShoppingCart className="h-6 w-6 mb-1 text-slate-300" />
              Your cart is empty
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                  <span className="text-[11px] text-slate-500">₹{item.selling_price} each</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className="w-12 border border-slate-300 rounded text-center py-0.5 text-xs font-medium"
                    value={item.qty}
                    onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 0)}
                  />
                  <span className="font-bold text-slate-900 w-16 text-right">
                    ₹{item.line_total.toFixed(2)}
                  </span>
                  <button
                    onClick={() => updateCartQty(item.id, 0)}
                    className="text-rose-500 hover:text-rose-700 p-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Totals */}
        <div className="pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax (GST):</span>
            <span>₹{totalTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Bill Discount (₹):</span>
            <input
              type="number"
              min="0"
              className="w-20 border border-slate-200 rounded p-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              value={billDiscount}
              onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-200 pt-2">
            <span>Total Payable:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-3 gap-1 pt-2">
            {['CASH', 'UPI', 'CREDIT'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`py-1 text-xs font-semibold rounded-md border transition ${
                  paymentMode === mode
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* 3 Checkout Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => handleCheckout('done')}
              className="flex justify-center items-center gap-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Done
            </button>
            <button
              type="button"
              onClick={() => handleCheckout('print')}
              className="flex justify-center items-center gap-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              type="button"
              onClick={() => handleCheckout('whatsapp')}
              className="flex justify-center items-center gap-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow-xs"
            >
              <Send className="h-3.5 w-3.5" /> WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}