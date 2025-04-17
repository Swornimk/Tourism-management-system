const { Booking } = require('../models/bookingModel');
const { Trip } = require('../models/tripModel');
const axios = require('axios');
const openCollection = require('../database/databaseConnection');
const { ObjectId } = require('mongodb');
const GetIdFromAccessToken = require("../helpers/authHelper").GetIdFromAccessToken;

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    console.log('Create booking request body:', req.body);
    
    // Get the trip ID from the request body
    let { tripId, numberOfPeople, userId } = req.body;
    
    // Try to get userId from auth token if available
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const tokenUserId = GetIdFromAccessToken(req);
        if (tokenUserId) {
          console.log('User authenticated, using ID from token:', tokenUserId);
          userId = tokenUserId;
        }
      }
    } catch (error) {
      console.error('Failed to extract user ID from token:', error.message);
    }
    
    // Fallback if no userId is found
    if (!userId) {
      console.log('No authentication or userId provided, using guest-user');
      userId = 'guest-user';
    }
    
    if (!tripId) {
      console.error('Missing tripId in booking creation');
      return res.status(400).json({
        success: false,
        message: 'Trip ID is required'
      });
    }
    
    if (!numberOfPeople || numberOfPeople < 1) {
      console.error('Invalid numberOfPeople in booking creation:', numberOfPeople);
      return res.status(400).json({
        success: false,
        message: 'Valid number of people is required'
      });
    }
    
    // Get database collection - note lowercase collection names
    const bookingCollection = await openCollection('bookings');
    const tripCollection = await openCollection('trips');

    // Clean up tripId (remove any quotes or extra spaces)
    if (typeof tripId === 'string') {
      tripId = tripId.replace(/['"]/g, '').trim();
    }

    // Convert to ObjectId for MongoDB query
    let tripObjectId;
    try {
      tripObjectId = new ObjectId(tripId);
    } catch (error) {
      console.error('Invalid trip ID format:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID format'
      });
    }

    // First, try to find ONE TRIP to understand the structure
    const anyTrip = await tripCollection.findOne({});
    console.log('Sample trip from database:', anyTrip ? 
      JSON.stringify({
        id: anyTrip.id,
        _id: anyTrip._id,
        title: anyTrip.title
      }) : 'No trips found');
    
    // Try different query approaches
    let trip;
    
    // Approach 1: Standard MongoDB _id lookup
    trip = await tripCollection.findOne({ _id: tripObjectId });
    console.log('Lookup by _id result:', trip ? 'Found' : 'Not found');
    
    // Approach 2: Using string comparison for ObjectIds
    if (!trip) {
      console.log('Trying alternative approach with all trips...');
      const allTrips = await tripCollection.find({}).toArray();
      console.log(`Found ${allTrips.length} trips, checking each...`);
      
      for (const t of allTrips) {
        console.log(`Comparing trip: ${t._id} (${typeof t._id}) with: ${tripId} (${typeof tripId})`);
        
        // Convert both to strings for comparison
        const idString = t._id.toString();
        if (idString === tripId) {
          console.log('Match found!');
          trip = t;
          break;
        }
      }
    }
    
    if (!trip) {
      console.error('Trip not found for ID:', tripId);
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    console.log('Trip found:', trip.title);
    
    // Calculate total amount
    const totalAmount = trip.price * numberOfPeople;
    console.log('Calculated total amount:', totalAmount);

    // Create booking record with pending payment status
    const booking = new Booking(
      userId, // Use userId from auth token or request body
      tripId,
      numberOfPeople,
      totalAmount
    );

    // Insert booking into collection
    const result = await bookingCollection.insertOne(booking);
    console.log('Booking inserted with ID:', result.insertedId);

    // Return booking details with payment information
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully, proceed to payment'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
};

// Get all bookings for a user
exports.getUserBookings = async (req, res) => {
  try {
    // Extract userId from token instead of query parameters
    let userId;
    
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        userId = GetIdFromAccessToken(req);
        console.log('Extracted user ID from token:', userId);
      }
    } catch (error) {
      console.error('Failed to extract user ID from token:', error.message);
    }
    
    // Fallback to query parameter if token extraction fails
    if (!userId) {
      userId = req.query.userId;
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Get database collection
    const bookingCollection = await openCollection('bookings');
    const tripCollection = await openCollection('trips');

    // Find user bookings - don't convert userId to ObjectId since it might be 'anonymous'
    const bookings = await bookingCollection.find({ userId }).toArray();
    
    // Populate trip details for each booking
    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const trip = await tripCollection.findOne({ _id: new ObjectId(booking.tripId) });
          return {
            ...booking,
            tripDetails: trip ? {
              title: trip.title,
              location: trip.location,
              price: trip.price,
              tripImageUrl: trip.tripImageUrl,
              duration: trip.endDate && trip.startDate ? 
                Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)) : null
            } : null
          };
        } catch (error) {
          console.error(`Error populating trip details for booking ${booking._id}:`, error);
          return booking; // Return booking without trip details on error
        }
      })
    );

    res.status(200).json({
      success: true,
      count: populatedBookings.length,
      data: populatedBookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

// Get all bookings (admin only)
exports.getAllBookings = async (req, res) => {
  try {
    // Get database collections
    const bookingCollection = await openCollection('bookings');
    const userCollection = await openCollection('users');
    const tripCollection = await openCollection('trips');

    // Find all bookings
    const bookings = await bookingCollection.find({}).toArray();
    
    // Populate user and trip details
    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        try {
          // Don't convert userId to ObjectId if it's 'anonymous'
          const isAnonymousUser = booking.userId === 'anonymous';
          
          const [user, trip] = await Promise.all([
            isAnonymousUser ? null : userCollection.findOne({ _id: new ObjectId(booking.userId) }),
            tripCollection.findOne({ _id: new ObjectId(booking.tripId) })
          ]);
          
          return {
            ...booking,
            userDetails: user ? {
              name: user.name,
              email: user.email
            } : {
              name: 'Anonymous User',
              email: 'N/A'
            },
            tripDetails: trip ? {
              title: trip.title,
              location: trip.location,
              price: trip.price,
              duration: trip.endDate && trip.startDate ? 
                Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)) : null
            } : null
          };
        } catch (error) {
          console.error(`Error populating details for booking ${booking._id}:`, error);
          return booking; // Return booking without extra details on error
        }
      })
    );

    res.status(200).json({
      success: true,
      count: populatedBookings.length,
      data: populatedBookings
    });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

