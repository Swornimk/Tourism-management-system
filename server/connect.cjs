const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "./config.env" });

async function main() {
    const Db = process.env.ATLAS_URI;
    const client = new MongoClient(Db);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        // Corrected: Get collection reference (specify collection name)
        const collection = client.db("Tourism").collection("Login"); // REPLACE "your_collection_name"

        // Corrected: Query documents (example: find first 10 documents)
        const documents = await collection.find({}).limit(10).toArray();
        documents.forEach(doc => console.log(doc));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
        console.log("Connection closed");
    }
}

main().catch(console.error);