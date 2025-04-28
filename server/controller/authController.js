const { ObjectId } = require('mongodb');
const openCollection = require('../database/databaseConnection');
const { GenerateAccessToken, GenerateRefreshToken } = require('../helpers/authHelper');
const bcrypt = require('bcryptjs');

/**
 * Handle Google OAuth authentication
 * This controller will either login an existing user or register a new one based on Google profile
 */
async function handleGoogleAuth(req, res) {
  try {
    const userCollection = await openCollection("users");
    
    // Extract user info from request
    const { email, name, picture, googleId } = req.body;
    
    if (!email || !googleId) {
      return res.status(400).json({ error: "Email and Google ID are required" });
    }
    
    // Check if user already exists
    let existingUser = await userCollection.findOne({ email });
    
    if (existingUser) {
      // User exists, update their Google ID if not set and login
      if (!existingUser.googleId) {
        await userCollection.updateOne(
          { _id: existingUser._id },
          { $set: { googleId, picture: picture || existingUser.picture } }
        );
        
        console.log(`Updated existing user ${existingUser._id} with Google ID`);
      }
      
      // Check if user is active
      if (existingUser.isActive === false) {
        return res.status(403).json({ error: "Account has been deactivated. Please contact an administrator." });
      }
      
      // Generate tokens
      const accessToken = GenerateAccessToken(existingUser._id.toString());
      const refreshToken = GenerateRefreshToken(existingUser._id.toString());
      
      console.log(`Google OAuth login for existing user with ID: ${existingUser._id}`);
      
      // Return success response
      return res.json({
        id: existingUser._id,
        email: existingUser.email,
        isAdmin: existingUser.isAdmin || false,
        accessToken,
        refreshToken,
        message: "Login successful"
      });
    } else {
      // User doesn't exist, create a new account
      const newUser = {
        email,
        userName: name || email.split('@')[0],
        password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10), // Random secure password
        googleId,
        picture,
        isAdmin: false,
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const result = await userCollection.insertOne(newUser);
      const userId = result.insertedId;
      
      console.log(`Created new user via Google OAuth with ID: ${userId}`);
      
      // Generate tokens
      const accessToken = GenerateAccessToken(userId.toString());
      const refreshToken = GenerateRefreshToken(userId.toString());
      
      // Return success response
      return res.json({
        id: userId,
        email,
        isAdmin: false,
        accessToken,
        refreshToken,
        message: "Registration successful"
      });
    }
  } catch (error) {
    console.error("Google OAuth error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  handleGoogleAuth
}; 