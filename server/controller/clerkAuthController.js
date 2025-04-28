const { ObjectId } = require('mongodb');
const openCollection = require('../database/databaseConnection');
const { GenerateAccessToken, GenerateRefreshToken } = require('../helpers/authHelper');
const bcrypt = require('bcryptjs');

/**
 * Get user by email for Clerk authentication
 */
async function getUserByEmail(req, res) {
  try {
    const userCollection = await openCollection("users");
    
    // Extract email from request
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Find user by email
    const user = await userCollection.find({ email }).toArray();
    
    if (!user || user.length === 0) {
      return res.json([]);
    }
    
    return res.json(user);
  } catch (error) {
    console.error("Error getting user by email:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Register a new user from Clerk authentication
 */
async function registerClerkUser(req, res) {
  try {
    const userCollection = await openCollection("users");
    
    // Extract user info from request
    const { email, name, picture } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Check if user already exists
    const existingUser = await userCollection.findOne({ email });
    
    if (existingUser) {
      // User exists, update their profile if needed
      if (picture && picture !== existingUser.picture) {
        await userCollection.updateOne(
          { _id: existingUser._id },
          { $set: { picture } }
        );
      }
      
      // Check if user is active
      if (existingUser.isActive === false) {
        return res.status(403).json({ error: "Account has been deactivated. Please contact an administrator." });
      }
      
      // Return the existing user
      return res.json({
        _id: existingUser._id,
        email: existingUser.email,
        userName: existingUser.userName,
        picture: picture || existingUser.picture,
        isAdmin: existingUser.isAdmin || false
      });
    } else {
      // User doesn't exist, create a new account
      const newUser = {
        email,
        userName: name || email.split('@')[0],
        password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10), // Random secure password
        picture,
        isAdmin: false,
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const result = await userCollection.insertOne(newUser);
      const userId = result.insertedId;
      
      console.log(`Created new user via Clerk with ID: ${userId}`);
      
      // Return the new user
      return res.json({
        _id: userId,
        email,
        userName: name || email.split('@')[0],
        picture,
        isAdmin: false
      });
    }
  } catch (error) {
    console.error("Clerk user registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Verify a Clerk JWT token
 */
async function verifyClerkToken(req, res) {
  try {
    // In a real implementation, you would verify the Clerk JWT token
    // For now, we'll just return success
    return res.json({ verified: true });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = {
  getUserByEmail,
  registerClerkUser,
  verifyClerkToken
}; 