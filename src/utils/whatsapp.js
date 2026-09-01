// src/utils/whatsapp.js
export async function sendWhatsAppInvoice(phone, invoice, storeName = 'Smart Store') {
  if (!phone) {
    alert('Please enter customer phone number.');
    return;
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const itemsText = invoice.items
    .map((item) => `• ${item.name} (${item.qty} ${item.unit || 'pcs'}) - Rs. ${item.line_total.toFixed(2)}`)
    .join('%0A');

  let taxBreakdown = `*Tax/GST:* Rs. ${invoice.tax_total.toFixed(2)}%0A`;
  if (invoice.is_gst_bill && invoice.tax_total > 0) {
    const halfTax = (invoice.tax_total / 2).toFixed(2);
    taxBreakdown = `*CGST:* Rs. ${halfTax}%0A*SGST:* Rs. ${halfTax}%0A`;
  }

  let creditText = '';
  if (invoice.is_credit) {
    creditText = `*Paid Amount:* Rs. ${(invoice.paid_amount || 0).toFixed(2)}%0A` +
                 `*Balance Due (Udhaar):* Rs. ${(invoice.due_amount || 0).toFixed(2)}%0A`;
  }

  const message = `*INVOICE: ${invoice.invoice_number}*%0A` +
    `*${storeName}*%0A` +
    `Customer: ${invoice.customer_name || 'Valued Customer'}%0A` +
    `Payment Mode: ${invoice.payment_mode || 'CASH'}%0A` +
    `--------------------------%0A` +
    itemsText + `%0A` +
    `--------------------------%0A` +
    `*Subtotal:* Rs. ${invoice.subtotal.toFixed(2)}%0A` +
    `*Discount:* Rs. ${invoice.discount_total.toFixed(2)}%0A` +
    taxBreakdown +
    `*Grand Total:* Rs. ${invoice.grand_total.toFixed(2)}%0A` +
    creditText +
    `--------------------------%0A` +
    `Thank you for shopping with us!`;

  const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;

  if (window.api?.shell?.openExternal) {
    await window.api.shell.openExternal(waUrl);
  } else {
    window.open(waUrl, '_blank');
  }
}