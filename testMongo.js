require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

async function testConnection() {
    try {
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ Successfully connected to MongoDB!");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
    }
}

testConnection();
