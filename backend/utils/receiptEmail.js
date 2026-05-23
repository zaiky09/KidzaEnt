// Sends a paid-order receipt to the customer. Uses the shared mailer
// transporter (utils/mailer.js) so we don't open a separate SMTP pool.

const { buildReceiptPdf } = require('./receiptPdf');
const { getTransporter } = require('./mailer');
const { supportFooterHtml } = require('./contact');

const transporter = getTransporter();

/**
 * Generate the PDF receipt for `order` and email it to the customer.
 * Pre-populated Order document expected: `customerId` populated (or at
 * least with `email`), and `items.item` populated.
 *
 * Throws on failure. Callers that want fire-and-forget semantics (the
 * Daraja callback handler) must wrap in their own try/catch.
 */
async function sendReceiptEmail(order) {
  const email = order.customerId?.email;
  if (!email) {
    throw new Error(`No email on file for order ${order._id}`);
  }
  const username = order.customerId?.username || 'there';
  const shortId = '#' + order._id.toString().slice(-6).toUpperCase();
  const pdf = await buildReceiptPdf(order);

  const info = await transporter.sendMail({
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
      ${supportFooterHtml()}
    `,
    attachments: [
      { filename: `kidza-receipt-${shortId.replace('#', '')}.pdf`, content: pdf }
    ]
  });
  console.log('[receipt] sent to', email, 'for order', shortId, '— smtp accepted:', info.accepted);
  return info;
}

module.exports = { sendReceiptEmail };
