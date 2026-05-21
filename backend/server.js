// Server entry point. The Express app lives in app.js; this file wires
// up the http server, Socket.IO, MongoDB connection, and starts listening.

require('dotenv').config();

// Fail fast if required secrets are missing — never fall back to a hardcoded default.
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = require('./app');
const Order = require('./models/Order');

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Authenticate every Socket.IO handshake. Without this anyone could
// subscribe to a customer's live GPS or spoof a driver's location.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized: no token'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Unauthorized: invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id} (userId=${socket.user.userId}, role=${socket.user.role})`);

  // Customer joins a "room" to listen for updates on a specific order.
  // Only the order's customer, its assigned driver, or an admin may join.
  socket.on('join_order_room', async (orderId) => {
    try {
      const order = await Order.findById(orderId).select('customerId driverId');
      if (!order) return;

      const userId = socket.user.userId;
      const isCustomer = order.customerId?.toString() === userId;
      const isAssignedDriver = order.driverId?.toString() === userId;
      const isAdmin = socket.user.role === 'admin';
      if (!isCustomer && !isAssignedDriver && !isAdmin) return;

      socket.join(orderId);
      console.log(`User ${userId} joined tracking room for order: ${orderId}`);
    } catch (err) {
      console.error('join_order_room error:', err.message);
    }
  });

  // Driver continuously sends their live GPS location for an order.
  // Only the assigned driver for that order may emit.
  socket.on('driver_location_update', async (data) => {
    try {
      const { orderId, location } = data || {};
      if (!orderId || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return;

      const order = await Order.findById(orderId).select('driverId status');
      if (!order) return;
      if (order.driverId?.toString() !== socket.user.userId) return;
      if (order.status !== 'in_transit' && order.status !== 'accepted_by_driver') return;

      io.to(orderId).emit('receive_location_update', location);
    } catch (err) {
      console.error('driver_location_update error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(() => {
  console.log('Successfully connected to MongoDB 🚀');
  mongoose.connection.collection('users').dropIndex('emailOrPhone_1')
    .then(() => console.log('Old index cleanup completed'))
    .catch(() => console.log('No old index to clean up, moving on.'));
})
.catch((err) => {
  console.error('❌ Error connecting to the database:', err.message);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
