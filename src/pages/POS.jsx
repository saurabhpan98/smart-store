// src/pages/POS.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, ShoppingCart, Send, Printer } from 'lucide-react';
import { sendWhatsAppInvoice } from '../utils/whatsapp';

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
    const data = await window.api.inventory.getAll();
    setItems(data);
  };

  const handleBarcodeOrSearch = (e) => {
    if (e.key === 'Enter') {
      const match = items.find((i) => i.sku_barcode === search || i.name.toLowerCase().includes(search.toLowerCase()));
      if (match) {
        addToCart(match);
        setSearch('');
      }
    }
  };

  const addToCart = (product) => {
    if (product.stock_qty <= 0) {
      alert('Item is out of stock!');
      return;
    }
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock_qty) {
        alert('Cannot add more than available stock.');
        return;
      }
      setCart(cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1, line_total: (i.qty + 1) * i.selling_price } : i)));
    } else {
      setCart([...cart, { ...product, qty: 1, discount: 0, tax: (product.selling_price * (product.tax_rate / 100)), line_total: product.selling_price }]);
    }
  };

  const updateCartQty = (id, newQty) => {
    const product = items.find((i) => i.id === id);
    if (newQty > product.stock_qty) {
      alert(`Max available stock: ${product.stock_qty}`);
      return;
    }
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.id !== id));
      return;
    }
    setCart(cart.map((i) => (i.id === id ? { ...i, qty: newQty, line_total: newQty * i.selling_price } : i)));
  };

  // Totals calculations
  const subtotal = cart.reduce((acc, curr) => acc + curr.line_total, 0);
  const totalTax = cart.reduce((acc, curr) => acc + (curr.tax * curr.qty), 0);
  const grandTotal = Math.max(0, subtotal + totalTax - billDiscount);

  const handleCheckout = async (sendWA = false) => {
    if (cart.length === 0) return;
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

    const res = await window.api.pos.checkout(invoicePayload);
    if (res.success) {
      if (sendWA && customer.phone) {
        sendWhatsAppInvoice(customer.phone, invoicePayload);
      }
      alert(`Order Completed! Invoice #${invoiceNumber}`);
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setBillDiscount(0);
      loadInventory();
    } else {
      alert('Checkout Failed: ' + res.error);
    }
  };

  return (
    <div className="flex h-full w-full gap-4 p-4 bg-slate-100">
      {/* Product Selection Window */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            ref={barcodeInputRef}
            type="text"
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Search items by Name or Scan Barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleBarcodeOrSearch}
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3">
          {items
            .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku_barcode?.includes(search))
            .map((item) => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className={`p-3 border rounded-lg cursor-pointer transition ${
                  item.stock_qty <= item.low_stock_threshold ? 'border-amber-400 bg-amber-50' : 'hover:border-indigo-500'
                }`}
              >
                <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                <p className="text-xs text-slate-500">{item.category_name || 'General'}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-slate-900">₹{item.selling_price}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${item.stock_qty <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100'}`}>
                    Stock: {item.stock_qty} {item.unit}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Cart & Billing Checkout Pane */}
      <div className="w-96 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3 text-slate-800">
          <ShoppingCart className="h-5 w-5 text-indigo-600" /> Current Bill
        </h3>

        {/* Customer Details */}
        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Customer Name (Optional)"
            className="w-full text-sm border p-2 rounded"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Customer WhatsApp Number"
            className="w-full text-sm border p-2 rounded"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 border-y py-2">
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <div className="flex-1">
                <p className="font-medium text-slate-800">{item.name}</p>
                <span className="text-xs text-slate-500">₹{item.selling_price} × {item.qty}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-12 border rounded text-center"
                  value={item.qty}
                  onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 0)}
                />
                <span className="font-semibold">₹{item.line_total}</span>
                <button onClick={() => updateCartQty(item.id, 0)} className="text-rose-500 hover:text-rose-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Calculation & Checkout */}
        <div className="pt-3 space-y-1.5 text-sm">
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
              className="w-20 border rounded p-1 text-right text-xs"
              value={billDiscount}
              onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-between font-bold text-lg text-slate-900 border-t pt-2">
            <span>Total Payable:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-3 gap-1 pt-2">
            {['CASH', 'UPI', 'CREDIT'].map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={`py-1 text-xs rounded border ${paymentMode === mode ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-50'}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-3">
            <button
              onClick={() => handleCheckout(false)}
              className="flex justify-center items-center gap-1.5 bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" /> Print Bill
            </button>
            <button
              onClick={() => handleCheckout(true)}
              className="flex justify-center items-center gap-1.5 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" /> WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}