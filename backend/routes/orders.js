const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const CatalogItem = require('../models/CatalogItem');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');

// Which status transitions each role is allowed to perform.
const ALLOWED_TRANSITIONS = {
  driver:   { pending: ['accepted_by_driver'], accepted_by_driver: ['in_transit'], in_transit: ['delivered'] },
  admin:    { pending: ['accepted_by_driver', 'in_transit', 'delivered', 'cancelled'],
              accepted_by_driver: ['in_transit', 'delivered', 'cancelled'],
              in_transit: ['delivered', 'cancelled'] },
  customer: {} // customers use /cancel instead
};

router.post('/', verifyToken, async (req, res) => {
  try {
    const { items, expectedDeliveryDate, deliveryAddress, customerPhone, dropoffLat, dropoffLng } = req.body;

    // Validate upfront so we return a clear 400 instead of a Mongoose ValidationError as a 500.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }
    if (typeof dropoffLat !== 'number' || typeof dropoffLng !== 'number') {
      return res.status(400).json({ message: 'Dropoff coordinates are required. Use the address autocomplete or "Get My Location".' });
    }
    if (!deliveryAddress || !customerPhone || !expectedDeliveryDate) {
      return res.status(400).json({ message: 'Address, phone, and delivery date are all required.' });
    }

    let grandTotal = 0;
    let totalWeight = 0;
    const missing = [];

    for (const cartItem of items) {
      const catalogItem = await CatalogItem.findById(cartItem.item);
      if (!catalogItem) {
        missing.push(cartItem.item);
        continue;
      }
      const qty = Number(cartItem.quantity) || 0;
      grandTotal += catalogItem.price * qty;
      // weightPerItemKg may be undefined on services or older items — treat as 0.
      if (catalogItem.type === 'product') {
        totalWeight += (Number(catalogItem.weightPerItemKg) || 0) * qty;
      }
    }
    if (missing.length) {
      return res.status(400).json({ message: 'Some cart items no longer exist. Clear the cart and try again.', missing });
    }

    const newOrder = new Order({
      customerId: req.user.userId,
      items,
      expectedDeliveryDate,
      deliveryAddress,
      customerPhone,
      dropoffLat,
      dropoffLng,
      totalPrice: grandTotal,
      totalWeightKg: totalWeight
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    // Log the real error so we can debug from Render logs.
    console.error('Order placement error:', error);

    // Mongoose ValidationError → 400 with the offending fields, not a generic 500.
    if (error.name === 'ValidationError') {
      const fields = Object.keys(error.errors || {});
      return res.status(400).json({
        message: 'Order validation failed.',
        fields,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
    res.status(500).json({
      message: 'Server error placing order.',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    let orders;
    
    // CUSTOMERS: No approval needed!
    if (req.user.role === 'customer') {
      orders = await Order.find({ customerId: req.user.userId })
        .populate('items.item')
        .populate('driverId', 'username phone driverDetails'); 
    }
    // DRIVERS: Approval IS needed.
    else if (req.user.role === 'driver') {
      const driver = await User.findById(req.user.userId);
      
      if (!driver || !driver.isApproved) {
        return res.status(403).json({ 
          message: 'Account pending admin approval.',
          needsProfile: !driver?.isProfileComplete 
        });
      }


      orders = await Order.find({
        $or: [{ status: 'pending', driverId: null }, { driverId: req.user.userId }]
      })
      .populate('items.item')
      .populate('customerId', 'username phone');
    }
    else {
      orders = await Order.find().populate('items.item').populate('customerId', 'username phone');
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin can delete orders
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized.' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    await order.deleteOne();
    res.json({ message: 'Order deleted.' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Server error deleting order.' });
  }
});

router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const { role, userId } = req.user;
    const nextStatus = req.body.status;

    // Conflict-first: a driver trying to accept an order that's already been
    // claimed by another driver gets a precise 409, not a generic 403.
    if (role === 'driver' && nextStatus === 'accepted_by_driver' && order.driverId) {
      return res.status(409).json({ message: 'Order already accepted by another driver.' });
    }

    // 1. Is the requested transition allowed for this role at all?
    const allowed = (ALLOWED_TRANSITIONS[role] || {})[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      return res.status(403).json({ message: 'Not allowed to perform this transition.' });
    }

    // 2. Drivers may only act on orders that are unassigned (to accept) or assigned to them.
    if (role === 'driver') {
      if (nextStatus === 'accepted_by_driver') {
        order.driverId = userId;
      } else if (order.driverId?.toString() !== userId) {
        return res.status(403).json({ message: 'You are not assigned to this order.' });
      }
    }

    order.status = nextStatus;
    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating status.' });
  }
});

router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Allow customers to cancel their own pending orders, or allow admin to cancel any order
    if (req.user.role !== 'admin' && order.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (order.status !== 'pending') return res.status(400).json({ message: 'Cannot cancel now.' });

    order.status = 'cancelled';
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error cancelling.' });
  }
});

module.exports = router;


