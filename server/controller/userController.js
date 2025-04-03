const openCollection = require("../database/databaseConnection");
const User = require("../models/userModel").User;
const UserLogin = require("../models/userModel").UserLogin;

const GenerateAccessToken =
  require("../helpers/authHelper").GenerateAccessToken;
const GenerateRefreshToken =
  require("../helpers/authHelper").GenerateRefreshToken;
const GetIdFromAccessToken =
  require("../helpers/authHelper").GetIdFromAccessToken;
const bcrypt = require("bcrypt");
const { promisify } = require("util");
const sleep = promisify(setTimeout);
const { ObjectId } = require("mongodb");
const objectInspect = require("object-inspect");
const path = require("path");
const fs = require("fs");
const IsAuthenticated = require("../helpers/authHelper").IsAuthenticated;

const posts = [
  {
    user: "kim",
    title: "dictator",
  },
  {
    user: "kong",
    title: "monkey",
  },
];

const saltRounds = 5; //rounds to hash the password

async function createUser(req, res) {
  try {
    const userCollection = await openCollection("users");

    // Create a new User object from the request body
    const user = new User(req.body.userName, req.body.email, req.body.date, req.body.password);

    // Check if the email already exists
    const existingUser = await userCollection.findOne({ email: user.email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    user.password = hashedPassword;
    
    // Add default profile picture and bio
    user.profilePicture = 'default-avatar.jpg';
    user.bio = 'Hello! I am a new traveller.';
    user.isAdmin = false;
    // Insert the new user into the database
    const result = await userCollection.insertOne(user);

    // Check if the insertion was successful
    if (result.acknowledged && result.insertedId) {
      return res.json({ message: "User created successfully" });
    } else {
      return res.json({ error: "Failed to create user" });
    }
  } catch (error) {
    console.error("Error creating user:", error);
    return res.json({ error: "Internal server error" });
  }
}

async function loginUser(req, res) {
  try {
    const userCollection = await openCollection("users");
    
    const user = new UserLogin(req.body.email, req.body.password);
    const existingUser = await userCollection.findOne({ email: user.email });
    if (!existingUser) {
      return res.json({ error: "User with this email does not exist" });
    }

    // Check if user is active
    if (existingUser.isActive === false) {
      return res.status(403).json({ error: "Account has been deactivated. Please contact an administrator." });
    }

    const isPasswordValid = await bcrypt.compare(
      user.password, 
      existingUser.password
    );
    if (!isPasswordValid) {
      return res.json({ error: "Invalid password" });
    }

    // Generate tokens
    const accessToken = GenerateAccessToken(existingUser._id.toString());
    const refreshToken = GenerateRefreshToken(existingUser._id.toString());
    
    console.log("User logged in with id: " + existingUser._id);
    
    // Return success response with tokens
    return res.json({
      id: existingUser._id,
      email: existingUser.email,
      isAdmin: existingUser.isAdmin || false,
      accessToken,
      refreshToken,
      message: "Login successful"
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getUserByAuth(req, res) {
  try {
    const userCollection = await openCollection("users");
    const accessTokenId = GetIdFromAccessToken(req);
    
    // Find user by ID
    const user = await userCollection.findOne({ _id: new ObjectId(accessTokenId) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has a profile picture, read and convert to base64
    let profileImageData = null;
    if (user.profilePicture) {
      try {
        const imagePath = path.join(__dirname, '..', 'uploads', user.profilePicture);
        console.log('Looking for image at:', imagePath);
        
        if (fs.existsSync(imagePath)) {
          console.log('Image file exists, reading...');
          const imageBuffer = fs.readFileSync(imagePath);
          profileImageData = imageBuffer.toString('base64');
          console.log('Successfully converted image to base64');
        } else {
          console.log('Image file not found at path:', imagePath);
        }
      } catch (error) {
        console.error('Error reading profile picture:', error);
      }
    }

    // Return user data with profile image
    const userData = {
      _id: user._id,
      userName: user.userName,
      email: user.email, 
      bio: user.bio || 'No bio added yet.',
      profilePicture: user.profilePicture,
      profileImageData: profileImageData
    };

    return res.status(200).json([userData]);

  } catch (error) {
    console.error('Error in getUserByAuth:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get all users (admin only)
async function getAllUsers(req, res) {
  try {
    // Check if the requesting user is an admin
    const userCollection = await openCollection("users");
    const accessTokenId = GetIdFromAccessToken(req);
    
    // Get the admin user
    const adminUser = await userCollection.findOne({ _id: new ObjectId(accessTokenId) });
    
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // Get all users
    const users = await userCollection.find().toArray();
    
    // Process users to include profile picture URLs
    const processedUsers = users.map(user => {
      // Create a proper profile picture URL if one exists
      if (user.profilePicture) {
        // Use correct URL structure that works with our router configuration
        user.profilePictureUrl = `${process.env.API_URL || 'http://10.0.2.2:8000'}/profile/picture?userId=${user._id}&token=${Date.now()}`;
      }
      
      // Don't send password to client
      delete user.password;
      
      return user;
    });
    
    return res.status(200).json(processedUsers);
  } catch (error) {
    console.error("Error getting all users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Update user status (activate/deactivate) - admin only
async function updateUserStatus(req, res) {
  try {
    const userCollection = await openCollection("users");
    const accessTokenId = GetIdFromAccessToken(req);
    
    // Get the admin user
    const adminUser = await userCollection.findOne({ _id: new ObjectId(accessTokenId) });
    
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const userId = req.params.id;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: "Invalid status value" });
    }
    
    // Don't allow admins to deactivate themselves
    if (userId === accessTokenId) {
      return res.status(400).json({ error: "Admins cannot deactivate themselves" });
    }
    
    // Update user status
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isActive: isActive, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.status(200).json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
    
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get user profile picture by user ID
async function getUserProfilePicture(req, res) {
  try {
    const userCollection = await openCollection("users");
    const userId = req.params.id;
    
    // Find the user
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user || !user.profilePicture) {
      return res.status(404).json({ error: "Profile picture not found" });
    }

    // Construct the path to the profile picture
    const picturePath = path.join(__dirname, "../uploads", user.profilePicture);
    
    // Check if the file exists
    if (!fs.existsSync(picturePath)) {
      console.error(`Profile picture file not found at ${picturePath}`);
      return res.status(404).json({ error: "Profile picture file not found" });
    }
    
    // Determine content type
    const contentType = user.profilePicture.endsWith('.png') ? 'image/png' : 
                        user.profilePicture.endsWith('.jpg') || user.profilePicture.endsWith('.jpeg') ? 'image/jpeg' : 
                        'application/octet-stream';
    
    // Set content type header
    res.set('Content-Type', contentType);
    
    // Send the file
    return res.sendFile(picturePath);
    
  } catch (error) {
    console.error("Error getting user profile picture:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function updateUser(req, res) {
  try {
    const userCollection = await openCollection("users");
    const accessTokenId = GetIdFromAccessToken(req);

    // Find the user first
    const user = await userCollection.findOne({
      _id: new ObjectId(accessTokenId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare update data
    const updateData = {};

    // Handle profile information updates
    if (req.body.userName) updateData.userName = req.body.userName;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.bio) updateData.bio = req.body.bio;

    // Handle profile picture update if file is uploaded
    if (req.file) {
      // Delete old profile picture if it exists and is not the default
      if (user.profilePicture && user.profilePicture !== 'default-avatar.jpg') {
        const oldPicturePath = path.join(__dirname, "../uploads", user.profilePicture);
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
      }
      updateData.profilePicture = req.file.filename;
    }

    // If no updates provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No update data provided" });
    }

    // Update the user document
    const result = await userCollection.updateOne(
      { _id: new ObjectId(accessTokenId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (result.modifiedCount > 0) {
      // If profile picture was updated, return the new picture URL
      if (updateData.profilePicture) {
        const picturePath = path.join(__dirname, "../uploads", updateData.profilePicture);
        if (fs.existsSync(picturePath)) {
          return res.json({
            message: "Profile updated successfully",
            profilePicture: updateData.profilePicture
          });
        }
      }
      return res.json({ message: "Profile updated successfully" });
    } else {
      return res.json({ message: "No changes made to the profile" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get user profile picture
async function getProfilePicture(req, res) {
  try {
    const userCollection = await openCollection("users");
    let userId;
    
    // Check if userId is provided in query (for admin usage)
    if (req.query.userId) {
      userId = req.query.userId;
    } else {
      // Otherwise use the authenticated user's ID
      userId = GetIdFromAccessToken(req);
    }

    console.log(`Getting profile picture for user ID: ${userId}`);
    
    const user = await userCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      console.log(`User not found for ID: ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.profilePicture) {
      console.log(`No profile picture found for user: ${userId}`);
      user.profilePicture = 'default-avatar.jpg';
    }

    const picturePath = path.join(__dirname, "../uploads", user.profilePicture);
    console.log(`Looking for profile picture at: ${picturePath}`);

    if (!fs.existsSync(picturePath)) {
      console.log(`Profile picture file not found at: ${picturePath}`);
      // Try to serve default avatar as fallback
      const defaultPath = path.join(__dirname, "../uploads", "default-avatar.jpg");
      if (fs.existsSync(defaultPath)) {
        console.log(`Serving default avatar image instead`);
        return res.sendFile(defaultPath);
      }
      return res.status(404).json({ message: "Profile picture not found" });
    }

    console.log(`Serving profile picture from: ${picturePath}`);
    // Set the appropriate content type for the response
    const contentType = picturePath.endsWith('.png') ? 'image/png' : 
                       picturePath.endsWith('.jpg') || picturePath.endsWith('.jpeg') ? 'image/jpeg' : 
                       'application/octet-stream';
    res.setHeader("Content-Type", contentType);
    
    // Stream the image file
    fs.createReadStream(picturePath).pipe(res);
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createUser,
  loginUser,
  getUserByAuth,
  updateUser,
  getProfilePicture,
  getAllUsers,
  updateUserStatus,
  getUserProfilePicture
};