// src/utils/whatsapp.js
export async function sendWhatsAppInvoice(phone, invoice, storeName = 'Smart Store') {
  if (!phone) {
    alert('Please enter customer phone number.');
    return;
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const itemsText = invoice.items
    .map((item) => `• ${item.name} (x${item.qty}) - Rs. ${item.line_total.toFixed(2)}`)
    .join('%0A');

  const message = `*INVOICE: ${invoice.invoice_number}*%0A` +
    `*${storeName}*%0A` +
    `Customer: ${invoice.customer_name || 'Valued Customer'}%0A` +
    `--------------------------%0A` +
    itemsText + `%0A` +
    `--------------------------%0A` +
    `*Subtotal:* Rs. ${invoice.subtotal.toFixed(2)}%0A` +
    `*Discount:* Rs. ${invoice.discount_total.toFixed(2)}%0A` +
    `*Tax/GST:* Rs. ${invoice.tax_total.toFixed(2)}%0A` +
    `*Grand Total:* Rs. ${invoice.grand_total.toFixed(2)}%0A%0A` +
    `Thank you for shopping with us!`;

  const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;

  if (window.api?.shell?.openExternal) {
    await window.api.shell.openExternal(waUrl);
  } else {
    window.open(waUrl, '_blank');
  }
}