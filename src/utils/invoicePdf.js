// src/utils/invoicePdf.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateInvoicePDF(invoice, storeInfo = {}) {
  const shopName = storeInfo.shop_name || 'Smart Store';
  const phone = storeInfo.phone || '';
  const address = storeInfo.address || '';
  const gstin = storeInfo.gstin || '';
  const footerNote = storeInfo.receipt_footer || 'Thank you for shopping with us!';

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 260]
  });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName.toUpperCase(), 40, 9, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  let currentY = 13;

  if (address) {
    doc.text(address, 40, currentY, { align: 'center', maxWidth: 72 });
    currentY += 4;
  }
  if (phone) {
    doc.text(`Phone: ${phone}`, 40, currentY, { align: 'center' });
    currentY += 4;
  }
  if (gstin) {
    doc.text(`GSTIN: ${gstin}`, 40, currentY, { align: 'center' });
    currentY += 4;
  }

  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.is_gst_bill ? 'TAX INVOICE (GST)' : 'RETAIL INVOICE / CASH MEMO', 40, currentY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  currentY += 4;

  doc.text(`Invoice No: ${invoice.invoice_number}`, 4, currentY);
  currentY += 3.5;
  doc.text(`Date: ${new Date().toLocaleString()}`, 4, currentY);
  currentY += 3.5;

  if (invoice.customer_name || invoice.customer_phone) {
    doc.text(`Customer: ${invoice.customer_name || 'Walk-in'} (${invoice.customer_phone || 'N/A'})`, 4, currentY);
    currentY += 3.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Mode: ${invoice.payment_mode || 'CASH'}`, 4, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 3.5;

  // Items Table
  const tableRows = invoice.items.map((item, idx) => [
    `${idx + 1}. ${item.name}`,
    `${item.qty} ${item.unit || 'pcs'}`,
    `Rs.${item.selling_price}`,
    item.discount ? `-Rs.${item.discount}` : '0',
    item.line_total.toFixed(2)
  ]);

  autoTable(doc, {
    startY: currentY + 1,
    head: [['Item', 'Qty', 'Rate', 'Disc', 'Total']],
    body: tableRows,
    theme: 'plain',
    styles: { fontSize: 6.8, cellPadding: 1 },
    headStyles: { fontStyle: 'bold', borderBottom: 0.1 },
    margin: { left: 4, right: 4 }
  });

  let finalY = doc.lastAutoTable.finalY + 3;
  doc.line(4, finalY, 76, finalY);

  doc.setFontSize(7.5);
  doc.text(`Subtotal:`, 4, finalY + 4);
  doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, 76, finalY + 4, { align: 'right' });

  doc.text(`Total Discount:`, 4, finalY + 7.5);
  doc.text(`- Rs. ${invoice.discount_total.toFixed(2)}`, 76, finalY + 7.5, { align: 'right' });

  // GST Breakdown (CGST + SGST) if enabled
  if (invoice.is_gst_bill && invoice.tax_total > 0) {
    const halfTax = (invoice.tax_total / 2).toFixed(2);
    doc.text(`CGST:`, 4, finalY + 11);
    doc.text(`Rs. ${halfTax}`, 76, finalY + 11, { align: 'right' });

    doc.text(`SGST:`, 4, finalY + 14.5);
    doc.text(`Rs. ${halfTax}`, 76, finalY + 14.5, { align: 'right' });
    finalY += 7;
  } else {
    doc.text(`Tax / GST:`, 4, finalY + 11);
    doc.text(`Rs. ${invoice.tax_total.toFixed(2)}`, 76, finalY + 11, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Grand Total:`, 4, finalY + 16);
  doc.text(`Rs. ${invoice.grand_total.toFixed(2)}`, 76, finalY + 16, { align: 'right' });

  // Udhaar / Credit Breakdown
  if (invoice.is_credit) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paid Amount:`, 4, finalY + 20.5);
    doc.text(`Rs. ${(invoice.paid_amount || 0).toFixed(2)}`, 76, finalY + 20.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`Balance Due (Udhaar):`, 4, finalY + 24);
    doc.text(`Rs. ${(invoice.due_amount || 0).toFixed(2)}`, 76, finalY + 24, { align: 'right' });
    finalY += 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(footerNote, 40, finalY + 24, { align: 'center' });

  doc.save(`${invoice.invoice_number}.pdf`);
}