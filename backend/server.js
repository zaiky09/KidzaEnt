//Purpose: Main entry point for the backend server

//1. Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Alows us to use variables from the .env file

//Imports for real-time tracking
const http = require('http');
const { Server } = require('socket.io');

//2. Initialize the Express application
const app = express();

//3. Apply Middleware
//CORS allow your frontend to communicate with this backend safely
app.use(cors());
//This allows the server to read inoming  JSON data from requests
app.use(express.json());

//4. Set up server and Socket.io for live tracking
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // In production, we will restrict this to your actual app domains
        methods: ["GET", "POST"]
    }
});

// Listen for live connections from the driver or customer apps
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // 1. Customer joins a "room" to listen for updates on a specific order
  socket.on('join_order_room', (orderId) => {
    socket.join(orderId);
    console.log(`User joined tracking room for order: ${orderId}`);
  });

  // 2. Driver continuously sends their live GPS location for an order
  socket.on('driver_location_update', (data) => {
    const { orderId, location } = data; // location contains { lat, lng }
    
    // 3. Server broadcasts this location ONLY to the customer in that specific room
    io.to(orderId).emit('receive_location_update', location);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// 5. Connect to MongoDB using Mongoose
// NEW: Added robust connection options and forced IPv4 (family: 4)
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, 
  socketTimeoutMS: 45000,         
  family: 4 // THIS IS THE MAGIC TRICK! Forces IPv4 routing.
})
.then(() => {
   console.log('Successfully connected to MongoDB 🚀');


   // Clean up old index if it exists (ignore errors)
   mongoose.connection.collection('users').dropIndex('emailOrPhone_1')
   .then(() => console.log('Old index cleanup completed'))
   .catch(() => console.log('No old index to clean up, moving on.'));
})
.catch((err) => {
   console.error('❌ Error connecting to the database:', err.message);
});

//6. Define a simple test route
//Import the auth routes
const authRoutes = require('./routes/auth');

//Tell Express to use them
app.use('/api/auth', authRoutes);
app.get('/', (req, res) => {
    res.send('Welcome to the Marketplace API!');
});

//Import the catalog routes
const catalogRoutes = require('./routes/catalog');

//Tell Express to use them
app.use('/api/catalog', catalogRoutes);

//Import the orders routes
const ordersRoutes = require('./routes/orders');
//Import the user management routes
const usersRoutes = require('./routes/users');

//Tell Express to use them
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);

//NEW: The AI Route
app.use('/api/ai', require('./routes/ai'));

//7. Start the server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});