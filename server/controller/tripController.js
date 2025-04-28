const openCollection = require("../database/databaseConnection");
const Trip = require("../models/tripModel").Trip;
const { ObjectId } = require("mongodb");
const GetIdFromAccessToken = require("../helpers/authHelper").GetIdFromAccessToken;
const IsAuthenticated = require("../helpers/authHelper").IsAuthenticated;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const notificationUtils = require('../utils/notifications');

// Define API URL for building profile picture URL
const API_URL = 'https://tourism-management-system-wdu4.onrender.com';

// Configure multer for trip image storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tripImagesDir = path.join(__dirname, '../uploads/trips');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(tripImagesDir)) {
      fs.mkdirSync(tripImagesDir, { recursive: true });
    }
    
    cb(null, tripImagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'trip-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware for single trip image upload
const uploadTripImage = upload.single('tripImage');

// Create a new trip
async function createTrip(req, res) {
  try {
    // Handle file upload
    uploadTripImage(req, res, async function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      const userCollection = await openCollection("users");
      const tripsCollection = await openCollection("trips");
      const accessTokenId = GetIdFromAccessToken(req);

      // Find user to get their details
      const user = await userCollection.findOne({ _id: new ObjectId(accessTokenId) });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Set profile picture URL
      let profilePictureUrl = null;
      if (user.profilePicture) {
        profilePictureUrl = `${API_URL}/profile/picture?token=${Date.now()}`;
      }

      // Create trip object
      const tripData = req.body;
      
      // Setup trip image data
      let tripImageUrl = null;
      let tripImagePath = null;
      
      if (req.file) {
        tripImagePath = req.file.path;
        tripImageUrl = `${API_URL}/trips/image/${path.basename(req.file.path)}`;
      }

      // Check if admin status is set
      const isUserAdmin = 
        user.isAdmin === true || 
        user.isAdmin === "true" || 
        user.isAdmin === "True" ||
        user.isAdmin === 1;

      // Check if a status was provided in the request
      let tripStatus = tripData.status || 'pending';
      
      // If the status is set to 'approved' but user is not admin, reset to 'pending'
      if (tripStatus === 'approved' && !isUserAdmin) {
        console.log('Non-admin tried to create an approved trip. Setting to pending.');
        tripStatus = 'pending';
      }

      const trip = new Trip(
        tripData.title,
        tripData.location,
        tripData.description,
        tripData.price,
        tripData.startDate,
        tripData.endDate,
        accessTokenId,
        user.userName,
        profilePictureUrl,
        tripImageUrl,
        tripImagePath,
        tripStatus // Pass the determined status to the Trip constructor
      );

      // Insert the trip
      const result = await tripsCollection.insertOne(trip);

      if (result.acknowledged && result.insertedId) {
        // Fetch the complete trip with _id to return
        const createdTrip = await tripsCollection.findOne({ _id: result.insertedId });
        
        return res.status(201).json({
          message: "Trip created successfully",
          tripId: result.insertedId,
          tripImageUrl: tripImageUrl,
          trip: createdTrip // Return the complete trip data
        });
      } else {
        // If insertion failed, delete uploaded image if exists
        if (tripImagePath && fs.existsSync(tripImagePath)) {
          fs.unlinkSync(tripImagePath);
        }
        return res.status(400).json({ error: "Failed to create trip" });
      }
    });
  } catch (error) {
    console.error("Error creating trip:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Serve trip image
async function getTripImage(req, res) {
  try {
    const imageName = req.params.imageName;
    const imagePath = path.join(__dirname, '../uploads/trips', imageName);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error serving trip image:", error);
    return res.status(500).json({ error: "Failed to retrieve image" });
  }
}

// Get all trips for a specific user
async function getUserTrips(req, res) {
  try {
    const tripCollection = await openCollection("trips");
    const accessTokenId = GetIdFromAccessToken(req);

    // Find trips for the user
    const trips = await tripCollection.find({ userId: accessTokenId }).toArray();
    
    // Process trips to ensure profile picture URLs are correct
    const processedTrips = trips.map(trip => {
      // Ensure there's a profile picture URL with cache-busting
      if (trip.userProfilePicture && !trip.userProfilePicture.includes('?token=')) {
        trip.userProfilePicture = `${API_URL}/profile/picture?token=${Date.now()}`;
      }
      
      // Add cache-busting token to trip image URL if exists
      if (trip.tripImageUrl && !trip.tripImageUrl.includes('?token=')) {
        trip.tripImageUrl = `${trip.tripImageUrl}?token=${Date.now()}`;
      }
      
      return trip;
    });

    return res.status(200).json(processedTrips);
  } catch (error) {
    console.error("Error fetching user trips:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get all trips (admin)
async function getAllTrips(req, res) {
  try {
    const tripCollection = await openCollection("trips");
    
    // Fetch all trips
    const trips = await tripCollection.find().toArray();
    
    // Process trips to ensure profile picture URLs are correct
    const processedTrips = trips.map(trip => {
      // Ensure there's a profile picture URL with cache-busting
      if (trip.userProfilePicture && !trip.userProfilePicture.includes('?token=')) {
        trip.userProfilePicture = `${API_URL}/profile/picture?token=${Date.now()}`;
      }
      
      // Add cache-busting token to trip image URL if exists
      if (trip.tripImageUrl && !trip.tripImageUrl.includes('?token=')) {
        trip.tripImageUrl = `${trip.tripImageUrl}?token=${Date.now()}`;
      }
      
      return trip;
    });

    return res.status(200).json(processedTrips);
  } catch (error) {
    console.error("Error fetching all trips:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Update trip status
const updateTripStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      creatorUserId: requestedCreatorId, 
      updaterIsAdmin, 
      updaterUserId, 
      notifyCreator = true,
      shouldSendAdminNotification = true,
      tripTitle
    } = req.body;
    
    console.log(`Processing trip status update: id=${id}, status=${status}, shouldSendAdminNotification=${shouldSendAdminNotification}`);
    
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const db = req.app.locals.db;
    
    // Check if trip exists
    const trip = await db.collection("trips").findOne({ _id: new ObjectId(id) });
    
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    console.log(`Found trip: ${trip.title}, current status: ${trip.status}`);
    
    // Get the ID of the trip creator for later notification
    const creatorUserId = trip.userId;
    console.log(`Trip creator userId: ${creatorUserId}`);
    
    // Update the trip status
    const result = await db.collection("trips").updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
          status, 
          updatedAt: new Date(),
          statusUpdateInfo: {
            updatedAt: new Date(),
            updaterUserId: updaterUserId || req.userId,
            updaterIsAdmin: updaterIsAdmin || false,
            previousStatus: trip.status
          }
        } 
      }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update trip status" });
    }
    
    console.log(`Trip status updated successfully to ${status}`);
    
    // Get the updated trip with latest data
    const updatedTrip = await db.collection("trips").findOne({ _id: new ObjectId(id) });
    
    // Get the Socket.IO instance
    const io = req.app.get('io');
    
    // Create a common notification payload to ensure consistency
    const notificationPayload = {
      tripId: id,
      status: status,
      updatedAt: updatedTrip.updatedAt,
      title: updatedTrip.title,
      location: updatedTrip.location,
      price: updatedTrip.price,
      tripImageUrl: updatedTrip.tripImageUrl,
      creatorUserId: creatorUserId,
      description: updatedTrip.description?.substring(0, 100),
      shouldSendAdminNotification: shouldSendAdminNotification
    };
    
    // ===== USER NOTIFICATIONS =====
    
    // 1. Emit to the specific trip room
    io.to(`trip:${id}`).emit('tripStatusUpdated', notificationPayload);
    
    // 2. Only send notifications to the creator if notifyCreator is true
    if (notifyCreator) {
      // Emit directly to the user's personal room for profile updates
      io.to(`user:${creatorUserId}`).emit('tripStatusUpdated', notificationPayload);
      
      // Also send a specific profile-update event to force profile refresh
      io.to(`user:${creatorUserId}`).emit('profileUpdate', {
        type: 'tripStatusChanged',
        tripId: id,
        newStatus: status,
        timestamp: new Date().toISOString()
      });
    }
    
    // 3. For approved trips, emit to all connected clients in the approvals channel
    if (status === 'approved') {
      console.log(`Emitting global tripApproved event for trip ${id}`);
      io.to('trip:approvals').emit('tripApproved', notificationPayload);
    }
    
    // 4. For rejected trips, emit a similar event
    if (status === 'rejected') {
      console.log(`Emitting global tripRejected event for trip ${id}`);
      io.to('trip:approvals').emit('tripRejected', notificationPayload);
    }
    
    // 5. Emit to admin notification room only if shouldSendAdminNotification is true
    if (shouldSendAdminNotification) {
      io.to('admin:notifications').emit('adminTripStatusChanged', {
        ...notificationPayload,
        adminAction: req.adminId === creatorUserId ? 'self' : 'other',
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`Skipping admin notifications for trip ${id} due to shouldSendAdminNotification=false`);
    }
    
    // 6. Emit trip status update as a global event that will be caught by all connected clients
    io.emit('globalTripStatusUpdate', {
      tripId: id,
      status: status,
      tripTitle: updatedTrip.title,
      updatedAt: new Date().toISOString(),
      shouldSendAdminNotification: shouldSendAdminNotification
    });
    
    console.log(`Emitted WebSocket updates for trip ${id} status change to ${status}`);
    
    // ===== NOTIFICATIONS =====
    
    // Send in-app notifications to relevant parties
    if (status === 'approved' || status === 'rejected') {
      try {
        // Only send notifications to the creator if notifyCreator is true
        if (notifyCreator) {
          const notificationTitle = status === 'approved' ? 'Trip Approved!' : 'Trip Status Update';
          const notificationBody = status === 'approved' 
            ? `Your trip "${updatedTrip.title}" has been approved.`
            : `Your trip "${updatedTrip.title}" has been rejected.`;
          
          console.log(`Sending notification to trip creator: ${creatorUserId}`);
          
          // Get the user document
          const creatorUser = await db.collection("users").findOne({ _id: new ObjectId(creatorUserId) });
          
          if (!creatorUser) {
            console.log(`Creator user ${creatorUserId} not found, cannot send notification`);
          } else {
            console.log(`Found creator user: ${creatorUser.userName}`);
            
            // 1. Send in-app notification to the trip owner
            const notificationResult = await notificationUtils.sendNotificationToUser(
              req,
              creatorUserId,
              {
                title: notificationTitle,
                body: notificationBody,
                data: { 
                  type: status === 'approved' ? 'trip_approval' : 'trip_rejection',
                  tripId: id,
                  tripTitle: updatedTrip.title,
                  status: status,
                  notificationId: `trip-${id}-${status}-${Date.now()}`
                }
              }
            );
            
            console.log(`Notification to creator ${creatorUserId} ${notificationResult ? 'sent successfully' : 'failed'}`);
          }
        }
        
        // 3. Notify admins about the status change only if shouldSendAdminNotification is true
        if (shouldSendAdminNotification) {
          const adminNotificationTitle = `Trip ${status === 'approved' ? 'Approved' : 'Rejected'}`;
          const adminNotificationBody = `Trip "${updatedTrip.title}" has been ${status}`;
          
          await notificationUtils.sendNotificationToAdmin(
            req,
            {
              title: adminNotificationTitle,
              body: adminNotificationBody,
              data: {
                type: 'admin_trip_status_change',
                tripId: id,
                tripTitle: updatedTrip.title,
                status: status,
                shouldSendAdminNotification: shouldSendAdminNotification
              }
            }
          );
        } else {
          console.log(`Skipping admin notifications for trip ${id} due to shouldSendAdminNotification=false`);
        }
      } catch (notificationError) {
        // Log the error but don't stop the response
        console.error('Error sending notifications:', notificationError);
      }
    }
    
    return res.status(200).json({ 
      message: `Trip ${status} successfully`,
      trip: updatedTrip,
      notificationInfo: {
        notifyCreator: notifyCreator,
        shouldSendAdminNotification: shouldSendAdminNotification
      }
    });
  } catch (error) {
    console.error("Error updating trip status:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  createTrip,
  getUserTrips,
  getAllTrips,
  updateTripStatus,
  getTripImage
}; 