export function sendWhatsAppInvoice(phone, invoice) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const itemsText = invoice.items
    .map((item) => `• ${item.name} (x${item.qty}) - ₹${item.line_total.toFixed(2)}`)
    .join('%0A');

  const message = `*INVOICE: ${invoice.invoice_number}*%0A` +
    `Customer: ${invoice.customer_name || 'Guest'}%0A` +
    `--------------------------%0A` +
    itemsText + `%0A` +
    `--------------------------%0A` +
    `*Subtotal:* ₹${invoice.subtotal.toFixed(2)}%0A` +
    `*Discount:* ₹${invoice.discount_total.toFixed(2)}%0A` +
    `*Tax/GST:* ₹${invoice.tax_total.toFixed(2)}%0A` +
    `*Grand Total:* ₹${invoice.grand_total.toFixed(2)}%0A%0A` +
    `Thank you for shopping with us!`;

  window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank');
}