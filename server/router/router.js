const express = require("express");
const router = express.Router();
const userController = require('../controller/userController');
const multer = require('multer');
const path = require('path');
const tripController = require("../controller/tripController");
const bookingController = require("../controller/bookingController");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// User routes
router.post("/register", userController.createUser);
router.post("/login", userController.loginUser);
router.get("/getuser", userController.getUserByAuth);
router.get("/profile/picture", userController.getProfilePicture);
router.put("/profile/update", upload.single('profilePicture'), userController.updateUser);

// Admin user management routes
router.get("/users", userController.getAllUsers);
router.put("/user/:id/status", userController.updateUserStatus);
router.get("/user/:id/picture", userController.getUserProfilePicture);

// Trip routes
router.post("/trips", tripController.createTrip);
router.get("/trips/user", tripController.getUserTrips);
router.get("/trips/all", tripController.getAllTrips);
router.get("/trips/image/:imageName", tripController.getTripImage);
router.patch("/trips/:id/status", tripController.updateTripStatus);

// Booking routes
router.post("/bookings", bookingController.createBooking);
router.get("/bookings/user", bookingController.getUserBookings);
router.get("/bookings/all", bookingController.getAllBookings);
router.delete("/bookings/:bookingId", bookingController.cancelBooking);

// Payment routes
router.post("/payments/esewa/initialize", bookingController.initializeEsewaPayment);
router.post("/payments/esewa/verify", bookingController.verifyEsewaPayment);
router.post("/payments/esewa/update-booking", bookingController.updateEsewaBooking);

module.exports = router;