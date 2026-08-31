import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateInvoicePDF(invoice) {
  // 80mm thermal roll format (width: 80mm, custom calculated height)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200]
  });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SMART STORE', 40, 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Retail Invoice / Cash Memo', 40, 15, { align: 'center' });
  doc.text(`Inv: ${invoice.invoice_number}`, 5, 22);
  doc.text(`Date: ${new Date().toLocaleString()}`, 5, 26);
  if (invoice.customer_phone) {
    doc.text(`Customer: ${invoice.customer_phone}`, 5, 30);
  }

  const tableRows = invoice.items.map((item) => [
    item.name,
    item.qty,
    item.selling_price,
    item.line_total.toFixed(2)
  ]);

  autoTable(doc, {
    startY: invoice.customer_phone ? 33 : 29,
    head: [['Item', 'Qty', 'Rate', 'Total']],
    body: tableRows,
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fontStyle: 'bold', borderBottom: 0.1 },
    margin: { left: 4, right: 4 }
  });

  const finalY = doc.lastAutoTable.finalY + 4;
  doc.line(4, finalY, 76, finalY);
  
  doc.setFontSize(8);
  doc.text(`Subtotal:`, 4, finalY + 5);
  doc.text(`INR ${invoice.subtotal.toFixed(2)}`, 76, finalY + 5, { align: 'right' });

  doc.text(`Discount:`, 4, finalY + 9);
  doc.text(`- INR ${invoice.discount_total.toFixed(2)}`, 76, finalY + 9, { align: 'right' });

  doc.text(`Tax:`, 4, finalY + 13);
  doc.text(`INR ${invoice.tax_total.toFixed(2)}`, 76, finalY + 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total:`, 4, finalY + 18);
  doc.text(`INR ${invoice.grand_total.toFixed(2)}`, 76, finalY + 18, { align: 'right' });

  doc.save(`${invoice.invoice_number}.pdf`);
}