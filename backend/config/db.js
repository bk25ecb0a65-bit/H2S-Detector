import mongoose from "mongoose";

export async function connectDB() {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/h2s_detector";
        const conn = await mongoose.connect(uri);
        console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
    } catch (err) {
        console.error("[MongoDB] Connection error:", err.message);
        process.exit(1);
    }
}
