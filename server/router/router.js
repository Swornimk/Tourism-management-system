const express = require("express");
const router = express.Router();
const userController = require('../controller/userController');
const multer = require('multer');
const path = require('path');
const tripController = require("../controller/tripController");

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
router.put("/trips/:id/status", tripController.updateTripStatus);

module.exports = router;