const openCollection = require("../database/databaseConnection");
const Trip = require("../models/tripModel").Trip;
const { ObjectId } = require("mongodb");
const GetIdFromAccessToken = require("../helpers/authHelper").GetIdFromAccessToken;
const IsAuthenticated = require("../helpers/authHelper").IsAuthenticated;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Define API URL for building profile picture URL
const API_URL = 'http://10.0.2.2:8000';

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
        tripImagePath
      );

      // Insert the trip
      const result = await tripsCollection.insertOne(trip);

      if (result.acknowledged && result.insertedId) {
        return res.status(201).json({
          message: "Trip created successfully",
          tripId: result.insertedId,
          tripImageUrl: tripImageUrl
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

// Update trip status (for admin only)
async function updateTripStatus(req, res) {
  try {
    // Check if auth header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authentication token missing" });
    }

    try {
      // Verify token directly
      const tokenString = authHeader.split("Bearer ")[1];
      jwt.verify(tokenString, "secret-key"); // Using the same secret key
      
      // Get user ID from access token
      const userId = GetIdFromAccessToken(req);
      
      // Check if user is an admin
      const userCollection = await openCollection("users");
      const user = await userCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Handle both string and boolean values for isAdmin
      const isUserAdmin = 
        user.isAdmin === true || 
        user.isAdmin === "true" || 
        user.isAdmin === "True" ||
        user.isAdmin === 1;
      
      console.log("User:", user.userName);
      console.log("isAdmin value:", user.isAdmin);
      console.log("isAdmin type:", typeof user.isAdmin);
      console.log("isUserAdmin result:", isUserAdmin);
      
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }
  
      // Proceed with updating trip status
      const tripCollection = await openCollection("trips");
      const tripId = req.params.id;
      const { status } = req.body;
  
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
  
      const result = await tripCollection.updateOne(
        { _id: new ObjectId(tripId) },
        { 
          $set: { 
            status: status,
            updatedAt: new Date()
          } 
        }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Trip not found" });
      }
  
      if (result.modifiedCount > 0) {
        return res.json({ message: "Trip status updated successfully" });
      } else {
        return res.json({ message: "No changes made to the trip" });
      }
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Error updating trip status:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
}

module.exports = {
  createTrip,
  getUserTrips,
  getAllTrips,
  updateTripStatus,
  getTripImage
}; 