const express = require("express");
const cors = require('cors');
const router = require("./router/router");
const openCollection = require("./database/databaseConnection");

const app = express();

// Parse incoming JSON data
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount the router to handle specific routes
app.use("/", router);

// Call openCollection with the desired collection name
const collectionName = "Tourism"; // Replace 'your_collection_name' with the actual collection name
openCollection(collectionName)
  .then(collection => {
    // Now you have the collection object, and you can perform operations on it
    // For example, you can query the collection
    collection.findOne({}).then(result => {
      console.log("Result from the database:", result);
    });
  })
  .catch(error => {
    console.error("Error:", error);
  });

app.listen(8000, () => {
  console.log("Server running on port 8000");
});