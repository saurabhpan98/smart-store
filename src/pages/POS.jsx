// src/pages/POS.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, ShoppingCart, Send, FileDown, Plus, Package, CheckCircle2, Tag, AlertCircle } from 'lucide-react';
import { sendWhatsAppInvoice } from '../utils/whatsapp';
import { generateInvoicePDF } from '../utils/invoicePdf';

export default function POS() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  
  const [billDiscountType, setBillDiscountType] = useState('amount');
  const [billDiscountValue, setBillDiscountValue] = useState(0);
  
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [storeSettings, setStoreSettings] = useState({});
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const barcodeInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  useEffect(() => {
    loadInventory();
    loadSettings();
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  }, []);

  const showNotice = (message, type = 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const loadInventory = async () => {
    try {
      const data = await window.api.inventory.getAll();
      setItems(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await window.api?.settings?.get();
      if (data) setStoreSettings(data);
    } catch (err) {
      console.error(err);
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

  const calculateLineTotal = (qty, price, discountType, discountValue) => {
    const rawTotal = qty * price;
    let discAmount = 0;
    if (discountType === 'percent') {
      discAmount = (rawTotal * (discountValue || 0)) / 100;
    } else {
      discAmount = (discountValue || 0);
    }
    return Math.max(0, rawTotal - discAmount);
  };

  const addToCart = (product) => {
    if (product.stock_qty <= 0) {
      showNotice('This item is currently out of stock.');
      return;
    }
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock_qty) {
        showNotice(`Cannot exceed available stock of ${product.stock_qty} ${product.unit || 'pcs'}.`);
        return;
      }
      const newQty = existing.qty + 1;
      const newLineTotal = calculateLineTotal(newQty, existing.selling_price, existing.discountType, existing.discountValue);
      setCart(cart.map((i) => (i.id === product.id ? { ...i, qty: newQty, line_total: newLineTotal } : i)));
    } else {
      const lineTotal = calculateLineTotal(1, product.selling_price, 'amount', 0);
      setCart([
        ...cart,
        {
          ...product,
          qty: 1,
          discountType: 'amount',
          discountValue: 0,
          discount: 0,
          tax: product.selling_price * ((product.tax_rate || 0) / 100),
          line_total: lineTotal
        }
      ]);
    }
  };

  const updateCartQty = (id, newQty) => {
    const product = items.find((i) => i.id === id);
    if (product && newQty > product.stock_qty) {
      showNotice(`Max available stock: ${product.stock_qty} ${product.unit || 'pcs'}`);
      return;
    }
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.id !== id));
      return;
    }
    setCart(
      cart.map((i) => {
        if (i.id === id) {
          const newLineTotal = calculateLineTotal(newQty, i.selling_price, i.discountType, i.discountValue);
          return { ...i, qty: newQty, line_total: newLineTotal };
        }
        return i;
      })
    );
  };

  const updateItemDiscount = (id, type, val) => {
    setCart(
      cart.map((i) => {
        if (i.id === id) {
          const discountType = type !== undefined ? type : i.discountType;
          const discountValue = val !== undefined ? val : i.discountValue;
          const rawTotal = i.qty * i.selling_price;
          const discountAmount = discountType === 'percent' ? (rawTotal * discountValue) / 100 : discountValue;
          const lineTotal = Math.max(0, rawTotal - discountAmount);
          return { ...i, discountType, discountValue, discount: discountAmount, line_total: lineTotal };
        }
        return i;
      })
    );
  };

  // Calculations
  const rawSubtotal = cart.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0);
  const itemsDiscountSum = cart.reduce((acc, curr) => acc + (curr.discount || 0), 0);
  const cartSubtotal = cart.reduce((acc, curr) => acc + curr.line_total, 0);

  let overallBillDiscount = 0;
  if (billDiscountType === 'percent') {
    overallBillDiscount = (cartSubtotal * (parseFloat(billDiscountValue) || 0)) / 100;
  } else {
    overallBillDiscount = parseFloat(billDiscountValue) || 0;
  }

  const totalDiscount = itemsDiscountSum + overallBillDiscount;
  const totalTax = cart.reduce((acc, curr) => acc + (curr.tax * curr.qty), 0);
  const grandTotal = Math.max(0, cartSubtotal + totalTax - overallBillDiscount);

  const getInvoicePayload = () => {
    return {
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      customer_name: customer.name || '',
      customer_phone: customer.phone || '',
      subtotal: rawSubtotal,
      discount_total: totalDiscount,
      tax_total: totalTax,
      grand_total: grandTotal,
      payment_mode: paymentMode,
      items: cart
    };
  };

  const handleDownloadPDF = () => {
    if (cart.length === 0) {
      showNotice('Add items to cart to generate invoice PDF.');
      return;
    }
    const invoicePayload = getInvoicePayload();
    generateInvoicePDF(invoicePayload, storeSettings);
    showNotice('Invoice PDF downloaded!', 'success');
  };

  const handleSendWhatsApp = () => {
    if (cart.length === 0) {
      showNotice('Add items to cart first.');
      return;
    }
    if (!customer.phone.trim()) {
      showNotice('Please enter customer WhatsApp phone number.');
      if (phoneInputRef.current) phoneInputRef.current.focus();
      return;
    }
    const invoicePayload = getInvoicePayload();
    sendWhatsAppInvoice(customer.phone, invoicePayload, storeSettings.shop_name);
    showNotice('Opening WhatsApp Web in your browser...', 'success');
  };

  const handleDoneCheckout = async () => {
    if (cart.length === 0) {
      showNotice('Cart is empty. Please add items to bill.');
      return;
    }

    const invoicePayload = getInvoicePayload();

    try {
      const res = await window.api.pos.checkout(invoicePayload);
      if (res.success) {
        showNotice(`Order Completed! Inv #${invoicePayload.invoice_number}`, 'success');
        setCart([]);
        setCustomer({ name: '', phone: '' });
        setBillDiscountValue(0);
        loadInventory();
      } else {
        showNotice('Checkout Failed: ' + (res.error || 'Database error'));
      }
    } catch (err) {
      showNotice('Error processing transaction.');
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
        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Search by Item Name, Category, or Scan Barcode..."
              value={search || ''}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleBarcodeOrSearch}
            />
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg whitespace-nowrap">
            Total Stock: {items.length} Items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 border-b z-10">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Barcode / SKU</th>
                <th className="py-2.5 px-4">Stock</th>
                <th className="py-2.5 px-4 text-right">Selling Rate</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No items found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
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
                      <td className="py-3 px-3 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item.name}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {item.category_name || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{item.sku_barcode || '—'}</td>
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
                        ₹{item.selling_price} <span className="text-xs font-normal text-slate-500">/ {item.unit || 'pcs'}</span>
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
      <div className="w-[420px] flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 p-4 h-full">
        <h3 className="font-bold text-base flex items-center gap-2 mb-2 text-slate-800 pb-2 border-b">
          <ShoppingCart className="h-5 w-5 text-indigo-600" /> Current Bill
        </h3>

        {feedback.message && (
          <div className={`mb-2 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            {feedback.message}
          </div>
        )}

        {/* Customer Information */}
        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Customer Name (Optional)"
            className="w-full text-xs border border-slate-200 p-2 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
            value={customer.name || ''}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
          <input
            ref={phoneInputRef}
            type="text"
            placeholder="WhatsApp Number (e.g., 9876543210)"
            className="w-full text-xs border border-slate-200 p-2 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            value={customer.phone || ''}
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
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-slate-800 truncate">{idx + 1}. {item.name}</p>
                    <span className="text-[11px] text-slate-500">₹{item.selling_price} / {item.unit || 'pcs'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-12 border border-slate-300 rounded text-center py-0.5 text-xs font-medium bg-white"
                      value={item.qty || 1}
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

                {/* Specific Item Discount Control */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-600">
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3 text-indigo-500" /> Item Disc:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs bg-white"
                      value={item.discountValue || ''}
                      placeholder="0"
                      onChange={(e) => updateItemDiscount(item.id, undefined, parseFloat(e.target.value) || 0)}
                    />
                    <div className="inline-flex rounded border border-slate-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateItemDiscount(item.id, 'amount', undefined)}
                        className={`px-1.5 py-0.5 text-[10px] ${item.discountType === 'amount' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600'}`}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItemDiscount(item.id, 'percent', undefined)}
                        className={`px-1.5 py-0.5 text-[10px] ${item.discountType === 'percent' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600'}`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Totals */}
        <div className="pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>₹{rawSubtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600 py-1">
            <span className="font-medium">Bill Discount:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                className="w-16 border border-slate-200 rounded p-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                value={billDiscountValue || ''}
                placeholder="0"
                onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
              />
              <div className="inline-flex rounded border border-slate-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBillDiscountType('amount')}
                  className={`px-1.5 py-1 text-[10px] ${billDiscountType === 'amount' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600'}`}
                >
                  ₹ Flat
                </button>
                <button
                  type="button"
                  onClick={() => setBillDiscountType('percent')}
                  className={`px-1.5 py-1 text-[10px] ${billDiscountType === 'percent' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600'}`}
                >
                  % Off
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-rose-600">
            <span>Total Discount Applied:</span>
            <span>- ₹{totalDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Tax (GST):</span>
            <span>₹{totalTax.toFixed(2)}</span>
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
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* 3 Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-2">
            <button
              type="button"
              onClick={handleDoneCheckout}
              className="flex justify-center items-center gap-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Done
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex justify-center items-center gap-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
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