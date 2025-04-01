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

async function login(req, res) {
  try {
    const userCollection = await openCollection("users");

    const user = new UserLogin(req.body.email, req.body.password);
    const existingUser = await userCollection.findOne({ email: user.email });
    if (!existingUser) {
      return res.json({ message: "User with this email does not exist" });
    }

    const isPasswordValid = await bcrypt.compare(
      user.password,
      existingUser.password
    );
    if (!isPasswordValid) {
      return res.json({ message: "Invalid password" });
    }
    console.log("existingUser._id:", existingUser._id);
    const accessToken = GenerateAccessToken(existingUser._id.toHexString());
    const refreshToken = GenerateRefreshToken(existingUser._id.toHexString());

    return res.json({
      message: "User logged in successfully",
      ID: existingUser._id,
      email: existingUser.email,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.json({ error: "Internal server error" });
  }
}


async function getUserByAuth(req, res) {
  try {
    const userCollection = await openCollection("users");
    const accessTokenId = GetIdFromAccessToken(req);
    
    // Fix: Use new ObjectId(hexString) instead of deprecated constructor
    const users = await userCollection
      .find({ _id: new ObjectId(accessTokenId) })
      .sort({ _id: -1 })
      .toArray();

    return res.json(users);
  } catch (error) {
    res.json("Internal server error");
  }
}

async function getAllUsers(req, res) {
  try {
    
    IsAuthenticated(req, res, async function (err) {//the function(err) is a callback function that checks if it worked properly or not
      if (err) {
        return res.status(401).json({ message: "Authentication failed" });
      }

      const userCollection = await openCollection("users");
      const users = await userCollection.find().sort({ _id: -1 }).toArray();

      return res.json(users);
    });
  } catch (error) {
    console.log("could not retrieve users");
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  posts,
  createUser,
  login,
  getUserByAuth,
  getAllUsers
};