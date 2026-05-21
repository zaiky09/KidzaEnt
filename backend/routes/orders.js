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

    let grandTotal = 0;
    let totalWeight = 0;

    for (let cartItem of items) {
      const catalogItem = await CatalogItem.findById(cartItem.item);
      if (catalogItem) {
        grandTotal += catalogItem.price * cartItem.quantity;
        if (catalogItem.type === 'product') {
          totalWeight += catalogItem.weightPerItemKg * cartItem.quantity;
        }
      }
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
    res.status(500).json({ message: 'Server error placing order.' });
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