// Initialize eSewa payment
exports.initializeEsewaPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    console.log('Initialize eSewa payment request body:', req.body);
    
    if (!bookingId) {
      console.error('Missing bookingId in payment initialization');
      return res.status(400).json({ 
        success: false,
        message: 'Booking ID is required' 
      });
    }
    
    // Get database collection
    const bookingCollection = await openCollection('bookings');
    
    // Find booking
    const booking = await bookingCollection.findOne({ _id: new ObjectId(bookingId) });
    if (!booking) {
      console.error('Booking not found for ID:', bookingId);
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    // Generate unique transaction ID
    const txnId = 'TMS' + Date.now();
    console.log('Generated transaction ID:', txnId);
    
    // Prepare eSewa payment data
    const paymentData = {
      amt: booking.totalAmount,
      pdc: 0, // Product Delivery Charge
      psc: 0, // Service Charge
      txAmt: 0, // Tax Amount
      tAmt: booking.totalAmount, // Total Amount
      pid: txnId, // Product ID / Transaction ID
      scd: "EPAYTEST", // Merchant Code (Use your eSewa merchant code in production)
      su: `tourismapp://payment/success?pid=${txnId}&bookingId=${booking._id}`, // Success URL with custom schema
      fu: `tourismapp://payment/failure?pid=${txnId}&bookingId=${booking._id}` // Failure URL with custom schema
    };
    
    console.log('Generated payment data:', paymentData);
    
    // Update booking with transaction ID
    await bookingCollection.updateOne(
      { _id: new ObjectId(booking._id) },
      { $set: { 
        "transactionDetails.txnId": txnId,
        "updatedAt": new Date()
      }}
    );
    
    console.log('Updated booking with transaction ID:', txnId);
    
    // Return payment data for frontend to redirect to eSewa
    res.status(200).json({
      success: true,
      data: paymentData,
      message: 'Payment initialization successful'
    });
  } catch (error) {
    console.error('Error initializing eSewa payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

// Verify eSewa payment
exports.verifyEsewaPayment = async (req, res) => {
  try {
    console.log('Verify eSewa payment request body:', req.body);
    const { pid, bookingId, refId, amt } = req.body;
    
    if (!pid || !bookingId) {
      console.error('Missing required parameters:', { pid, bookingId });
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: pid and bookingId'
      });
    }
    
    // Get database collection
    const bookingCollection = await openCollection('bookings');
    
    // Find the booking
    const booking = await bookingCollection.findOne({ _id: new ObjectId(bookingId) });
    
    if (!booking) {
      console.error('Booking not found for:', bookingId);
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    // In a real app, we would verify with eSewa API
    // For now, we'll simulate a successful verification
    console.log('Simulating successful payment verification for:', pid);
    
    // Update booking status
    const updatedBooking = await bookingCollection.findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      { $set: { 
        paymentStatus: 'completed',
        paymentId: pid, // Use transaction ID if refId is not available
        "transactionDetails.paymentVerified": true,
        "updatedAt": new Date()
      }},
      { returnDocument: 'after' }
    );
    
    console.log('Updated booking with payment confirmation:', updatedBooking);
    
    res.status(200).json({
      success: true,
      data: updatedBooking.value || updatedBooking,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Error verifying eSewa payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body; // Get userId from request body
    
    // Get database collection
    const bookingCollection = await openCollection('bookings');
    
    // Find booking
    const booking = await bookingCollection.findOne({ _id: new ObjectId(bookingId) });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if user is authorized to cancel this booking (optional)
    if (userId && booking.userId !== "anonymous" && booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to cancel this booking' });
    }
    
    // Only allow cancellation of pending payments
    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ 
        message: 'Cannot cancel booking with completed payment. Please contact support for refund.' 
      });
    }
    
    // Update booking status
    await bookingCollection.updateOne(
      { _id: new ObjectId(booking._id) },
      { $set: { 
        paymentStatus: 'cancelled',
        "updatedAt": new Date()
      }}
    );
    
    // Get updated booking
    const updatedBooking = await bookingCollection.findOne({ _id: new ObjectId(booking._id) });
    
    res.status(200).json({
      success: true,
      data: updatedBooking,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

// Update eSewa booking status with transaction details
exports.updateEsewaBooking = async (req, res) => {
  try {
    console.log('Update eSewa booking request body:', req.body);
    const { bookingId, status, transactionCode, transactionId } = req.body;
    
    if (!bookingId) {
      console.error('Missing bookingId in booking update');
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }
    
    // Get database collection
    const bookingCollection = await openCollection('bookings');
    
    // Find booking
    const booking = await bookingCollection.findOne({ _id: new ObjectId(bookingId) });
    
    if (!booking) {
      console.error('Booking not found for ID:', bookingId);
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    // Update booking with transaction details
    const updateData = {
      "updatedAt": new Date()
    };
    
    if (status) updateData.paymentStatus = status.toLowerCase();
    if (transactionCode) updateData["transactionDetails"] = {
      paymentVerified: true,
      transactionCode: transactionCode
    };
    if (transactionId) updateData.paymentId = transactionId;
    
    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: updateData }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes made to booking'
      });
    }
    
    // Get updated booking
    const updatedBooking = await bookingCollection.findOne({ _id: new ObjectId(bookingId) });
    
    res.status(200).json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Error updating eSewa booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: error.message
    });
  }
};