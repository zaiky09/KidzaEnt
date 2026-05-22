const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { verifyToken } = require('../middleware/authMiddleware');
const { initiateStkPush, parseCallback } = require('../utils/daraja');
const { sendReceiptEmail } = require('../utils/receiptEmail');

// 1. Customer initiates M-Pesa STK Push for an existing pending order.
// The frontend creates the order first via POST /api/orders, then calls this
// to actually trigger payment. We accept the orderId in the body.
router.post('/stk-push', verifyToken, async (req, res) => {
  try {
    const { orderId, phone } = req.body || {};
    if (!orderId) return res.status(400).json({ message: 'orderId is required.' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not your order.' });
    }
    if (order.paymentStatus === 'completed') {
      return res.status(409).json({ message: 'Order already paid.' });
    }

    const phoneToUse = phone || order.customerPhone;
    const result = await initiateStkPush({
      phone: phoneToUse,
      amount: order.totalPrice,
      reference: `KZ${order._id.toString().slice(-6).toUpperCase()}`,
      description: 'Kidza order'
    });

    order.mpesaCheckoutRequestId = result.checkoutRequestId;
    order.mpesaMerchantRequestId = result.merchantRequestId;
    order.paymentMethod = 'mpesa_upfront';
    order.paymentStatus = 'pending';
    await order.save();

    res.json({
      checkoutRequestId: result.checkoutRequestId,
      customerMessage: result.customerMessage
    });
  } catch (err) {
    console.error('STK push error:', err.message, err.daraja || '');
    res.status(502).json({ message: err.message || 'Failed to initiate M-Pesa payment.' });
  }
});

// 2. Safaricom's callback. PUBLIC (no auth) — Safaricom doesn't send a JWT.
// Idempotent: receiving the same CheckoutRequestID twice has no extra effect.
router.post('/callback', async (req, res) => {
  try {
    const parsed = parseCallback(req.body);
    if (!parsed) {
      console.warn('Daraja callback with unexpected shape:', JSON.stringify(req.body));
      // Safaricom expects a 200 even on parse failures, or it will keep retrying.
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const order = await Order.findOne({ mpesaCheckoutRequestId: parsed.checkoutRequestId });
    if (!order) {
      console.warn('Daraja callback for unknown CheckoutRequestID:', parsed.checkoutRequestId);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (order.paymentStatus === 'completed') {
      // Already processed — Safaricom sometimes retries. Idempotent ack.
      return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    let sendReceipt = false;
    if (parsed.success) {
      order.paymentStatus = 'completed';
      order.mpesaReceiptNumber = parsed.receiptNumber;
      order.mpesaResultDesc = parsed.resultDesc;
      sendReceipt = true;
    } else {
      order.paymentStatus = 'failed';
      order.mpesaResultDesc = parsed.resultDesc;
    }
    await order.save();

    // Acknowledge Safaricom first, then send the receipt in the background.
    // sendReceiptEmail is fire-and-forget — if email is down, the payment
    // record on our side is still committed.
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    if (sendReceipt) {
      // Fire-and-forget — payment already saved, receipt is best-effort.
      // Errors logged so they're visible in Render logs; not awaited so we
      // don't make Safaricom wait on SMTP.
      Order.findById(order._id)
        .populate('items.item', 'name price')
        .populate('customerId', 'username email')
        .then((populated) => sendReceiptEmail(populated))
        .catch((err) => console.error('[receipt] auto-send failed:', err.message, err.stack));
    }
  } catch (err) {
    console.error('Daraja callback handler error:', err);
    // Still 200 — anything else triggers retries.
    res.json({ ResultCode: 0, ResultDesc: 'Accepted (error logged)' });
  }
});

// 4. Resend the receipt for a paid order. Useful when the original email
// went to spam or never sent (best-effort failure on first try). Either
// the order's owner or any admin can trigger.
router.post('/:orderId/receipt/resend', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('items.item', 'name price')
      .populate('customerId', 'username email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const isOwner = order.customerId?._id?.toString() === req.user.userId;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your order.' });
    }
    if (order.paymentStatus !== 'completed') {
      return res.status(400).json({ message: 'Receipts are only sent for completed payments.' });
    }
    if (!order.customerId?.email) {
      return res.status(400).json({ message: 'No email on file for this customer.' });
    }

    // Await this one so we surface email errors to the user instead of
    // swallowing them like the post-callback path does.
    await sendReceiptEmail(order);
    res.json({ message: `Receipt resent to ${order.customerId.email}.` });
  } catch (err) {
    console.error('Resend receipt error:', err);
    res.status(500).json({ message: err.message || 'Failed to send receipt.' });
  }
});

// 3. Frontend polls this while waiting for Safaricom's callback to land.
router.get('/status/:checkoutRequestId', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ mpesaCheckoutRequestId: req.params.checkoutRequestId });
    if (!order) return res.status(404).json({ message: 'Unknown checkout request.' });
    if (order.customerId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    res.json({
      paymentStatus: order.paymentStatus,
      receiptNumber: order.mpesaReceiptNumber,
      resultDesc: order.mpesaResultDesc,
      orderId: order._id
    });
  } catch (err) {
    console.error('Payment status fetch error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
