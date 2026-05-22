// Builds a Kidza-styled PDF receipt for a paid order. Returns the binary
// content as a Buffer (no temp files needed — we attach it to email and
// stream it to Mongo/storage if we ever need to keep copies).
//
// Layout: A4, single-column. Brand bar at top, order metadata block, then
// the items table, totals, and an M-Pesa confirmation footer.

const PDFDocument = require('pdfkit');

const KIDZA_GOLD = '#FFD700';
const KIDZA_DARK = '#111827';
const MUTED = '#6B7280';
const LIGHT_LINE = '#E5E7EB';

/**
 * @param {object} order — a populated Order document (items.item resolved)
 * @returns {Promise<Buffer>}
 */
function buildReceiptPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Brand bar
    doc.rect(0, 0, doc.page.width, 90).fill(KIDZA_DARK);
    doc.fillColor(KIDZA_GOLD).fontSize(28).font('Helvetica-Bold').text('KIDZA', 40, 30);
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica').text('Marketplace Receipt', 40, 62);

    doc.fillColor(KIDZA_DARK);

    // Order metadata
    let y = 120;
    const shortId = '#' + order._id.toString().slice(-6).toUpperCase();
    doc.fontSize(20).font('Helvetica-Bold').text(`Order ${shortId}`, 40, y);
    y += 28;

    const meta = [
      ['Date',           new Date(order.createdAt).toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'short' })],
      ['Customer phone', order.customerPhone || '—'],
      ['Delivery to',    order.deliveryAddress || '—'],
      ['Expected by',    order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-KE', { dateStyle: 'long' }) : '—'],
      ['Payment',        order.paymentMethod === 'mpesa_upfront' ? 'M-Pesa (paid)' : 'Pay on delivery'],
      ['M-Pesa receipt', order.mpesaReceiptNumber || '—']
    ];
    doc.fontSize(10);
    for (const [label, value] of meta) {
      doc.font('Helvetica-Bold').fillColor(MUTED).text(label, 40, y, { continued: false });
      doc.font('Helvetica').fillColor(KIDZA_DARK).text(value, 160, y);
      y += 18;
    }

    // Items table
    y += 16;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(KIDZA_DARK).text('Items', 40, y);
    y += 18;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor(LIGHT_LINE).stroke();
    y += 8;

    // Column headers
    doc.fontSize(9).font('Helvetica-Bold').fillColor(MUTED);
    doc.text('ITEM', 40, y);
    doc.text('QTY', 350, y, { width: 50, align: 'right' });
    doc.text('PRICE', 410, y, { width: 70, align: 'right' });
    doc.text('SUBTOTAL', 490, y, { width: 70, align: 'right' });
    y += 14;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor(LIGHT_LINE).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(10).fillColor(KIDZA_DARK);
    for (const line of order.items || []) {
      const it = line.item;
      const name = it?.name || '(item removed)';
      const qty = line.quantity;
      const price = it?.price || 0;
      const subtotal = price * qty;
      doc.text(name, 40, y, { width: 300 });
      doc.text(String(qty), 350, y, { width: 50, align: 'right' });
      doc.text(`KES ${price.toFixed(2)}`, 410, y, { width: 70, align: 'right' });
      doc.text(`KES ${subtotal.toFixed(2)}`, 490, y, { width: 70, align: 'right' });
      y += 18;
    }

    // Totals — itemized when we have a breakdown.
    y += 8;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor(LIGHT_LINE).stroke();
    y += 10;

    const subtotal = order.itemSubtotal ?? (order.totalPrice || 0);
    const delivery = order.deliveryFee || 0;

    doc.font('Helvetica').fontSize(10).fillColor(MUTED);
    doc.text('Subtotal', 410, y, { width: 70, align: 'right' });
    doc.text(`KES ${subtotal.toFixed(2)}`, 490, y, { width: 70, align: 'right' });
    y += 14;

    doc.text(
      order.distanceKm != null ? `Delivery (${order.distanceKm.toFixed(1)} km)` : 'Delivery',
      410, y, { width: 70, align: 'right' }
    );
    doc.text(delivery === 0 ? 'FREE' : `KES ${delivery.toFixed(2)}`, 490, y, { width: 70, align: 'right' });
    y += 16;

    doc.font('Helvetica-Bold').fontSize(12).fillColor(KIDZA_DARK).text('TOTAL', 410, y, { width: 70, align: 'right' });
    doc.text(`KES ${(order.totalPrice || 0).toFixed(2)}`, 490, y, { width: 70, align: 'right' });

    // Footer
    const footerY = doc.page.height - 80;
    doc.fontSize(9).font('Helvetica').fillColor(MUTED)
       .text('Thank you for shopping with Kidza Enterprise Ltd.', 40, footerY, { align: 'center', width: doc.page.width - 80 })
       .text('Questions? Reply to this email or contact kidzaltd@gmail.com', 40, footerY + 14, { align: 'center', width: doc.page.width - 80 });

    doc.end();
  });
}

module.exports = { buildReceiptPdf };
