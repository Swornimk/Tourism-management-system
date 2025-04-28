const express = require("express");
const cors = require('cors');
const router = require("./router/router");
const clerkRoutes = require('./router/clerkRoutes');
const { MongoClient } = require('mongodb');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Update with your client's origin in production
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

// Parse incoming JSON data
app.use(express.json());

// Enable CORS
app.use(cors());
app.use('/api/payment', require('./router/paymentRoutes'));
app.use('/clerk', clerkRoutes);

// Connect to MongoDB
const uri = "mongodb+srv://subarna:Subarna123@cluster0.yu7zxbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(uri, { useUnifiedTopology: true });
    console.log("Connected to MongoDB");
    
    // Make database connection available to routes
    app.locals.db = client.db("tourism");
    
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Authentication data can be accessed from socket.handshake.auth
  const authToken = socket.handshake.auth.token || socket.handshake.query.token;
  let userId = null;
  let isAdmin = false;
  
  if (authToken) {
    try {
      // Verify JWT token to get user ID
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      userId = decoded.id;
      isAdmin = decoded.isAdmin || false;
      console.log(`Authenticated user ${userId} connected via WebSocket (admin: ${isAdmin})`);
      
      // Add user to a user-specific room for targeted notifications
      socket.join(`user:${userId}`);
      
      // Store user ID and admin status on the socket for later reference
      socket.userId = userId;
      socket.isAdmin = isAdmin;
      
      // If user is an admin, add them to admin-specific rooms
      if (isAdmin) {
        socket.join('admin:notifications');
        console.log(`Admin user ${userId} joined admin notification channels`);
      }
    } catch (err) {
      console.error('Invalid auth token in WebSocket connection:', err.message);
    }
  }
  
  // Join trip-specific room for real-time updates
  socket.on('joinTrip', (tripId) => {
    // Only allow joining admin rooms if the user is actually an admin
    if (tripId === 'admin:notifications' && !isAdmin) {
      console.log(`Non-admin user attempted to join admin room: ${socket.id}`);
      return;
    }
    
    socket.join(`trip:${tripId}`);
    console.log(`Client ${socket.id} (user: ${userId || 'anonymous'}) joined room for trip: ${tripId}`);
  });
  
  // Leave trip-specific room
  socket.on('leaveTrip', (tripId) => {
    socket.leave(`trip:${tripId}`);
    console.log(`Client ${socket.id} left room for trip: ${tripId}`);
  });
  
  // Handle trip status update events from clients
  socket.on('tripStatusUpdated', (data) => {
    // Verify the data contains necessary information
    if (data && data.tripId && data.status) {
      console.log(`Received trip status update from client ${socket.id} (user: ${socket.userId || 'anonymous'}): Trip ${data.tripId} status changed to ${data.status}`);
      
      // Log which admin user is making the status change 
      if (socket.isAdmin) {
        console.log(`Admin user ${socket.userId} changed trip ${data.tripId} status to ${data.status}`);
      }
      
      // Broadcast to the specific trip room
      io.to(`trip:${data.tripId}`).emit('tripStatusUpdated', data);
      
      // Also broadcast to the user who owns the trip if available
      if (data.creatorUserId) {
        console.log(`Emitting trip status update to creator user: ${data.creatorUserId}`);
        io.to(`user:${data.creatorUserId}`).emit('tripStatusUpdated', data);
      }
      
      // If the status is 'approved', broadcast to trip approvals channel
      if (data.status === 'approved') {
        io.to('trip:approvals').emit('tripApproved', data);
      } else if (data.status === 'rejected') {
        io.to('trip:approvals').emit('tripRejected', data);
      }
      
      // Broadcast a profileUpdate for immediate UI refreshes
      if (data.creatorUserId) {
        io.to(`user:${data.creatorUserId}`).emit('profileUpdate', {
          type: 'tripStatusChanged',
          tripId: data.tripId,
          newStatus: data.status,
          timestamp: data.updatedAt || new Date().toISOString()
        });
      }
    }
  });
  
  // Join global trip approvals channel
  socket.on('joinTripApprovals', () => {
    socket.join('trip:approvals');
    console.log(`Client ${socket.id} (user: ${socket.userId || 'anonymous'}) joined room for trip approvals`);
  });
  
  // Leave global trip approvals channel
  socket.on('leaveTripApprovals', () => {
    socket.leave('trip:approvals');
    console.log(`Client ${socket.id} left room for trip approvals`);
  });
  
  // Disconnect event
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id} (user: ${socket.userId || 'anonymous'})`);
    // If user was authenticated, leave user-specific room
    if (userId) {
      socket.leave(`user:${userId}`);
      // If user was admin, leave admin rooms
      if (isAdmin) {
        socket.leave('admin:notifications');
      }
    }
  });
});

// Make io instance available throughout the app
app.set('io', io);

// Logging middleware for all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  
  if (req.method !== 'GET') {
    console.log('Request body:', req.body);
  }
  
  // Log response
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[${new Date().toISOString()}] Response status: ${res.statusCode}`);
    if (typeof body === 'string' && body.length < 1000) {
      console.log('Response body:', body);
    } else {
      console.log('Response body: [content too large to display]');
    }
    originalSend.call(this, body);
  };
  
  next();
});

// Mount the router to handle specific routes
app.use("/", router);

// Connect to database and start server
connectToDatabase()
  .then(() => {
    // Set environment variables
    const PORT = process.env.PORT || 8000;
    console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set, using default'}`);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server is ready`);
    });
  })
  .catch(error => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  });