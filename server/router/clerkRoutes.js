const express = require('express');
const router = express.Router();
const clerkAuthController = require('../controller/clerkAuthController');

// Route to get user by email for Clerk authentication
router.post('/getuser', clerkAuthController.getUserByEmail);

// Route to register a new user from Clerk authentication
router.post('/register', clerkAuthController.registerClerkUser);

// Route to verify a Clerk JWT token
router.post('/verify', clerkAuthController.verifyClerkToken);

module.exports = router; 