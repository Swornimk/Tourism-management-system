const openCollection = require("../database/databaseConnection");
const Trip = require("../models/tripModel").Trip;
const { ObjectId } = require("mongodb");
const GetIdFromAccessToken = require("../helpers/authHelper").GetIdFromAccessToken;
const IsAuthenticated = require("../helpers/authHelper").IsAuthenticated;

// Define API URL for building profile picture URL
const API_URL = 'http://10.0.2.2:8000';

// Create a new trip
async function createTrip(req, res) {
  try {
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
    const trip = new Trip(
      tripData.title,
      tripData.location,
      tripData.description,
      tripData.price,
      tripData.startDate,
      tripData.endDate,
      accessTokenId,
      user.userName,
      profilePictureUrl
    );

    // Insert the trip
    const result = await tripsCollection.insertOne(trip);

    if (result.acknowledged && result.insertedId) {
      return res.status(201).json({
        message: "Trip created successfully",
        tripId: result.insertedId
      });
    } else {
      return res.status(400).json({ error: "Failed to create trip" });
    }
  } catch (error) {
    console.error("Error creating trip:", error);
    return res.status(500).json({ error: "Internal server error" });
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
      return trip;
    });

    return res.status(200).json(processedTrips);
  } catch (error) {
    console.error("Error fetching all trips:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Update trip status (for admin)
async function updateTripStatus(req, res) {
  try {
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
  } catch (error) {
    console.error("Error updating trip status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createTrip,
  getUserTrips,
  getAllTrips,
  updateTripStatus
}; 