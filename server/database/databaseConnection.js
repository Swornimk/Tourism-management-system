const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://swornimkc:Slayer@cluster0.mesfx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function databaseInstance() {
    try {
        const client = await MongoClient.connect(uri, { useUnifiedTopology: true });
        await client.db().command({ ping: 1 });

        console.log("Connected to MongoDB");

        return client;
    } catch (error) {
        console.error("Error connecting to MongoDB", error);
        throw error;
    }
}

const clientPromise = databaseInstance();

function openCollection(collectionName) {
    return clientPromise.then(client => client.db("tourism").collection(collectionName));
}

module.exports = openCollection;    