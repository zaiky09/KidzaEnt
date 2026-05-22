// Sends a paid-order receipt to the customer. Uses the same Gmail
// transporter that's already configured in routes/auth.js — we re-create
// it here so payments.js doesn't need to import from auth.js.

const nodemailer = require('nodemailer');
const { buildReceiptPdf } = require('./receiptPdf');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

/**
 * Generate the PDF receipt for `order` and email it to the customer.
 * Pre-populated Order document expected: `customerId` populated (or at
 * least with `email`), and `items.item` populated.
 *
 * Failure-tolerant: errors are logged but don't throw, so a temporary
 * Gmail outage doesn't break the payment callback handler.
 */
async function sendReceiptEmail(order) {
  try {
    const email = order.customerId?.email;
    if (!email) {
      console.warn('[receipt] No customer email on order', order._id.toString());
      return;
    }
    const username = order.customerId?.username || 'there';
    const shortId = '#' + order._id.toString().slice(-6).toUpperCase();
    const pdf = await buildReceiptPdf(order);

    await transporter.sendMail({
      to: email,
      from: `"Kidza Marketplace" <${process.env.EMAIL_USER}>`,
      subject: `Receipt for order ${shortId}`,
      html: `
        <p>Hi ${username},</p>
        <p>Thanks for shopping with Kidza! Your payment for order <strong>${shortId}</strong> was received.</p>
        <p>We've attached a PDF receipt. You'll get another note when your order is on the way.</p>
        <p><strong>Amount paid:</strong> KES ${(order.totalPrice || 0).toFixed(2)}<br/>
        <strong>M-Pesa receipt:</strong> ${order.mpesaReceiptNumber || '—'}</p>
        <p style="color:#6B7280;font-size:13px;">If you didn't make this order, reply to this email immediately.</p>
      `,
      attachments: [
        { filename: `kidza-receipt-${shortId.replace('#', '')}.pdf`, content: pdf }
      ]
    });
    console.log('[receipt] sent to', email, 'for order', shortId);
  } catch (err) {
    console.error('[receipt] failed to send:', err.message);
    // Intentionally swallow — payment is already recorded; receipt is best-effort.
  }
}

module.exports = { sendReceiptEmail };
