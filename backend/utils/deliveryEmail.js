// Email sent to the customer when their order is marked 'delivered'.
// Mirrors the receipt-email pattern: own nodemailer transporter, throws on
// failure so callers can decide whether to await or fire-and-forget.

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

/**
 * @param {object} order — Order with `customerId` and `items.item` populated.
 */
async function sendDeliveryConfirmationEmail(order) {
  const email = order.customerId?.email;
  if (!email) throw new Error(`No email on file for order ${order._id}`);

  const username = order.customerId?.username || 'there';
  const shortId = '#' + order._id.toString().slice(-6).toUpperCase();
  const frontendUrl = process.env.FRONTEND_URL || 'https://kidzaent.vercel.app';
  const driverName = order.driverId?.username || 'your Kidza driver';

  const itemsHtml = (order.items || [])
    .map((line) => {
      const name = line.item?.name || '(item)';
      return `<li style="padding:4px 0;">${name} <span style="color:#6B7280;">× ${line.quantity}</span></li>`;
    })
    .join('');

  const info = await transporter.sendMail({
    to: email,
    from: `"Kidza Marketplace" <${process.env.EMAIL_USER}>`,
    subject: `Your order ${shortId} has been delivered 🎉`,
    html: `
      <p>Hi ${username},</p>
      <p>Your Kidza order <strong>${shortId}</strong> has just been marked delivered by ${driverName}.</p>
      <p><strong>What we sent:</strong></p>
      <ul style="margin:0 0 16px 0;padding-left:20px;">${itemsHtml}</ul>
      <p>If everything's fine, you don't need to do anything. If a product is missing or you have a complaint, reply to this email within 24 hours and we'll sort it out.</p>
      <p style="margin-top:24px;">
        <a href="${frontendUrl}/catalog"
           style="display:inline-block;padding:10px 20px;background:#FFD700;color:#111827;text-decoration:none;border-radius:8px;font-weight:700;">Leave a review on the items →</a>
      </p>
      <p style="color:#6B7280;font-size:13px;margin-top:30px;">
        Receipt for this order (PDF): sent separately right after payment.<br/>
        M-Pesa receipt: ${order.mpesaReceiptNumber || '—'}
      </p>
    `
  });

  console.log('[delivery-email] sent to', email, 'for order', shortId, '— smtp accepted:', info.accepted);
  return info;
}

module.exports = { sendDeliveryConfirmationEmail };
