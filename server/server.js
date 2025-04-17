const express = require("express");
const cors = require('cors');
const router = require("./router/router");
const openCollection = require("./database/databaseConnection");
require('dotenv').config({ path: './config.env' });

const app = express();

// Parse incoming JSON data
app.use(express.json());

// Enable CORS
app.use(cors());
app.use('/api/payment', require('./router/paymentRoutes'));
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

// Call openCollection with the desired collection name
const collectionName = "Tourism"; // Replace 'your_collection_name' with the actual collection name
openCollection(collectionName)
  .then(collection => {
    // Now you have the collection object, and you can perform operations on it
    // For example, you can query the collection
    collection.findOne({}).then(result => {
      console.log("Result from the database:", result);
    });
    
    // Also ensure we have access to the Booking collection
    const Booking = require('./models/bookingModel');
    console.log("Booking model loaded successfully");
  })
  .catch(error => {
    console.error("Error:", error);
  });

// Set environment variables
const PORT = process.env.PORT || 8000;
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set, using default'}`);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});